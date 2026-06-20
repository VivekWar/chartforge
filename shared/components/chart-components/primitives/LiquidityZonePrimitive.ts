import { CanvasRenderingTarget2D } from 'fancy-canvas';
import {
    IChartApi,
    ISeriesApi,
    ISeriesPrimitive,
    IPrimitivePaneRenderer,
    IPrimitivePaneView,
    SeriesAttachedParameter,
    SeriesOptionsMap,
    Time,
} from 'lightweight-charts';
import { LiquidityZone } from '../../hooks/useLiquidityEngine';

class LiquidityPaneRenderer implements IPrimitivePaneRenderer {
    private _zones: LiquidityZone[];
    private _series: ISeriesApi<keyof SeriesOptionsMap>;
    private _chart: IChartApi;

    constructor(zones: LiquidityZone[], series: ISeriesApi<keyof SeriesOptionsMap>, chart: IChartApi) {
        this._zones = zones;
        this._series = series;
        this._chart = chart;
    }

    draw(target: CanvasRenderingTarget2D) {
        target.useBitmapCoordinateSpace((scope) => {
            const ctx = scope.context;
            const timeScale = this._chart.timeScale();

            for (const zone of this._zones) {
                const startX = timeScale.timeToCoordinate(zone.startTime);
                if (startX === null || startX === undefined) continue;

                // Fixed width for active zones
                const endX = zone.status === 'Completed' || zone.status === 'Invalidated'
                    ? timeScale.timeToCoordinate(zone.endTime) // just use endTime for drawing width if dead
                    : startX + 150; 

                const topY = this._series.priceToCoordinate(zone.topPrice);
                const bottomY = this._series.priceToCoordinate(zone.bottomPrice);

                if (topY === null || bottomY === null) continue;

                const actualStartX = startX * scope.horizontalPixelRatio;
                const actualEndX = (endX ?? timeScale.width()) * scope.horizontalPixelRatio;
                const actualTopY = Math.min(topY, bottomY) * scope.verticalPixelRatio;
                const actualBottomY = Math.max(topY, bottomY) * scope.verticalPixelRatio;

                const width = actualEndX - actualStartX;
                const height = actualBottomY - actualTopY;

                if (width <= 0 || height <= 0) continue;

                // Determine base color by Zone Type
                let baseR = 100, baseG = 100, baseB = 100;
                
                if (zone.type === 'InstitutionalZone') {
                    baseR = 255; baseG = 215; baseB = 0; // Gold
                } else if (zone.type === 'WickBlock') {
                    baseR = 155; baseG = 89; baseB = 182; // Purple
                } else if (zone.type === 'IcebergBlock') {
                    baseR = 52; baseG = 152; baseB = 219; // Blue
                } else if (zone.type === 'MagneticBlock') {
                    baseR = 230; baseG = 126; baseB = 34; // Orange
                } else {
                    // Standard FVG colors
                    let isBull = zone.direction === 'bullish';
                    if (zone.status === 'Inverted') isBull = !isBull; // Flip polarity color for IFVG
                    if (isBull) { baseR = 8; baseG = 153; baseB = 129; }
                    else { baseR = 242; baseG = 54; baseB = 69; }
                }

                // Opacity based on Zone Status Lifecycle
                let alpha = 0.6;
                if (zone.status === 'Invalidated') alpha = 0.1; // Ghosted
                else if (zone.status === 'Partially Filled') alpha = 0.3;
                else if (zone.status === 'Tapped') alpha = 0.45;
                else if (zone.status === 'Inverted') alpha = 0.6; // High opacity for flipped zone

                ctx.fillStyle = `rgba(${baseR}, ${baseG}, ${baseB}, ${alpha})`;
                ctx.fillRect(actualStartX, actualTopY, width, height);

                // Draw Text Label
                if (zone.status !== 'Completed') {
                    const typeLabel = zone.status === 'Inverted' ? `I${zone.type}` : zone.type;
                    const labelText = `[${Math.round(zone.score)}] ${typeLabel} | ${zone.status}`;
                    ctx.font = `${Math.round(11 * scope.horizontalPixelRatio)}px Inter, sans-serif`;
                    // If invalidated, make text red to show failure
                    ctx.fillStyle = zone.status === 'Invalidated' ? 'rgba(255, 0, 0, 0.8)' : `rgba(${baseR}, ${baseG}, ${baseB}, 1)`;
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

class LiquidityPaneView implements IPrimitivePaneView {
    private _zones: LiquidityZone[];
    private _series: ISeriesApi<keyof SeriesOptionsMap>;
    private _chart: IChartApi;

    constructor(zones: LiquidityZone[], series: ISeriesApi<keyof SeriesOptionsMap>, chart: IChartApi) {
        this._zones = zones;
        this._series = series;
        this._chart = chart;
    }

    update() {}

    renderer(): IPrimitivePaneRenderer {
        return new LiquidityPaneRenderer(this._zones, this._series, this._chart);
    }
}

export class LiquidityZonePrimitive implements ISeriesPrimitive<Time> {
    private _chart: IChartApi | undefined;
    private _series: ISeriesApi<keyof SeriesOptionsMap> | undefined;
    private _paneViews: LiquidityPaneView[] = [];
    private _requestUpdate?: () => void;
    private _zones: LiquidityZone[] = [];

    constructor() {}

    attached({ chart, series, requestUpdate }: SeriesAttachedParameter<Time>): void {
        this._chart = chart;
        this._series = series;
        this._requestUpdate = requestUpdate;
        if (this._chart && this._series) {
            this._paneViews = [new LiquidityPaneView(this._zones, this._series, this._chart)];
        }
        this.requestUpdate();
    }

    detached(): void {
        this._chart = undefined;
        this._series = undefined;
        this._requestUpdate = undefined;
    }

    public updateZones(zones: LiquidityZone[]) {
        this._zones = zones;
        if (this._series && this._chart) {
            this._paneViews = [new LiquidityPaneView(this._zones, this._series, this._chart)];
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
