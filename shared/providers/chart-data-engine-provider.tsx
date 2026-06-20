'use client';
import {
    createContext,
    ReactNode,
    useCallback,
    useContext,
    useEffect,
    useRef,
} from 'react';
import { AppConfig } from '@/app-config';
import { useStore } from '@/store/store';
import { selectChartDataByChartId } from '@/store/selectors/chartDataSelectors';
import { selectChartIndicatorByChartId } from '@/store/selectors/indicatorsDataSelectors';
import { useBinanceSocket } from './binance-socket-provider';
import { BinanceKlineEvent } from '@/lib/binance/BinanceSocket';
import {
    fetchAggCandlestickData,
    fetchCandlestickData,
} from '@/lib/binance/marketData';
import type { CandlestickDataResponse, CandleType, TimeFrameType } from '../types/common';
type ChartEngineContextValue = {
    fetchMoreData: () => void;
    chartId: string;
};
const ChartDataEngineContext = createContext<ChartEngineContextValue | null>(
    null,
);
type Props = {
    children: ReactNode;
    chartId: string;
};

function formatKline(
    event: BinanceKlineEvent,
    convertSecond = true,
): CandleType | null {
    if (event.k.n <= 0) return null;
    if (convertSecond) {
        return {
            time: Math.floor(event.k.t / 1000),
            open: Number(event.k.o),
            high: Number(event.k.h),
            low: Number(event.k.l),
            close: Number(event.k.c),
            volume: Number(event.k.v),
        };
    }
    return {
        time: Math.floor(event.k.t),
        open: Number(event.k.o),
        high: Number(event.k.h),
        low: Number(event.k.l),
        close: Number(event.k.c),
        volume: Number(event.k.v),
    };
}

export default function ChartDataEngineProvider({ children, chartId }: Props) {
    const {
        setInitLoadingByChartId,
        setPrevLoadingByChartId,
        setInitCandlesByChartId,
        setInitMacroCandlesByChartId,
        setTempCandlesByChartId,
        setCacheCandlesByChartId,
        updateHistoryByChartId,
        updateMacroHistoryByChartId,
        setIndicatorByChartAndIndicatorId,
        updateIndicatorHistoryByChartAndIndicatorId,
        updateLiveIndicatorByChartAndIndicatorId,
        updateLiveCandleByChartId,
        updateLiveMacroCandleByChartId,
        updateLiveTempCandlesByChartId,
    } = useStore();

    // Helper for MTF
    const getMacroTimeframe = (tf: string): TimeFrameType => {
        if (tf === '1m') return '15m';
        if (tf === '5m') return '1h';
        if (tf === '15m') return '4h';
        if (tf === '1h' || tf === '4h') return '1d';
        return '1w';
    };
    const chartData = useStore(selectChartDataByChartId(chartId));
    const chartIndicators = useStore(selectChartIndicatorByChartId(chartId));
    const { socket } = useBinanceSocket();
    const { symbol, timeframe, firstHistoryTime } = chartData;
    const firstHistoryRef = useRef<number | null>(firstHistoryTime);
    const symbolRef = useRef(symbol);
    const timeframeRef = useRef(timeframe);
    const chartIndicatorsRef = useRef(chartIndicators);
    useEffect(() => {
        firstHistoryRef.current = firstHistoryTime;
    }, [firstHistoryTime]);

    useEffect(() => {
        symbolRef.current = symbol;
    }, [symbol]);
    useEffect(() => {
        timeframeRef.current = timeframe;
    }, [timeframe]);
    useEffect(() => {
        chartIndicatorsRef.current = chartIndicators;
    }, [chartIndicators]);
    const setAllIndicators = useCallback(
        function (cacheCandles: CandleType[], candles: CandleType[]) {
            const allindicators = chartIndicatorsRef.current;
            Object.values(allindicators).forEach((value) => {
                setIndicatorByChartAndIndicatorId(
                    chartId,
                    value.registry,
                    cacheCandles,
                    candles,
                );
            });
        },
        [chartId, setIndicatorByChartAndIndicatorId],
    );
    const updateAllIndicatorsHistory = useCallback(
        function (cacheCandles: CandleType[], candles: CandleType[]) {
            const allindicators = chartIndicatorsRef.current;
            Object.values(allindicators).forEach((value) => {
                updateIndicatorHistoryByChartAndIndicatorId(
                    chartId,
                    value.registry,
                    cacheCandles,
                    candles,
                );
            });
        },
        [chartId, updateIndicatorHistoryByChartAndIndicatorId],
    );
    const updateAllIndicatorsInLive = useCallback(
        function (candle: CandleType) {
            const allindicators = chartIndicatorsRef.current;
            Object.values(allindicators).forEach((value) => {
                updateLiveIndicatorByChartAndIndicatorId(
                    chartId,
                    value.registry,
                    candle,
                );
            });
        },
        [chartId, updateLiveIndicatorByChartAndIndicatorId],
    );
    useEffect(
        function () {
            const controller = new AbortController();
            async function loadData() {
                try {
                    if (!symbolRef.current || !timeframeRef.current) return;
                    setInitLoadingByChartId(chartId, true);
                    let data: CandlestickDataResponse | null = null;
                    let macroData: CandlestickDataResponse | null = null;
                    const macroTf = getMacroTimeframe(timeframeRef.current);

                    if (!AppConfig.isAggInterval(timeframeRef.current)) {
                        [data, macroData] = await Promise.all([
                            fetchCandlestickData({ symbol: symbolRef.current, interval: timeframeRef.current }),
                            fetchCandlestickData({ symbol: symbolRef.current, interval: macroTf })
                        ]);
                    } else {
                        // For simplicity, macro data for agg intervals just uses base fetch
                        [data, macroData] = await Promise.all([
                            fetchAggCandlestickData({ symbol: symbolRef.current, interval: timeframeRef.current }),
                            fetchCandlestickData({ symbol: symbolRef.current, interval: macroTf })
                        ]);
                    }
                    if (!data) return;
                    setAllIndicators(data.cacheData, data.finalData);
                    setInitCandlesByChartId(chartId, data.finalData);
                    if (macroData) setInitMacroCandlesByChartId(chartId, macroData.finalData);
                    setTempCandlesByChartId(chartId, data.tempData);
                    setCacheCandlesByChartId(chartId, data.cacheData);
                } catch (error) {
                    if (error instanceof Error && error.name !== 'AbortError') {
                        console.error(error);
                    }
                } finally {
                    setInitLoadingByChartId(chartId, false);
                }
            }
            loadData();
            return () => controller.abort();
        },
        [
            chartId,
            symbol,
            timeframe,
            setInitLoadingByChartId,
            setInitCandlesByChartId,
            setCacheCandlesByChartId,
            setTempCandlesByChartId,
            setAllIndicators,
        ],
    );

    const onBinanceKline = useCallback(
        function (event: BinanceKlineEvent) {
            if (event.s === symbol) {
                if (event.k.i === timeframe) {
                    const data = formatKline(event);
                    if (!data) return;
                    updateAllIndicatorsInLive(data);
                    updateLiveCandleByChartId(chartId, data);
                } else if (event.k.i === getMacroTimeframe(timeframe)) {
                    const data = formatKline(event);
                    if (!data) return;
                    updateLiveMacroCandleByChartId(chartId, data);
                }
            }
        },
        [
            chartId,
            updateLiveCandleByChartId,
            updateLiveMacroCandleByChartId,
            updateAllIndicatorsInLive,
            symbol,
            timeframe,
        ],
    );
    const onAggKline = useCallback(
        function (event: BinanceKlineEvent) {
            let sourceInterval = null;
            if (AppConfig.isAggInterval(timeframe)) {
                sourceInterval = AppConfig.getSourceInterval(timeframe);
            }
            if (event.s === symbol && event.k.i === sourceInterval) {
                const data = formatKline(event, false);

                if (!data) return;
                const aggData = updateLiveTempCandlesByChartId(
                    chartId,
                    timeframe,
                    data,
                );
                console.log(aggData);
                if (aggData) {
                    updateAllIndicatorsInLive(aggData);
                    updateLiveCandleByChartId(chartId, aggData);
                }
            }
        },
        [
            chartId,
            updateLiveTempCandlesByChartId,
            updateLiveCandleByChartId,
            updateAllIndicatorsInLive,
            symbol,
            timeframe,
        ],
    );
    useEffect(
        function () {
            if (!socket) return;
            let sourceInterval = null;
            let isAgg = false;
            if (AppConfig.isAggInterval(timeframe)) {
                isAgg = true;
                sourceInterval = AppConfig.getSourceInterval(timeframe);
            } else {
                sourceInterval = timeframe;
            }
            if (!sourceInterval) return;
            
            const macroInterval = getMacroTimeframe(timeframe);

            socket.subscribeKline(symbol, sourceInterval);
            socket.subscribeKline(symbol, macroInterval); // Subscribe to macro
            
            socket.addKlineHandler(isAgg ? onAggKline : onBinanceKline);
            return () => {
                socket.removeKlineHandler(isAgg ? onAggKline : onBinanceKline);
                socket.unsubscribeKline(symbol, sourceInterval);
                socket.unsubscribeKline(symbol, macroInterval);
            };
        },
        [socket, symbol, timeframe, onBinanceKline, onAggKline],
    );
    const fetchMoreData = useCallback(
        async function () {
            try {
                if (
                    !firstHistoryRef.current ||
                    !symbolRef.current ||
                    !timeframeRef.current
                )
                    return;
                setPrevLoadingByChartId(chartId, true);
                let data: CandlestickDataResponse | null = null;
                let macroData: CandlestickDataResponse | null = null;
                const macroTf = getMacroTimeframe(timeframeRef.current);

                if (!AppConfig.isAggInterval(timeframeRef.current)) {
                    [data, macroData] = await Promise.all([
                        fetchCandlestickData({
                            symbol: symbolRef.current,
                            interval: timeframeRef.current,
                            endTime: firstHistoryRef.current,
                        }),
                        fetchCandlestickData({
                            symbol: symbolRef.current,
                            interval: macroTf,
                            endTime: firstHistoryRef.current, // Approximate alignment
                        })
                    ]);
                } else {
                    [data, macroData] = await Promise.all([
                        fetchAggCandlestickData({
                            symbol: symbolRef.current,
                            interval: timeframeRef.current,
                            endTime: firstHistoryRef.current,
                        }),
                        fetchCandlestickData({
                            symbol: symbolRef.current,
                            interval: macroTf,
                            endTime: firstHistoryRef.current,
                        })
                    ]);
                }
                if (!data) return;
                updateAllIndicatorsHistory(data.cacheData, data.finalData);
                updateHistoryByChartId(chartId, data.finalData);
                if (macroData) updateMacroHistoryByChartId(chartId, macroData.finalData);
                setCacheCandlesByChartId(chartId, data.cacheData);
            } catch (error) {
                if (error instanceof Error) {
                    console.log(error.message);
                }
            } finally {
                setPrevLoadingByChartId(chartId, false);
            }
        },
        [
            chartId,
            setPrevLoadingByChartId,
            updateHistoryByChartId,
            setCacheCandlesByChartId,
            updateAllIndicatorsHistory,
        ],
    );

    return (
        <ChartDataEngineContext.Provider
            value={{
                chartId,
                fetchMoreData,
            }}
        >
            {children}
        </ChartDataEngineContext.Provider>
    );
}

function useChartDataEngine() {
    const context = useContext(ChartDataEngineContext);
    if (!context)
        throw new Error(
            'ChartDataEngine context was used outside of ChartDataEngineProveder',
        );
    return context;
}

export { ChartDataEngineProvider, useChartDataEngine };
