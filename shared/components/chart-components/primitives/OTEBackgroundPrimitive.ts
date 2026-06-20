import { CanvasRenderingTarget2D } from 'fancy-canvas';
import {
    IChartApi,
    ISeriesApi,
    ISeriesPrimitive,
    IPrimitivePaneRenderer,
    IPrimitivePaneView,
    SeriesAttachedParameter,
    SeriesOptionsMap,
} from 'lightweight-charts';

class OTERenderer implements IPrimitivePaneRenderer {
    private _series: ISeriesApi<keyof SeriesOptionsMap>;
    private _macroHigh: number;
    private _macroLow: number;

    constructor(series: ISeriesApi<keyof SeriesOptionsMap>, macroHigh: number, macroLow: number) {
        this._series = series;
        this._macroHigh = macroHigh;
        this._macroLow = macroLow;
    }

    draw(target: CanvasRenderingTarget2D) {
        target.useBitmapCoordinateSpace((scope) => {
            const ctx = scope.context;
            
            const highY = this._series.priceToCoordinate(this._macroHigh);
            const lowY = this._series.priceToCoordinate(this._macroLow);

            if (highY === null || lowY === null) return;

            const actualHighY = highY * scope.verticalPixelRatio;
            const actualLowY = lowY * scope.verticalPixelRatio;
            const height = actualLowY - actualHighY; // low is lower on screen so Y is higher
            
            if (height <= 0) return;

            const width = ctx.canvas.clientWidth * scope.horizontalPixelRatio;

            // Fib levels
            const range = this._macroHigh - this._macroLow;
            const eqY = this._series.priceToCoordinate(this._macroLow + (range * 0.5))! * scope.verticalPixelRatio;
            const fib62Y = this._series.priceToCoordinate(this._macroLow + (range * 0.62))! * scope.verticalPixelRatio;
            const fib705Y = this._series.priceToCoordinate(this._macroLow + (range * 0.705))! * scope.verticalPixelRatio;
            const fib79Y = this._series.priceToCoordinate(this._macroLow + (range * 0.79))! * scope.verticalPixelRatio;

            // 1. Draw Golden Zone Shade (0.62 to 0.79)
            ctx.fillStyle = 'rgba(234, 179, 8, 0.05)';
            // Math.abs and min to handle bullish vs bearish properly, but let's assume standard fib pulling from low to high.
            // Wait, OTE works for both directions. Let's just draw the standard OTE assuming bottom-up.
            // The OTE zone is between 0.62 and 0.79.
            ctx.fillRect(0, Math.min(fib62Y, fib79Y), width, Math.abs(fib79Y - fib62Y));

            // 2. Draw Fib Lines
            ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
            ctx.lineWidth = 1 * scope.horizontalPixelRatio;
            
            ctx.beginPath();
            // Eq
            ctx.moveTo(0, eqY); ctx.lineTo(width, eqY);
            // 0.62
            ctx.moveTo(0, fib62Y); ctx.lineTo(width, fib62Y);
            // 0.705
            ctx.moveTo(0, fib705Y); ctx.lineTo(width, fib705Y);
            // 0.79
            ctx.moveTo(0, fib79Y); ctx.lineTo(width, fib79Y);
            ctx.stroke();

            // Labels
            ctx.font = `${Math.round(10 * scope.horizontalPixelRatio)}px Arial`;
            ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
            ctx.textAlign = 'right';
            ctx.fillText('0.5 Eq', width - 10, eqY - 2);
            ctx.fillText('0.62', width - 10, fib62Y - 2);
            ctx.fillText('0.705 OTE', width - 10, fib705Y - 2);
            ctx.fillText('0.79', width - 10, fib79Y - 2);
        });
    }

    zOrder() {
        return 'bottom'; // Draw behind candles
    }
}

class OTEView implements IPrimitivePaneView {
    private _renderer: OTERenderer;

    constructor(series: ISeriesApi<keyof SeriesOptionsMap>, macroHigh: number, macroLow: number) {
        this._renderer = new OTERenderer(series, macroHigh, macroLow);
    }

    update() {}

    renderer(): IPrimitivePaneRenderer {
        return this._renderer;
    }
}

export class OTEBackgroundPrimitive implements ISeriesPrimitive {
    private _series: ISeriesApi<keyof SeriesOptionsMap> | undefined;
    private _macroHigh: number = 0;
    private _macroLow: number = 0;
    private _requestUpdate?: () => void;

    constructor() {}

    attached({ series, requestUpdate }: SeriesAttachedParameter): void {
        this._series = series;
        this._requestUpdate = requestUpdate;
        this.requestUpdate();
    }

    detached(): void {
        this._series = undefined;
        this._requestUpdate = undefined;
    }

    updateBounds(macroHigh: number, macroLow: number) {
        this._macroHigh = macroHigh;
        this._macroLow = macroLow;
        this.requestUpdate();
    }

    protected requestUpdate(): void {
        if (this._requestUpdate) {
            this._requestUpdate();
        }
    }

    updateAllViews() {}

    paneViews(): readonly IPrimitivePaneView[] {
        if (!this._series || this._macroHigh === 0 || this._macroLow === 0) return [];
        return [new OTEView(this._series, this._macroHigh, this._macroLow)];
    }
}
