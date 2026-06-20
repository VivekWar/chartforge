import { ChartBarIcon } from '@heroicons/react/24/solid';

export default function IndicatorButton() {
    return (
        <button className="flex items-center px-3 py-1.5 gap-2 text-sm font-semibold text-muted-foreground hover:text-foreground hover:bg-hover rounded-md transition-colors cursor-pointer w-full justify-center md:w-auto">
            <ChartBarIcon className="h-4 w-4" />
            Indicators
        </button>
    );
}
