import {
    CandlestickSeries,
    SeriesApiRef,
} from '@shismomin/lightweight-charts-react-components';
import {
    CandlestickData,
    CandlestickStyleOptions,
    DeepPartial,
    SeriesOptionsCommon,
    Time,
    ISeriesPrimitive,
} from 'lightweight-charts';
import {
    CrosshairListener,
    PaneLegend,
} from '@shismomin/lwc-plugin-pracplugin';
import { useEffect, useRef } from 'react';

interface Props {
    data: CandlestickData<Time>[];
    options?:
        | DeepPartial<CandlestickStyleOptions & SeriesOptionsCommon>
        | undefined;
    legendApi: PaneLegend;
    primitives?: ISeriesPrimitive<Time>[];
}

export default function CustomCandlestickSeries({
    data,
    options,
    legendApi,
    primitives,
}: Props) {
    const candleSeriesRef = useRef<SeriesApiRef<'Candlestick'> | null>(null);
    useEffect(
        function () {
            const id = setTimeout(function () {
                if (!candleSeriesRef.current) return;
                legendApi?.addLegendItem({
                    id: 'open',
                    label: 'O',
                    value: '∅',
                    textColor: 'blue',
                });
                legendApi?.addLegendItem({
                    id: 'high',
                    label: 'H',
                    value: '∅',
                    textColor: 'blue',
                });
                legendApi?.addLegendItem({
                    id: 'low',
                    label: 'L',
                    value: '∅',
                    textColor: 'blue',
                });
                legendApi?.addLegendItem({
                    id: 'close',
                    label: 'C',
                    value: '∅',
                    textColor: 'blue',
                });
                legendApi?.addLegendItem({
                    id: 'percentage',
                    label: '',
                    value: '∅',
                    textColor: 'blue',
                });
                const candleSeries = candleSeriesRef.current.api();
                const legend = legendApi;
                const crosshairListener = new CrosshairListener(legend, [
                    {
                        id: 'open',
                        label: 'O',
                        value: '∅',
                    },
                    {
                        id: 'high',
                        label: 'H',
                        value: '∅',
                    },
                    {
                        id: 'low',
                        label: 'L',
                        value: '∅',
                    },
                    {
                        id: 'close',
                        label: 'C',
                        value: '∅',
                    },
                    {
                        id: 'percentage',
                        label: '',
                        value: '∅',
                    },
                ]);
                candleSeries?.attachPrimitive(crosshairListener);
                
                // Attach custom primitives
                if (primitives && candleSeries) {
                    primitives.forEach((p) => {
                        try {
                            candleSeries.attachPrimitive(p);
                        } catch (e) {
                            // Primitive might already be attached
                        }
                    });
                }

            }, 150);
            return () => {
                clearTimeout(id);
                // Detach primitives on unmount
                if (candleSeriesRef.current) {
                    const candleSeries = candleSeriesRef.current.api();
                    if (candleSeries && primitives) {
                        primitives.forEach((p) => {
                            try {
                                candleSeries.detachPrimitive(p);
                            } catch (e) {}
                        });
                    }
                }
            };
        },
        [legendApi, primitives],
    );
    return (
        <CandlestickSeries
            ref={candleSeriesRef}
            data={data}
            options={options}
        />
    );
}
