'use client';
import { MagnifyingGlassIcon } from '@heroicons/react/16/solid';
import Modal from './Modal';
import { ReactElement, useEffect, useMemo, useState } from 'react';
import Spinner from './Spinner';
import { useStore } from '@/store/store';
import { selectSyncSymbolAndIndicator } from '@/store/selectors/chartDataSelectors';
import { useShallow } from 'zustand/shallow';
import CoinIcon from './CoinIcon';
import Link from 'next/link';
import { Ticker } from '@/shared/types/common';
import { StarIcon } from '@heroicons/react/24/solid';
type SymbolList = {
    symbol: string;
    base: string;
    quote: string;
}[];
type BinanceSymbol = {
    symbol: string;
    status: string;
    baseAsset: string;
    quoteAsset: string;
};
type ExchangeInfoResponse = {
    symbols: BinanceSymbol[];
};
type SearchSymProps = {
    onCloseModal?: () => void;
    isRedirect: boolean;
    watchlist: boolean;
    watchlistAddFn?: (symbol: string) => void;
    watchlistData: Ticker[];
};
function SearchSym({
    onCloseModal,
    isRedirect = false,
    watchlist,
    watchlistAddFn,
    watchlistData,
}: SearchSymProps) {
    const [searchTerm, setSearchTerm] = useState('');
    const [symbols, setSymbols] = useState<SymbolList>([]);
    const [isLoading, setIsLoading] = useState(false);
    const { setActiveChartSymbol, setAllChartsSymbol } = useStore();
    const { syncSymbol } = useStore(useShallow(selectSyncSymbolAndIndicator));
    useEffect(function () {
        const abortController = new AbortController();
        async function loadData() {
            try {
                setIsLoading(true);
                const response = await fetch(
                    'https://api.binance.com/api/v3/exchangeInfo',
                    {
                        signal: abortController.signal,
                    },
                );

                if (!response.ok) {
                    throw new Error('Failed to fetch exchange info');
                }
                const data: ExchangeInfoResponse = await response.json();
                const pairs = data.symbols
                    .filter((s) => s.status === 'TRADING')
                    .map((s) => ({
                        symbol: s.symbol,
                        base: s.baseAsset,
                        quote: s.quoteAsset,
                    }));
                setSymbols(pairs);
                setIsLoading(false);
            } catch (error) {
                if (
                    error instanceof DOMException &&
                    error.name === 'AbortError'
                ) {
                    return;
                }
                console.error('Error fetching symbols:', error);
            }
        }
        loadData();
        return () => {
            abortController.abort();
        };
    }, []);

    const filteredSymbols = useMemo(() => {
        if (searchTerm) {
            const lower = searchTerm.toLowerCase();
            return symbols
                .filter(
                    (s) =>
                        s.symbol.toLowerCase().includes(lower) ||
                        s.base.toLowerCase().includes(lower),
                )
                .slice(0, 50);
        }
        return symbols.slice(0, 50);
    }, [searchTerm, symbols]);

    return (
        <div className="flex flex-col h-full overflow-hidden bg-dropdown-background rounded-lg border border-surface-border shadow-2xl backdrop-blur-md">
            {/* Search Header */}
            <div className="flex items-center px-4 md:px-6 py-4 border-b border-surface-border bg-surface/50">
                <div className="flex items-center gap-3 flex-1 h-12 px-4 rounded-lg bg-background border border-surface-border focus-within:border-primary focus-within:ring-1 focus-within:ring-primary/30 transition-all w-full">
                    <MagnifyingGlassIcon className="h-5 w-5 text-muted-foreground" />

                    <input
                        type="text"
                        placeholder="Search markets..."
                        className="flex-1 bg-transparent outline-none text-base font-medium placeholder:text-muted-foreground/70"
                        value={searchTerm}
                        autoFocus
                        onChange={(e) =>
                            setSearchTerm(e.target.value.toUpperCase())
                        }
                    />
                </div>
            </div>

            {isLoading ? (
                <div className="flex-1 flex items-center justify-center min-h-[200px]">
                    <Spinner />
                </div>
            ) : (
                <>
                    {/* Table Header */}
                    <div className="flex items-center px-4 md:px-6 py-3 text-xs font-bold uppercase tracking-wider border-b border-surface-border text-muted-foreground bg-surface/30">
                        <span className="flex-1">Symbol</span>

                        {/* Hide description on small screens */}
                        {!watchlist ? (
                            <>
                                <span className="flex-1 hidden md:block">
                                    Description
                                </span>

                                <span className="w-24 text-right">
                                    Exchange
                                </span>
                            </>
                        ) : (
                            <span className="w-24 text-right">Action</span>
                        )}
                    </div>

                    {/* List */}
                    <div className="flex-1 overflow-y-auto min-h-[300px]">
                        {filteredSymbols.map((s) => {
                            const isInWatchlist = watchlistData?.some(
                                (coin) => coin.symbol === s.symbol,
                            );
                            return isRedirect ? (
                                <Link
                                    key={s.symbol}
                                    className="flex items-center px-4 md:px-6 py-3 border-b border-surface-border hover:bg-hover cursor-pointer transition-colors group"
                                    href={`/terminal/1/${s.symbol}`}
                                    onClick={() => {
                                        onCloseModal?.();
                                    }}
                                >
                                    {/* Symbol */}
                                    <div className="flex-1 font-semibold flex items-center gap-3">
                                        <span className="bg-surface p-1 rounded-md border border-surface-border group-hover:border-primary/30 transition-colors">
                                            <CoinIcon symbol={s.symbol} />
                                        </span>
                                        <span className="text-foreground">{s.base}</span>
                                        <span className="text-muted-foreground text-xs font-medium bg-surface px-1.5 py-0.5 rounded">
                                            {s.quote}
                                        </span>
                                    </div>

                                    {!watchlist ? (
                                        <>
                                            {/* Description */}
                                            <div className="flex-1 text-muted-foreground text-sm hidden md:block font-medium">
                                                {s.base} / {s.quote}
                                            </div>

                                            {/* Exchange */}
                                            <div className="w-24 text-right text-xs font-bold text-muted-foreground/70 tracking-wide">
                                                BINANCE
                                            </div>
                                        </>
                                    ) : (
                                        <button
                                            disabled={isInWatchlist}
                                            className={`p-2 transition-all rounded-full hover:bg-surface-border ${
                                                isInWatchlist
                                                    ? 'text-yellow-500 cursor-not-allowed opacity-50'
                                                    : 'text-muted-foreground hover:text-yellow-400 hover:scale-110'
                                            }`}
                                            onClick={(e) => {
                                                e.preventDefault();
                                                e.stopPropagation();
                                                if (!isInWatchlist) {
                                                    watchlistAddFn?.(s.symbol);
                                                }
                                            }}
                                        >
                                            <StarIcon className="w-5 h-5" />
                                        </button>
                                    )}
                                </Link>
                            ) : (
                                <div
                                    key={s.symbol}
                                    onClick={() => {
                                        onCloseModal?.();
                                        if (!syncSymbol) {
                                            setActiveChartSymbol(s.symbol);
                                        } else {
                                            setAllChartsSymbol(s.symbol);
                                        }
                                    }}
                                    className="flex items-center px-4 md:px-6 py-3 border-b border-surface-border hover:bg-hover cursor-pointer transition-colors group"
                                >
                                    {/* Symbol */}
                                    <div className="flex-1 font-semibold flex items-center gap-3">
                                        <span className="bg-surface p-1 rounded-md border border-surface-border group-hover:border-primary/30 transition-colors">
                                            <CoinIcon symbol={s.symbol} />
                                        </span>
                                        <span className="text-foreground">{s.base}</span>
                                        <span className="text-muted-foreground text-xs font-medium bg-surface px-1.5 py-0.5 rounded">
                                            {s.quote}
                                        </span>
                                    </div>

                                    {/* Description */}
                                    <div className="flex-1 text-muted-foreground text-sm hidden md:block font-medium">
                                        {s.base} / {s.quote}
                                    </div>

                                    {/* Exchange */}
                                    <div className="w-24 text-right text-xs font-bold text-muted-foreground/70 tracking-wide">
                                        BINANCE
                                    </div>
                                </div>
                            );
                        })}
                        {filteredSymbols.length === 0 && (
                            <div className="flex flex-col items-center justify-center h-full text-muted-foreground py-10">
                                <MagnifyingGlassIcon className="w-10 h-10 mb-3 opacity-20" />
                                <p className="font-medium">No markets found</p>
                            </div>
                        )}
                    </div>
                </>
            )}
        </div>
    );
}

export default function SearchSymbol({
    children,
    isRedirect = false,
    watchlist = false,
    watchlistAddFn,
    watchlistData = [],
}: {
    children: ReactElement<{ onClick: () => void }>;
    isRedirect?: boolean;
    watchlist?: boolean;
    watchlistAddFn?: (symbol: string) => void;
    watchlistData?: Ticker[];
}) {
    return (
        <Modal>
            <Modal.Open opens="search">{children}</Modal.Open>
            <Modal.Window name="search">
                <SearchSym
                    isRedirect={isRedirect}
                    watchlist={watchlist}
                    watchlistAddFn={watchlistAddFn}
                    watchlistData={watchlistData}
                />
            </Modal.Window>
        </Modal>
    );
}
