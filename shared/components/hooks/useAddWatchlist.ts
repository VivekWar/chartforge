'use client';

export function useAddWatchlist() {
    const mutate = async (symbol: string) => {
        const stored = localStorage.getItem('chartforge_watchlist');
        const data: {symbol: string}[] = stored ? JSON.parse(stored) : [{ symbol: 'BTCUSDT' }, { symbol: 'ETHUSDT' }];
        if (!data.find(item => item.symbol === symbol)) {
            data.unshift({ symbol });
            localStorage.setItem('chartforge_watchlist', JSON.stringify(data));
            window.dispatchEvent(new Event('watchlist_updated'));
        }
    };

    return { mutate };
}
