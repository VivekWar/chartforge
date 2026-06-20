'use client';

import { Ticker } from '@/shared/types/common';
import { useState, useEffect } from 'react';

export function useWatchlist() {
    const [data, setData] = useState<Ticker[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const fetchWatchlist = async () => {
            setIsLoading(true);
            try {
                const storedWatchlist = localStorage.getItem('chartforge_watchlist');
                const watchlistData = storedWatchlist ? JSON.parse(storedWatchlist) : [{ symbol: 'BTCUSDT' }, { symbol: 'ETHUSDT' }];

                const binanceRes = await fetch(
                    'https://api.binance.com/api/v3/ticker/24hr',
                );
                if (!binanceRes.ok) {
                    throw new Error('Failed to fetch Coins data');
                }
                const allCoinsData = (await binanceRes.json()) as Ticker[];
                const coinMap = new Map(
                    allCoinsData.map((coin) => [coin.symbol, coin]),
                );
                const finalData = watchlistData
                    .map((w: { symbol: string }) => coinMap.get(w.symbol))
                    .filter(Boolean) as Ticker[];
                setData(finalData);
            } catch (error) {
                console.error('Watchlist fetch error:', error);
                setData([]);
            } finally {
                setIsLoading(false);
            }
        };

        fetchWatchlist();

        const handleUpdate = () => {
            fetchWatchlist();
        };

        window.addEventListener('watchlist_updated', handleUpdate);
        return () => window.removeEventListener('watchlist_updated', handleUpdate);
    }, []);

    return { data, isLoading };
}
