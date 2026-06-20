import { ISeriesPrimitive, IPrimitivePaneRenderer } from 'lightweight-charts';
import { TradeSetup } from '@/store/slices/liquiditySlice';

class TradeSetupPrimitiveRenderer implements IPrimitivePaneRenderer {
    private _setup: TradeSetup;
    private _series: any;
    private _timeScale: any;

    constructor(setup: TradeSetup, series: any, timeScale: any) {
        this._setup = setup;
        this._series = series;
        this._timeScale = timeScale;
    }

    draw(target: any) {
        target.useBitmapCoordinateSpace((scope: any) => {
            const ctx = scope.context;
            const timeScale = this._timeScale;
            const series = this._series;
            
            const startX = timeScale.timeToCoordinate(this._setup.entryTime);
            if (startX === null || startX === undefined) return;
            const actualStartX = startX * scope.horizontalPixelRatio;
            
            // For now, let's span it across the visible area if it's active
            const endX = scope.mediaSize.width * scope.horizontalPixelRatio;
            const width = endX - actualStartX;

            const entryY = series.priceToCoordinate(this._setup.entryPrice);
            const slY = series.priceToCoordinate(this._setup.stopLoss);
            const tpY = series.priceToCoordinate(this._setup.takeProfit);

            if (entryY === null || slY === null || tpY === null) return;

            const actualEntryY = entryY * scope.verticalPixelRatio;
            const actualSlY = slY * scope.verticalPixelRatio;
            const actualTpY = tpY * scope.verticalPixelRatio;

            // Draw Stop Loss Box (Red)
            const slHeight = actualSlY - actualEntryY;
            ctx.fillStyle = 'rgba(239, 68, 68, 0.2)'; // Red 500
            ctx.fillRect(actualStartX, actualEntryY, width, slHeight);
            
            // Draw Take Profit Box (Green)
            const tpHeight = actualTpY - actualEntryY;
            ctx.fillStyle = 'rgba(34, 197, 94, 0.2)'; // Green 500
            ctx.fillRect(actualStartX, actualEntryY, width, tpHeight);

            // Draw Entry Line (Dashed)
            ctx.beginPath();
            ctx.setLineDash([5 * scope.horizontalPixelRatio, 5 * scope.horizontalPixelRatio]);
            ctx.moveTo(actualStartX, actualEntryY);
            ctx.lineTo(endX, actualEntryY);
            ctx.strokeStyle = '#fff';
            ctx.lineWidth = 1 * scope.horizontalPixelRatio;
            ctx.stroke();
            ctx.setLineDash([]); // Reset dash

            // Draw R/R Text
            const textY = actualEntryY - (10 * scope.verticalPixelRatio);
            ctx.font = `${Math.round(12 * scope.horizontalPixelRatio)}px Inter, sans-serif`;
            ctx.fillStyle = '#fff';
            ctx.textAlign = 'left';
            ctx.fillText(`R/R: ${this._setup.riskRewardRatio.toFixed(2)} | ${this._setup.status}`, actualStartX + 10, textY);
        });
    }

    zOrder() {
        return 'normal';
    }
}

class TradeSetupPrimitiveView {
    private _renderer: TradeSetupPrimitiveRenderer;

    constructor(setup: TradeSetup, series: any, timeScale: any) {
        this._renderer = new TradeSetupPrimitiveRenderer(setup, series, timeScale);
    }

    renderer() {
        return this._renderer;
    }
}

export class TradeSetupPrimitive implements ISeriesPrimitive {
    private _setup: TradeSetup;
    private _series: any;
    private _timeScale: any;

    constructor(setup: TradeSetup) {
        this._setup = setup;
    }

    attached({ chart, series, requestUpdate }: any) {
        this._series = series;
        this._timeScale = chart.timeScale();
        requestUpdate();
    }

    detached() {
        this._series = null;
        this._timeScale = null;
    }

    updateAllViews() {}

    paneViews() {
        if (!this._series || !this._timeScale) return [];
        return [new TradeSetupPrimitiveView(this._setup, this._series, this._timeScale)];
    }
    
    update(setup: TradeSetup) {
        this._setup = setup;
    }
}
