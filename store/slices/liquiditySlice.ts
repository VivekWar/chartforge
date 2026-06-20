import { type StateCreator } from 'zustand';
import { type RootState } from '@/store/types';

export type MarketBias = 'Bullish' | 'Bearish' | 'Neutral';
export type ZoneStatus = 'Detected' | 'Triggered' | 'Tapped' | 'Partially Filled' | 'Completed' | 'Invalidated' | 'Inverted';
export type Direction = 'bullish' | 'bearish' | 'neutral';

export interface LiquiditySetup {
    id: string;
    direction: Direction;
    confidence: number;
    components: string[];
    status: ZoneStatus;
    targetPrice?: number;
    entryPrice?: number;
    invalidationPrice?: number;
}

export interface DashboardMetrics {
    bias: MarketBias;
    topSetup: LiquiditySetup | null;
    activeTargets: { id: string, type: string, price: number, distance: number }[];
    zoneSummary: {
        detected: number;
        triggered: number;
        tapped: number;
        partiallyFilled: number;
        completed: number;
        invalidated: number;
    };
}

export interface LiquiditySettings {
    showFVG: boolean;
    showWickBlocks: boolean;
    showIcebergBlocks: boolean;
    showBombFireBlocks: boolean;
    showMagneticBlocks: boolean;
    showLiquiditySweeps: boolean;
    showInstitutionalZones: boolean;
}

export interface LiquiditySlice {
    liquiditySettings: LiquiditySettings;
    dashboardMetrics: DashboardMetrics;
    toggleLiquiditySetting: (key: keyof LiquiditySettings) => void;
    setDashboardMetrics: (metrics: DashboardMetrics) => void;
}

export const createLiquiditySlice: StateCreator<
    RootState,
    [['zustand/immer', never]],
    [],
    LiquiditySlice
> = (set) => ({
    liquiditySettings: {
        showFVG: true,
        showWickBlocks: true,
        showIcebergBlocks: true,
        showBombFireBlocks: true,
        showMagneticBlocks: true,
        showLiquiditySweeps: true,
        showInstitutionalZones: true,
    },
    dashboardMetrics: {
        bias: 'Neutral',
        topSetup: null,
        activeTargets: [],
        zoneSummary: { detected: 0, triggered: 0, tapped: 0, partiallyFilled: 0, completed: 0, invalidated: 0 },
    },
    toggleLiquiditySetting: (key) => {
        set((draft) => {
            draft.liquiditySettings[key] = !draft.liquiditySettings[key];
        });
    },
    setDashboardMetrics: (metrics) => {
        set((draft) => {
            draft.dashboardMetrics = metrics;
        });
    },
});
