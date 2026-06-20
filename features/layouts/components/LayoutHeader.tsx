import TimeFrameList from '@/shared/components/ui/TimeFrameList';
import LayoutModal from '@/features/layouts/components/LayoutModal';

import ModeToggle from '@/shared/components/ui/ModeToggle';
import IndicatorButton from '@/shared/components/ui/IndicatorButton';
import IndicatorSelector from '@/features/layouts/components/IndicatorSelector';
import SyncButton from '@/shared/components/ui/SyncButton';
import SyncSelector from '@/features/layouts/components/SyncSelector';
import TimeframeButton from '../../../shared/components/ui/TimeFrameButton';
import { getAllLayout } from '@/lib/data-service';
import SearchSymbol from '../../../shared/components/ui/SearchSymbol';
import SearchButton from '@/shared/components/ui/SearchButton';
import Link from 'next/link';
import WatchlistButton from '@/shared/components/ui/WatchlistButton';
import Watchlist from '@/features/watchlist/components/Watchlist';
import AppLogo from '@/shared/components/ui/AppLogo';

export default async function LayoutHeader() {
    return (
        <header className="flex justify-between items-center px-4 py-2 overflow-x-auto overflow-y-clip w-full bg-surface border-b border-surface-border shadow-sm min-h-[50px]">
            {/* Left Group: Asset & Timeframe */}
            <div className="flex items-center gap-3 h-full">
                <div className="hidden md:flex items-center mr-2">
                    <AppLogo />
                </div>
                
                <div className="flex items-center bg-card rounded-md p-1 border border-panel-border shadow-sm">
                    <SearchSymbol>
                        <SearchButton />
                    </SearchSymbol>
                    <div className="w-[1px] h-4 bg-surface-border mx-1" />
                    <LayoutModal
                        source={<TimeframeButton />}
                        possition={{ top: 0, left: 0 }}
                    >
                        <TimeFrameList />
                    </LayoutModal>
                </div>
            </div>

            {/* Right Group: Tools & Navigation */}
            <div className="flex items-center gap-3 h-full ml-auto">
                <div className="flex items-center bg-card rounded-md p-1 border border-panel-border shadow-sm">
                    <LayoutModal
                        source={<IndicatorButton />}
                        possition={{ top: 0, left: 0 }}
                    >
                        <IndicatorSelector />
                    </LayoutModal>
                    <div className="w-[1px] h-4 bg-surface-border mx-1" />
                    <LayoutModal
                        source={<SyncButton />}
                        possition={{ top: 0, left: 0 }}
                    >
                        <SyncSelector />
                    </LayoutModal>
                </div>

                <div className="flex items-center bg-card rounded-md p-1 border border-panel-border shadow-sm">
                    <LayoutModal
                        source={<WatchlistButton />}
                        modalWidth={300}
                        possition={{ top: 0, left: -250 }}
                    >
                        <div className="h-[500px]">
                            <Watchlist isEditable={true} />
                        </div>
                    </LayoutModal>
                    <div className="w-[1px] h-4 bg-surface-border mx-1" />
                    <Link href="/watchlist" className="px-3 py-1 text-sm font-semibold text-primary hover:text-white hover:bg-primary transition-colors rounded-sm mx-1">
                        Full Watchlist
                    </Link>
                </div>

                <div className="hidden md:flex items-center bg-card rounded-md p-1 border border-panel-border shadow-sm ml-2">
                    <ModeToggle />
                </div>
            </div>
        </header>
    );
}
