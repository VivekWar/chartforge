import { ChartLayoutSlice } from '@/store/slices/chartLayoutSlice';
import { ChartsDataSlice } from '@/store/slices/chartDataSlice';
import { IndicatorSlice } from '@/store/slices/indicatorSlice';
import { PaneSlice } from '@/store/slices/paneSlice';
import { LiquiditySlice } from '@/store/slices/liquiditySlice';

export type RootState = ChartLayoutSlice &
    ChartsDataSlice &
    IndicatorSlice &
    PaneSlice &
    LiquiditySlice;
