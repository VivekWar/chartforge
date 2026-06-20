import { ChartLayoutSchema, type ChartLayout } from '@/schemas';
import { ChartGrid } from '@/shared/types/common';

const DUMMY_LAYOUTS: Record<string, ChartLayout> = {
    '1': { numRows: 1, numCols: 1, charts: [{ chartId: '11111111-1111-1111-1111-111111111111', symbol: 'BTCUSDT', timeframe: '1d', indicators: [] }] },
};

export async function getChartLayout(id: string): Promise<ChartLayout> {
    return DUMMY_LAYOUTS['1'];
}

export async function getAllLayout(): Promise<ChartGrid[]> {
    return [
        { id: 1, numRows: 1, numCols: 1 },
    ];
}
