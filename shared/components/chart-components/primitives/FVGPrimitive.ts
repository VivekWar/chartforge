import { CanvasRenderingTarget2D } from 'fancy-canvas';
import {
    DataChangedScope,
    IChartApi,
    ISeriesApi,
    ISeriesPrimitive,
    IPrimitivePaneRenderer,
    IPrimitivePaneView,
    SeriesAttachedParameter,
    SeriesOptionsMap,
    Time,
} from 'lightweight-charts';
import { FVGZone } from '../../hooks/useFVGDetector';

class FVGPaneRenderer implements IPrimitivePaneRenderer {
    private _zones: FVGZone[];
    private _series: ISeriesApi<keyof SeriesOptionsMap>;
    private _chart: IChartApi;

    constructor(zones: FVGZone[], series: ISeriesApi<keyof SeriesOptionsMap>, chart: IChartApi) {
        this._zones = zones;
        this._series = series;
        this._chart = chart;
    }

    draw(target: CanvasRenderingTarget2D) {
        target.useBitmapCoordinateSpace((scope) => {
            const ctx = scope.context;
            const timeScale = this._chart.timeScale();
            
            // FVG configurations
            const bullishColor = 'rgba(8, 153, 129, 0.6)'; // Increased opacity
            const bearishColor = 'rgba(242, 54, 69, 0.6)'; // Increased opacity
            const mitigatedOpacityMultiplier = 0.3;

            for (const zone of this._zones) {
                // Determine X coordinates
                const startX = timeScale.timeToCoordinate(zone.startTime);
                
                if (startX === null || startX === undefined) continue;

                // For small width, extend exactly 150 pixels from start if unmitigated
                const endX = zone.isMitigated && zone.mitigatedTime
                    ? timeScale.timeToCoordinate(zone.mitigatedTime)
                    : startX + 150; 

                // Determine Y coordinates
                const topY = this._series.priceToCoordinate(zone.topPrice);
                const bottomY = this._series.priceToCoordinate(zone.bottomPrice);

                if (topY === null || bottomY === null) continue;

                const actualStartX = startX * scope.horizontalPixelRatio;
                const actualEndX = (endX ?? timeScale.width()) * scope.horizontalPixelRatio;
                
                // Ensure proper top/bottom ordering for canvas drawing
                const actualTopY = Math.min(topY, bottomY) * scope.verticalPixelRatio;
                const actualBottomY = Math.max(topY, bottomY) * scope.verticalPixelRatio;

                const width = actualEndX - actualStartX;
                const height = actualBottomY - actualTopY;

                if (width <= 0 || height <= 0) continue;

                // Set color
                let color = zone.type === 'bullish' ? bullishColor : bearishColor;
                if (zone.isMitigated) {
                    ctx.fillStyle = zone.type === 'bullish' 
                        ? `rgba(8, 153, 129, ${0.6 * mitigatedOpacityMultiplier})` 
                        : `rgba(242, 54, 69, ${0.6 * mitigatedOpacityMultiplier})`;
                } else {
                    ctx.fillStyle = color;
                }

                ctx.fillRect(actualStartX, actualTopY, width, height);

                // Draw Text Label
                if (!zone.isMitigated) {
                    const statusText = zone.mitigationStatus === 'Partially Filled' ? 'Partial' : 'Active';
                    const labelText = `[${Math.round(zone.score)}] ${zone.timeframe || ''} ${statusText}`;
                    ctx.font = `${Math.round(12 * scope.horizontalPixelRatio)}px Inter, sans-serif`;
                    ctx.fillStyle = zone.type === 'bullish' ? 'rgba(8, 153, 129, 1)' : 'rgba(242, 54, 69, 1)';
                    ctx.textAlign = 'left';
                    ctx.textBaseline = 'middle';
                    
                    const textX = actualStartX + (4 * scope.horizontalPixelRatio);
                    const textY = actualTopY + height / 2;
                    ctx.fillText(labelText, textX, textY);
                }
            }
        });
    }
}

class FVGPaneView implements IPrimitivePaneView {
    private _zones: FVGZone[];
    private _series: ISeriesApi<keyof SeriesOptionsMap>;
    private _chart: IChartApi;

    constructor(zones: FVGZone[], series: ISeriesApi<keyof SeriesOptionsMap>, chart: IChartApi) {
        this._zones = zones;
        this._series = series;
        this._chart = chart;
    }

    update() {}

    renderer(): IPrimitivePaneRenderer {
        return new FVGPaneRenderer(this._zones, this._series, this._chart);
    }
}

export class FVGPrimitive implements ISeriesPrimitive<Time> {
    private _chart: IChartApi | undefined;
    private _series: ISeriesApi<keyof SeriesOptionsMap> | undefined;
    private _paneViews: FVGPaneView[] = [];
    private _requestUpdate?: () => void;
    private _zones: FVGZone[] = [];

    constructor() {}

    attached({
        chart,
        series,
        requestUpdate,
    }: SeriesAttachedParameter<Time>): void {
        this._chart = chart;
        this._series = series;
        this._requestUpdate = requestUpdate;
        
        if (this._chart && this._series) {
            this._paneViews = [new FVGPaneView(this._zones, this._series, this._chart)];
        }
        this.requestUpdate();
    }

    detached(): void {
        this._chart = undefined;
        this._series = undefined;
        this._requestUpdate = undefined;
    }

    public updateZones(zones: FVGZone[]) {
        this._zones = zones;
        if (this._series && this._chart) {
            this._paneViews = [new FVGPaneView(this._zones, this._series, this._chart)];
            this.requestUpdate();
        }
    }

    protected requestUpdate(): void {
        if (this._requestUpdate) {
            this._requestUpdate();
        }
    }

    paneViews(): readonly IPrimitivePaneView[] {
        return this._paneViews;
    }
}
