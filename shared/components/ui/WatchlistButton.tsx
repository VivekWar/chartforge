import { ListBulletIcon } from '@heroicons/react/24/solid';
import React from 'react';

export default function WatchlistButton() {
    return (
        <button className="flex items-center px-3 py-1.5 gap-2 text-sm font-semibold text-muted-foreground hover:text-foreground hover:bg-hover rounded-md transition-colors cursor-pointer w-full justify-center md:w-auto">
            <ListBulletIcon className="w-4 h-4" />
            Watchlist
        </button>
    );
}
