'use client';

export function useRemoveWatchlist() {
    const mutate = async (symbol: string) => {
        const stored = localStorage.getItem('chartforge_watchlist');
        let data: {symbol: string}[] = stored ? JSON.parse(stored) : [{ symbol: 'BTCUSDT' }, { symbol: 'ETHUSDT' }];
        data = data.filter(item => item.symbol !== symbol);
        localStorage.setItem('chartforge_watchlist', JSON.stringify(data));
        window.dispatchEvent(new Event('watchlist_updated'));
    };

    return { mutate };
}
