import { useEffect } from 'react';
import { useStore } from '@/store/store';
import { LiquidityZone } from './useLiquidityEngine';
import { TradeSetup } from '@/store/slices/liquiditySlice';
import { CandleType } from '@/shared/types/common';

export function useEnigmaTrader(
    microZones: LiquidityZone[],
    macroZones: LiquidityZone[],
    currentCandle: CandleType | null,
    bias: 'Bullish' | 'Bearish' | 'Neutral'
) {
    const setActiveTradeSetup = useStore(state => state.setActiveTradeSetup);
    const activeSetup = useStore(state => state.activeTradeSetup);

    useEffect(() => {
        if (!currentCandle) return;

        const currentPrice = currentCandle.close;

        // Manage active setup state based on price
        if (activeSetup) {
            let status = activeSetup.status;
            if (status === 'Pending') {
                if (activeSetup.direction === 'bullish' && currentPrice <= activeSetup.entryPrice) status = 'Active';
                if (activeSetup.direction === 'bearish' && currentPrice >= activeSetup.entryPrice) status = 'Active';
            }

            if (status === 'Active') {
                if (activeSetup.direction === 'bullish') {
                    if (currentPrice >= activeSetup.takeProfit) status = 'Won';
                    if (currentPrice <= activeSetup.stopLoss) status = 'Lost';
                } else {
                    if (currentPrice <= activeSetup.takeProfit) status = 'Won';
                    if (currentPrice >= activeSetup.stopLoss) status = 'Lost';
                }
            }

            if (status !== activeSetup.status) {
                setActiveTradeSetup({ ...activeSetup, status });
            }

            // If it's still running or pending, don't look for new ones
            if (status === 'Pending' || status === 'Active') {
                return;
            } else {
                // Wait for a fresh cycle to clear Won/Lost (or keep it on chart until dismissed)
                // For now, let's clear it if it's dead so we can find a new one
                setActiveTradeSetup(null);
                return;
            }
        }

        if (bias === 'Neutral') return;

        const isBullish = bias === 'Bullish';

        // 1. Find the nearest Macro Target
        const targetZones = macroZones.filter(z => 
            (z.type === 'MagneticBlock' || z.type === 'FVG') && 
            z.status !== 'Completed' && 
            z.status !== 'Invalidated' &&
            z.direction === (isBullish ? 'bearish' : 'bullish') // Target opposing liquidity
        );

        if (targetZones.length === 0) return;

        const target = targetZones.reduce((prev, curr) => {
            const prevDist = Math.abs(currentPrice - (isBullish ? prev.bottomPrice : prev.topPrice));
            const currDist = Math.abs(currentPrice - (isBullish ? curr.bottomPrice : curr.topPrice));
            return currDist < prevDist ? curr : prev;
        });

        const takeProfit = isBullish ? target.bottomPrice : target.topPrice;

        // 2. Find the nearest Entry Footprint
        const entryZones = microZones.filter(z => 
            (z.type === 'WickBlock' || z.type === 'IcebergBlock' || z.type === 'BombFireBlock') &&
            (z.status === 'Detected' || z.status === 'Tapped') &&
            z.direction === (isBullish ? 'bullish' : 'bearish')
        );

        if (entryZones.length === 0) return;

        const entry = entryZones.reduce((prev, curr) => {
            const prevDist = Math.abs(currentPrice - (isBullish ? prev.topPrice : prev.bottomPrice));
            const currDist = Math.abs(currentPrice - (isBullish ? curr.topPrice : curr.bottomPrice));
            return currDist < prevDist ? curr : prev;
        });

        const entryPrice = isBullish ? entry.topPrice : entry.bottomPrice;
        
        // Stop Loss 1 tick beyond extreme wick
        const tick = currentPrice * 0.001; 
        const stopLoss = isBullish ? entry.bottomPrice - tick : entry.topPrice + tick;

        const risk = Math.abs(entryPrice - stopLoss);
        const reward = Math.abs(takeProfit - entryPrice);
        if (risk === 0) return;

        const riskRewardRatio = reward / risk;

        // Strict Enigma Entry Filter
        if (riskRewardRatio >= 1.5) {
            const newSetup: TradeSetup = {
                id: `trade-${Date.now()}`,
                entryPrice,
                stopLoss,
                takeProfit,
                riskRewardRatio,
                status: 'Pending',
                direction: isBullish ? 'bullish' : 'bearish',
                associatedZones: [entry.id, target.id],
                entryTime: entry.startTime as number
            };

            setActiveTradeSetup(newSetup);
        }

    }, [microZones, macroZones, currentCandle, bias, activeSetup, setActiveTradeSetup]);
}
