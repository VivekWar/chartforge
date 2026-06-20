import { useChartDataEngine } from '@/shared/providers/chart-data-engine-provider';
import { selectChartDataByChartId } from '@/store/selectors/chartDataSelectors';
import { useStore } from '@/store/store';
import {
    CandlestickData,
    LogicalRangeChangeEventHandler,
    Time,
} from 'lightweight-charts';
import {
    PriceScale,
    TimeScale,
    TimeScaleApiRef,
    WatermarkText,
} from '@shismomin/lightweight-charts-react-components';
import { debounce } from 'lodash';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { PaneLegend } from '@shismomin/lwc-plugin-pracplugin';
import CustomCandlestickSeries from '../../../shared/components/chart-components/series/CustomCandlestickSeries';
import SamePaneIndicator from '../../indicators/SamePaneIndicator';
import CustomPane from '@/shared/components/chart-components/panes/CustomPane';
import { useLiquidityEngine } from '@/shared/components/hooks/useLiquidityEngine';
import { LiquidityZonePrimitive } from '@/shared/components/chart-components/primitives/LiquidityZonePrimitive';
import { useEnigmaTrader } from '@/shared/components/hooks/useEnigmaTrader';
import { TradeSetupPrimitive } from '@/shared/components/chart-components/primitives/TradeSetupPrimitive';
import { OTEBackgroundPrimitive } from '@/shared/components/chart-components/primitives/OTEBackgroundPrimitive';
import { TimeFrameType } from '@/shared/types/common';
import LiquidityPanel from '@/features/liquidity/components/LiquidityPanel';

type Props = {
    indicatorIds: string[];
    stretchFactor: number;
};

const EMPTY_CANDLES: CandlestickData[] = [];

export default function MainChart({ indicatorIds, stretchFactor }: Props) {
    const { chartId, fetchMoreData } = useChartDataEngine();
    const timeScaleRef = useRef<TimeScaleApiRef>(null);
    const chartData = useStore(selectChartDataByChartId(chartId));
    const candles = chartData.candles ?? EMPTY_CANDLES;
    const macroCandles = chartData.macroCandles ?? EMPTY_CANDLES;
    const prevLoadingRef = useRef(chartData.prevLoading);
    const [legendApi, setLegendApi] = useState<PaneLegend>(new PaneLegend());
    
    // Liquidity Engine Integration
    const timeframe = chartData.timeframe;
    const liquiditySettings = useStore((state) => state.liquiditySettings);
    
    const getMacroTimeframe = (tf: TimeFrameType): TimeFrameType => {
        if (tf === '1m') return '15m';
        if (tf === '5m') return '1h';
        if (tf === '15m') return '4h';
        if (tf === '1h' || tf === '4h') return '1d';
        return '1w';
    };
    const macroTimeframe = getMacroTimeframe(timeframe);

    // Macro Engine (Targets)
    const macroSettings = useMemo(() => ({
        ...liquiditySettings,
        showWickBlocks: false, showIcebergBlocks: false, showBombFireBlocks: false, showInstitutionalZones: false,
        showFVG: true, showMagneticBlocks: true
    }), [liquiditySettings]);
    const macroZones = useLiquidityEngine(macroCandles, macroTimeframe, macroSettings);

    // Micro Engine (Entries)
    const microSettings = useMemo(() => ({
        ...liquiditySettings,
        showFVG: false, showMagneticBlocks: false,
    }), [liquiditySettings]);
    const microZones = useLiquidityEngine(candles, timeframe, microSettings);

    // Virtual Trader
    const metrics = useStore(state => state.dashboardMetrics);
    const activeSetup = useStore(state => state.activeTradeSetup);
    const currentCandle = candles.length > 0 ? candles[candles.length - 1] : null;
    useEnigmaTrader(microZones, macroZones, currentCandle, metrics.bias);

    // Timestamp Mapping for Macro targets to Micro X-axis
    const mappedMacroZones = useMemo(() => {
        return macroZones.map(zone => {
            let closestTime = zone.startTime;
            const targetTime = Number(zone.startTime);
            const match = candles.find(c => Number(c.time) >= targetTime);
            if (match) closestTime = match.time as Time;
            return { ...zone, startTime: closestTime };
        });
    }, [macroZones, candles]);

    const combinedZones = useMemo(() => [...microZones, ...mappedMacroZones], [microZones, mappedMacroZones]);

    const otePrimitiveRef = useRef<OTEBackgroundPrimitive>(new OTEBackgroundPrimitive());
    const liquidityPrimitiveRef = useRef<LiquidityZonePrimitive>(new LiquidityZonePrimitive());
    const tradeSetupPrimitiveRef = useRef<TradeSetupPrimitive | null>(null);

    // Initialize trade setup primitive if missing and setup exists
    if (!tradeSetupPrimitiveRef.current && activeSetup) {
        tradeSetupPrimitiveRef.current = new TradeSetupPrimitive(activeSetup);
    }

    const [primitives, setPrimitives] = useState<any[]>([otePrimitiveRef.current, liquidityPrimitiveRef.current]);

    useEffect(() => {
        if (activeSetup) {
            if (!tradeSetupPrimitiveRef.current) tradeSetupPrimitiveRef.current = new TradeSetupPrimitive(activeSetup);
            else tradeSetupPrimitiveRef.current.update(activeSetup);
            
            if (!primitives.includes(tradeSetupPrimitiveRef.current)) {
                setPrimitives([otePrimitiveRef.current, liquidityPrimitiveRef.current, tradeSetupPrimitiveRef.current]);
            }
        } else if (!activeSetup && tradeSetupPrimitiveRef.current && primitives.includes(tradeSetupPrimitiveRef.current)) {
            setPrimitives([otePrimitiveRef.current, liquidityPrimitiveRef.current]);
        }
    }, [activeSetup, primitives]);

    useEffect(() => {
        liquidityPrimitiveRef.current.updateZones(combinedZones);
    }, [combinedZones]);

    useEffect(() => {
        // Calculate macro high/low for OTE background
        if (candles.length > 50) {
            const limit = 500;
            const recent = candles.slice(Math.max(0, candles.length - limit));
            let maxH = -Infinity;
            let minL = Infinity;
            for (const c of recent) {
                if (c.high > maxH) maxH = c.high;
                if (c.low < minL) minL = c.low;
            }
            otePrimitiveRef.current.updateBounds(maxH, minL);
        }
    }, [candles]);

    useEffect(
        function () {
            prevLoadingRef.current = chartData.prevLoading;
        },
        [chartData.prevLoading],
    );

    const chartCandles: CandlestickData[] = useMemo(
        () =>
            candles.map((c) => ({
                time: c.time as Time,
                open: c.open,
                high: c.high,
                low: c.low,
                close: c.close,
            })),
        [candles],
    );

    const debouncedFetchMore = useMemo(
        () =>
            debounce(() => {
                fetchMoreData();
            }, 150),
        [fetchMoreData],
    );
    const onVisibleLogicalRangeChange: LogicalRangeChangeEventHandler =
        useCallback(
            (r) => {
                if (prevLoadingRef.current || !r) return;
                if (r.from < 5) {
                    debouncedFetchMore();
                }
            },
            [debouncedFetchMore],
        );

    return (
        <CustomPane legendApi={legendApi} stretchFactor={stretchFactor}>
            <LiquidityPanel />
            <CustomCandlestickSeries
                data={chartCandles}
                options={{
                    priceLineVisible: false,
                }}
                legendApi={legendApi}
                primitives={primitives}
            />
            {indicatorIds.length > 0 && (
                <SamePaneIndicator
                    indicatorIds={indicatorIds}
                    legendApi={legendApi}
                />
            )}
            <TimeScale
                ref={timeScaleRef}
                onVisibleLogicalRangeChange={onVisibleLogicalRangeChange}
            />
            <PriceScale
                id="right"
                options={{
                    scaleMargins: {
                        top: 0.3,
                        bottom: 0.2,
                    },
                }}
            />
            <WatermarkText
                visible={chartData.prevLoading}
                lines={[
                    {
                        text: 'Loading more data...',
                        color: `#20f710`,
                        fontSize: 20,
                    },
                ]}
            />
        </CustomPane>
    );
}
