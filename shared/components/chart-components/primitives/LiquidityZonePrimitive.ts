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
                // If Detected (Unmitigated), extend infinitely to the right
                const endX = (zone.status === 'Detected') 
                    ? null
                    : timeScale.timeToCoordinate(zone.endTime);

                const topY = this._series.priceToCoordinate(zone.topPrice);
                const bottomY = this._series.priceToCoordinate(zone.bottomPrice);

                if (topY === null || bottomY === null) continue;

                const actualStartX = startX * scope.horizontalPixelRatio;
                // If endX is null, extend to the canvas width
                const actualEndX = (endX !== null) ? (endX * scope.horizontalPixelRatio) : (ctx.canvas.clientWidth * scope.horizontalPixelRatio);
                const actualTopY = Math.min(topY, bottomY) * scope.verticalPixelRatio;
                const actualBottomY = Math.max(topY, bottomY) * scope.verticalPixelRatio;

                const width = actualEndX - actualStartX;
                const height = actualBottomY - actualTopY;

                if (width <= 0 || height <= 0) continue;

                // Determine strict color by Direction
                let baseR, baseG, baseB;
                let isBull = zone.direction === 'bullish';
                if (zone.status === 'Inverted') isBull = !isBull; // Flip polarity color for IFVG

                if (isBull) {
                    baseR = 34; baseG = 197; baseB = 94; // rgba(34, 197, 94, ...)
                } else {
                    baseR = 239; baseG = 68; baseB = 68; // rgba(239, 68, 68, ...)
                }

                // Opacity based on Zone Status Lifecycle
                let alpha = 0.2; // Base for detected
                if (zone.status === 'Invalidated') alpha = 0.05; // Ghosted
                else if (zone.status === 'Partially Filled') alpha = 0.1;
                else if (zone.status === 'Tapped') alpha = 0.15;
                else if (zone.status === 'Inverted') alpha = 0.3; // High opacity for flipped zone

                // Fill Background
                if (zone.type === 'LiquiditySweep') {
                    // Draw Sweep Icon instead of fillRect
                    ctx.font = `${Math.round(14 * scope.horizontalPixelRatio)}px sans-serif`;
                    ctx.textAlign = 'center';
                    ctx.textBaseline = 'middle';
                    const iconY = zone.direction === 'bullish' ? actualBottomY : actualTopY;
                    const iconX = actualStartX + (4 * scope.horizontalPixelRatio);
                    ctx.fillText(zone.direction === 'bullish' ? '💧' : '❌', iconX, iconY);
                    continue; // Skip the rest of the drawing for sweeps
                }

                if (zone.status === 'Completed' || zone.status === 'Invalidated') {
                    // Ghosting UX
                    ctx.fillStyle = 'rgba(156, 163, 175, 0.05)';
                    ctx.fillRect(actualStartX, actualTopY, width, height);
                    ctx.strokeStyle = 'rgba(156, 163, 175, 0.3)';
                    ctx.lineWidth = 1 * scope.horizontalPixelRatio;
                    ctx.setLineDash([2, 4]);
                    ctx.strokeRect(actualStartX, actualTopY, width, height);
                    ctx.setLineDash([]);
                } else if (zone.isInverted) {
                    // Flipped Polarity UX
                    ctx.fillStyle = `rgba(${baseR}, ${baseG}, ${baseB}, 0.1)`;
                    ctx.fillRect(actualStartX, actualTopY, width, height);
                    ctx.strokeStyle = `rgba(${baseR}, ${baseG}, ${baseB}, 0.8)`;
                    ctx.lineWidth = 1 * scope.horizontalPixelRatio;
                    ctx.setLineDash([2, 2]);
                    ctx.strokeRect(actualStartX, actualTopY, width, height);
                    ctx.setLineDash([]);
                } else {
                    ctx.fillStyle = `rgba(${baseR}, ${baseG}, ${baseB}, ${alpha})`;
                    ctx.fillRect(actualStartX, actualTopY, width, height);
                    ctx.strokeStyle = `rgba(${baseR}, ${baseG}, ${baseB}, 1)`;
                    ctx.lineWidth = 1 * scope.horizontalPixelRatio;
                    ctx.strokeRect(actualStartX, actualTopY, width, height);
                }

                // Draw Text Label
                if (zone.status !== 'Completed') {
                    let typeLabel: string = zone.type;
                    if (zone.type === 'MagneticBlock') typeLabel = '🧲 MB';
                    else if (zone.type === 'BombFireBlock') typeLabel = '💣🔥 BFB';
                    else if (zone.type === 'IcebergBlock') typeLabel = '🧊 IB';
                    else if (zone.type === 'WickBlock') typeLabel = '👁️ WB';
                    
                    if (zone.isInverted) typeLabel = `I-${typeLabel}`;
                    
                    const labelText = `[${Math.round(zone.score)}] ${typeLabel} | ${zone.status}`;
                    ctx.font = `bold ${Math.round(11 * scope.horizontalPixelRatio)}px "Trebuchet MS", Arial, sans-serif`;
                    
                    // Dark theme contrast: white text
                    ctx.fillStyle = zone.status === 'Invalidated' ? 'rgba(255, 255, 255, 0.3)' : 'rgba(255, 255, 255, 0.8)';
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
