import ChartGrids from '@/features/layouts/components/ChartGrids';
import AllCharts from '@/features/layouts/charts/AllCharts';
import LiquidityPanel from '@/features/liquidity/components/LiquidityPanel';

export default function ChartLayout() {
    return (
        <main className="w-full h-full min-h-0 relative">
            <ChartGrids>
                <AllCharts />
            </ChartGrids>
            <LiquidityPanel />
        </main>
    );
}
