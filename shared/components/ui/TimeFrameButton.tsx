'use client';
import { selectActiveChartTimeframe } from '@/store/selectors/chartDataSelectors';
import { useStore } from '@/store/store';

export default function TimeframeButton() {
    const interval = useStore(selectActiveChartTimeframe);
    return (
        <button className="flex items-center justify-center h-8 px-3 rounded-md cursor-pointer transition-colors text-sm font-bold text-foreground hover:bg-hover min-w-10 uppercase tracking-wide">
            {interval}
        </button>
    );
}
