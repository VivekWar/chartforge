import { CandleType, TimeFrameType } from '@/shared/types/common';
import { Time } from 'lightweight-charts';
import { useEffect, useMemo } from 'react';
import { useStore } from '@/store/store';
import { ZoneStatus, LiquiditySetup, MarketBias, DashboardMetrics, Direction, LiquiditySettings } from '@/store/slices/liquiditySlice';

export type LiquidityType = 'FVG' | 'WickBlock' | 'IcebergBlock' | 'BombFireBlock' | 'MagneticBlock' | 'InstitutionalZone' | 'LiquiditySweep';

export interface LiquidityZone {
    id: string;
    type: LiquidityType;
    direction: Direction;
    startTime: Time;
    endTime: Time;
    topPrice: number;
    bottomPrice: number;
    status: ZoneStatus;
    score: number;
    timeframe: TimeFrameType;
    confluenceFactors: string[];
    distance?: number;
    magnetStrength?: number;
}

// Helper: Determine if TF is high timeframe for Iceberg blocks
function isHighTimeframe(tf: TimeFrameType): boolean {
    return ['1h', '4h', '1d', '1w'].includes(tf);
}

function getZoneStatus(
    zone: LiquidityZone,
    futureCandles: CandleType[]
): ZoneStatus {
    if (zone.status === 'Invalidated') return 'Invalidated';
    
    let status: ZoneStatus = zone.status;
    const midpoint = (zone.topPrice + zone.bottomPrice) / 2;

    for (const c of futureCandles) {
        if (zone.type === 'WickBlock' || zone.type === 'IcebergBlock' || zone.type === 'BombFireBlock') {
            // Body close beyond zone invalidates
            if (zone.direction === 'bullish') {
                if (c.close <= zone.bottomPrice) return 'Invalidated';
                if (c.low <= zone.topPrice) {
                    if (status === 'Detected') status = 'Tapped';
                    if (c.close > zone.topPrice && status === 'Tapped') status = 'Triggered';
                    if (c.low <= midpoint) status = 'Completed';
                }
            } else {
                if (c.close >= zone.topPrice) return 'Invalidated';
                if (c.high >= zone.bottomPrice) {
                    if (status === 'Detected') status = 'Tapped';
                    if (c.close < zone.bottomPrice && status === 'Tapped') status = 'Triggered';
                    if (c.high >= midpoint) status = 'Completed';
                }
            }
        } else if (zone.type === 'FVG') {
            // IFVG Logic
            if (status === 'Inverted') {
                // If it was bullish, it's now inverted to bearish (resistance)
                if (zone.direction === 'bullish') {
                    if (c.high >= zone.topPrice) return 'Completed'; // price pushed back through resistance
                } else {
                    if (c.low <= zone.bottomPrice) return 'Completed'; // price pushed back through support
                }
            } else {
                if (zone.direction === 'bullish') {
                    if (c.close < zone.bottomPrice) {
                        status = 'Inverted'; // ENIGMA IFVG Flip
                    } else {
                        if (c.low <= zone.bottomPrice) return 'Completed';
                        if (c.low <= midpoint) status = 'Partially Filled';
                        else if (c.low <= zone.topPrice && status === 'Detected') status = 'Tapped';
                    }
                } else {
                    if (c.close > zone.topPrice) {
                        status = 'Inverted'; // ENIGMA IFVG Flip
                    } else {
                        if (c.high >= zone.topPrice) return 'Completed';
                        if (c.high >= midpoint) status = 'Partially Filled';
                        else if (c.high >= zone.bottomPrice && status === 'Detected') status = 'Tapped';
                    }
                }
            }
        } else if (zone.type === 'MagneticBlock') {
            if (zone.direction === 'bullish') {
                if (c.low <= zone.topPrice) return 'Completed';
            } else {
                if (c.high >= zone.bottomPrice) return 'Completed';
            }
        }
    }

    return status;
}

export function useLiquidityEngine(
    rawCandles: CandleType[],
    timeframe: TimeFrameType | undefined,
    config: LiquiditySettings
): LiquidityZone[] {
    const setDashboardMetrics = useStore((state) => state.setDashboardMetrics);

    return useMemo(() => {
        if (!rawCandles || rawCandles.length < 50) return [];

        const tf = timeframe || '15m';
        const limit = 500;
        const candles = rawCandles.slice(Math.max(0, rawCandles.length - limit));
        const zones: LiquidityZone[] = [];
        
        // --- 1. Equilibrium Engine (Premium/Discount) ---
        let macroHigh = -Infinity;
        let macroLow = Infinity;
        for (const c of candles) {
            if (c.high > macroHigh) macroHigh = c.high;
            if (c.low < macroLow) macroLow = c.low;
        }
        const equilibrium = (macroHigh + macroLow) / 2;
        const currentPrice = candles[candles.length - 1].close;
        const bias: MarketBias = currentPrice > equilibrium ? 'Bullish' : 'Bearish';

        // Pre-calcs for Strict 5-Candle Sweeps
        const swingHighs: {price: number, i: number, time: Time}[] = [];
        const swingLows: {price: number, i: number, time: Time}[] = [];
        for (let i = 5; i < candles.length - 5; i++) {
            const h = candles[i].high;
            const l = candles[i].low;
            
            // Check previous 5 and next 5
            let isHigh = true;
            let isLow = true;
            let prev5High = -Infinity;
            let prev5Low = Infinity;

            for (let j = 1; j <= 5; j++) {
                if (candles[i - j].high > prev5High) prev5High = candles[i - j].high;
                if (candles[i - j].low < prev5Low) prev5Low = candles[i - j].low;
                
                if (candles[i - j].high >= h || candles[i + j].high >= h) isHigh = false;
                if (candles[i - j].low <= l || candles[i + j].low <= l) isLow = false;
            }

            // Strict ENIGMA Math: max(open, close) < prev5High
            if (isHigh && Math.max(candles[i].open, candles[i].close) < prev5High) {
                swingHighs.push({price: h, i, time: candles[i].time as Time});
            }
            // min(open, close) > prev5Low
            if (isLow && Math.min(candles[i].open, candles[i].close) > prev5Low) {
                swingLows.push({price: l, i, time: candles[i].time as Time});
            }
        }

        // --- SUB-DETECTORS ---
        for (let i = 5; i < candles.length; i++) {
            const c = candles[i];
            const cPrev = candles[i - 1];
            const cPrev2 = candles[i - 2];
            
            const body = Math.abs(c.close - c.open);
            const range = c.high - c.low;
            const isBullish = c.close > c.open;

            // Strict Sweeps (Check if current candle i is in swing arrays)
            const sweptHigh = swingHighs.find(sh => sh.i === i);
            const sweptLow = swingLows.find(sl => sl.i === i);
            
            if (config.showLiquiditySweeps) {
                if (sweptHigh) {
                    zones.push({
                        id: `sweep-bear-${c.time}`, type: 'LiquiditySweep', direction: 'bearish',
                        startTime: c.time as Time, endTime: c.time as Time,
                        topPrice: c.high, bottomPrice: Math.max(c.open, c.close),
                        status: 'Completed', score: 60, timeframe: tf, confluenceFactors: ['Strict Sweep']
                    });
                }
                if (sweptLow) {
                    zones.push({
                        id: `sweep-bull-${c.time}`, type: 'LiquiditySweep', direction: 'bullish',
                        startTime: c.time as Time, endTime: c.time as Time,
                        topPrice: Math.min(c.open, c.close), bottomPrice: c.low,
                        status: 'Completed', score: 60, timeframe: tf, confluenceFactors: ['Strict Sweep']
                    });
                }
            }

            // Strict Iceberg Blocks: Powerful Candle > 85%, body > 1.5x 10SMA
            if (config.showIcebergBlocks && range > 0 && (body / range) > 0.85) {
                const past = candles.slice(Math.max(0, i - 10), i);
                const avgBody = past.reduce((s, x) => s + Math.abs(x.close - x.open), 0) / Math.max(1, past.length);
                
                if (body > avgBody * 1.5) {
                    let topP = isBullish ? c.close : c.high;
                    let botP = isBullish ? c.low : c.close;
                    
                    if (!isBullish && c.high === Math.max(c.open, c.close)) topP = cPrev.high;
                    if (isBullish && c.low === Math.min(c.open, c.close)) botP = cPrev.low;

                    zones.push({
                        id: `ib-${c.time}`, type: 'IcebergBlock', direction: isBullish ? 'bullish' : 'bearish',
                        startTime: c.time as Time, endTime: c.time as Time,
                        topPrice: topP, bottomPrice: botP,
                        status: 'Detected', score: 70, timeframe: tf, confluenceFactors: ['Powerful Candle', '> 1.5x SMA']
                    });
                }
            }

            // Strict Wick Blocks (MUST occur on Sweep, wick > 50%)
            if (config.showWickBlocks && range > 0) {
                const upperWick = c.high - Math.max(c.open, c.close);
                const lowerWick = Math.min(c.open, c.close) - c.low;
                
                if (sweptHigh && upperWick / range > 0.5) {
                    zones.push({
                        id: `wb-bear-${c.time}`, type: 'WickBlock', direction: 'bearish',
                        startTime: c.time as Time, endTime: c.time as Time,
                        topPrice: c.high, bottomPrice: Math.max(c.open, c.close),
                        status: 'Detected', score: 85, timeframe: tf, confluenceFactors: ['Strict Wick', 'Sweep']
                    });
                }
                if (sweptLow && lowerWick / range > 0.5) {
                    zones.push({
                        id: `wb-bull-${c.time}`, type: 'WickBlock', direction: 'bullish',
                        startTime: c.time as Time, endTime: c.time as Time,
                        topPrice: Math.min(c.open, c.close), bottomPrice: c.low,
                        status: 'Detected', score: 85, timeframe: tf, confluenceFactors: ['Strict Wick', 'Sweep']
                    });
                }
            }

            // Strict BombFire Blocks (Manipulation Sweep -> Close -> 2nd Reversal)
            if (config.showBombFireBlocks) {
                // If c swept high/low, we flag it as a potential manipulation candle.
                // We actually scan BACKWARDS to see if c is the activation close, then look forwards for the wick.
                // Wait, it's easier to check if a PAST candle was a sweep, and this candle C is the FIRST close past its body.
                for (let j = 1; j <= 20; j++) { // Lookback window
                    if (i - j < 0) continue;
                    const manip = candles[i - j];
                    const manipSweptLow = swingLows.find(sl => sl.i === i - j);
                    const manipSweptHigh = swingHighs.find(sh => sh.i === i - j);
                    
                    if (manipSweptLow && c.close > manip.high) {
                        // C is activation. We need the 2nd reversal. This requires look-forward.
                        // Wait, if C is activation, the 2nd reversal hasn't happened yet!
                        // Let's check if c is the 2nd reversal, and cPrev was activation? 
                        // "Wait for a subsequent candle to body close... Mark the wick of the second consecutive reversal candle"
                        // So c = 2nd reversal. cPrev = 1st reversal? No, 2nd consecutive.
                        // Actually, let's just find the pattern terminating at c.
                        
                        // Was there a close above manip.high before c?
                        // If not, c is the close. But we need to wait for reversal.
                        // So we look for a past activation, and c is the 2nd reversal.
                        
                        // Let's refine:
                        const activationIdx = candles.findIndex((ca, idx) => idx > i - j && ca.close > manip.high);
                        if (activationIdx !== -1 && i > activationIdx) {
                            // Find 2nd consecutive bearish candle after activation
                            let bearishCount = 0;
                            let bfbTarget: CandleType | null = null;
                            for (let k = activationIdx + 1; k <= i; k++) {
                                if (candles[k].close < candles[k].open) {
                                    bearishCount++;
                                    if (bearishCount === 2) {
                                        bfbTarget = candles[k];
                                        break;
                                    }
                                } else {
                                    bearishCount = 0; // Must be consecutive
                                }
                            }

                            if (bfbTarget && bfbTarget === c) {
                                zones.push({
                                    id: `bfb-bull-${c.time}`, type: 'BombFireBlock', direction: 'bullish',
                                    startTime: manip.time as Time, endTime: c.time as Time,
                                    topPrice: Math.min(c.open, c.close), bottomPrice: c.low,
                                    status: 'Triggered', score: 90, timeframe: tf, confluenceFactors: ['BFB Math']
                                });
                            }
                        }
                        break;
                    }

                    if (manipSweptHigh && c.close < manip.low) {
                        const activationIdx = candles.findIndex((ca, idx) => idx > i - j && ca.close < manip.low);
                        if (activationIdx !== -1 && i > activationIdx) {
                            let bullishCount = 0;
                            let bfbTarget: CandleType | null = null;
                            for (let k = activationIdx + 1; k <= i; k++) {
                                if (candles[k].close > candles[k].open) {
                                    bullishCount++;
                                    if (bullishCount === 2) {
                                        bfbTarget = candles[k];
                                        break;
                                    }
                                } else {
                                    bullishCount = 0;
                                }
                            }

                            if (bfbTarget && bfbTarget === c) {
                                zones.push({
                                    id: `bfb-bear-${c.time}`, type: 'BombFireBlock', direction: 'bearish',
                                    startTime: manip.time as Time, endTime: c.time as Time,
                                    topPrice: c.high, bottomPrice: Math.max(c.open, c.close),
                                    status: 'Triggered', score: 90, timeframe: tf, confluenceFactors: ['BFB Math']
                                });
                            }
                        }
                        break;
                    }
                }
            }

            // FVG (Hard Filter: Premium/Discount alignment + Origin Sweep)
            if (config.showFVG) {
                const prev2SweptHigh = swingHighs.some(sh => sh.i < i - 2 && cPrev2.high > sh.price && Math.max(cPrev2.open, cPrev2.close) < sh.price);
                const prev2SweptLow = swingLows.some(sl => sl.i < i - 2 && cPrev2.low < sl.price && Math.min(cPrev2.open, cPrev2.close) > sl.price);

                if (cPrev2.high < c.low) { // Bullish FVG
                    if (c.low < equilibrium && prev2SweptLow) { // Must be in Discount AND swept low
                        zones.push({
                            id: `fvg-bull-${c.time}`, type: 'FVG', direction: 'bullish',
                            startTime: cPrev2.time as Time, endTime: c.time as Time,
                            topPrice: c.low, bottomPrice: cPrev2.high,
                            status: 'Detected', score: 85, timeframe: tf, confluenceFactors: ['Discount FVG', 'Origin Sweep']
                        });
                    }
                } else if (cPrev2.low > c.high) { // Bearish FVG
                    if (c.high > equilibrium && prev2SweptHigh) { // Must be in Premium AND swept high
                        zones.push({
                            id: `fvg-bear-${c.time}`, type: 'FVG', direction: 'bearish',
                            startTime: cPrev2.time as Time, endTime: c.time as Time,
                            topPrice: cPrev2.low, bottomPrice: c.high,
                            status: 'Detected', score: 85, timeframe: tf, confluenceFactors: ['Premium FVG', 'Origin Sweep']
                        });
                    }
                }
            }
        }

        // Strict Magnetic Blocks (3+ Consolidation -> 1.5x Expansion)
        if (config.showMagneticBlocks) {
            for (let i = 5; i < candles.length - 2; i++) {
                const past3 = candles.slice(i-3, i);
                const maxH = Math.max(...past3.map(c => c.high));
                const minL = Math.min(...past3.map(c => c.low));
                const range3 = maxH - minL;
                
                // Consolidation detection (very tight range)
                const avgPastCandleRange = past3.reduce((s, c) => s + (c.high - c.low), 0) / 3;
                if (range3 < avgPastCandleRange * 1.5) { 
                    
                    const currentRange = candles[i].high - candles[i].low;
                    if (currentRange > range3 * 1.5) { // Sniper Expansion
                        const isBullishExp = candles[i].close > candles[i].open;
                        
                        let targetOB: CandleType | null = null;
                        if (isBullishExp) {
                            for (let k = 2; k >= 0; k--) {
                                if (past3[k].close < past3[k].open) { targetOB = past3[k]; break; }
                            }
                        } else {
                            for (let k = 2; k >= 0; k--) {
                                if (past3[k].close > past3[k].open) { targetOB = past3[k]; break; }
                            }
                        }

                        if (targetOB) {
                            zones.push({
                                id: `mb-${candles[i].time}`, type: 'MagneticBlock', direction: isBullishExp ? 'bullish' : 'bearish',
                                startTime: targetOB.time as Time, endTime: candles[i].time as Time,
                                topPrice: targetOB.open, bottomPrice: targetOB.close,
                                status: 'Detected', score: 80, timeframe: tf, confluenceFactors: ['Strict Consolidation Target'],
                                distance: Math.abs(currentPrice - (isBullishExp ? targetOB.close : targetOB.open)), 
                                magnetStrength: 100
                            });
                        }
                    }
                }
            }
        }

        // --- LIFECYCLE ENGINE ---
        for (const zone of zones) {
            const startIndex = candles.findIndex(c => c.time === zone.endTime);
            if (startIndex !== -1) {
                const futureCandles = candles.slice(startIndex + 1);
                zone.status = getZoneStatus(zone, futureCandles);
            }
        }

        // --- NARRATIVE SETUP ENGINE ---
        let topSetup: LiquiditySetup | null = null;
        let highestConfidence = 0;

        // Try to chain Sweep -> WB -> FVG
        const wbs = zones.filter(z => z.type === 'WickBlock');
        const fvgs = zones.filter(z => z.type === 'FVG');
        
        for (const wb of wbs) {
            const associatedFvgs = fvgs.filter(f => f.direction === wb.direction && f.startTime >= wb.startTime && (f.startTime as number) <= (wb.startTime as number) + 10);
            if (associatedFvgs.length > 0) {
                const confidence = 90 + associatedFvgs.length * 2;
                if (confidence > highestConfidence) {
                    highestConfidence = confidence;
                    topSetup = {
                        id: `setup-${wb.id}`,
                        direction: wb.direction,
                        confidence,
                        components: ['Liquidity Sweep', 'Wick Block', 'MSS', 'FVG'],
                        status: wb.status === 'Invalidated' ? 'Invalidated' : 'Triggered',
                        entryPrice: associatedFvgs[0].topPrice,
                        targetPrice: wb.direction === 'bullish' ? macroHigh : macroLow,
                        invalidationPrice: wb.direction === 'bullish' ? wb.bottomPrice : wb.topPrice
                    };
                }
            }
        }

        // --- SMART DASHBOARD METRICS ---
        const activeTargets = zones
            .filter(z => z.type === 'MagneticBlock' && z.status !== 'Completed' && z.status !== 'Invalidated')
            .map(z => ({ id: z.id, type: z.type, price: (z.topPrice + z.bottomPrice)/2, distance: z.distance || 0 }))
            .sort((a,b) => a.distance - b.distance)
            .slice(0, 3);

        const summary = { detected: 0, triggered: 0, tapped: 0, partiallyFilled: 0, completed: 0, invalidated: 0 };
        for (const z of zones) {
            if (z.status === 'Detected') summary.detected++;
            else if (z.status === 'Triggered') summary.triggered++;
            else if (z.status === 'Tapped') summary.tapped++;
            else if (z.status === 'Partially Filled') summary.partiallyFilled++;
            else if (z.status === 'Completed') summary.completed++;
            else if (z.status === 'Invalidated') summary.invalidated++;
        }

        // Update Zustand via setTimeout to avoid render cycle warning
        setTimeout(() => {
            setDashboardMetrics({
                bias,
                topSetup,
                activeTargets,
                zoneSummary: summary
            });
        }, 0);

        // --- RENDER FILTERING ---
        let renderZones = zones.filter(z => z.status !== 'Completed');
        // Filter by settings
        renderZones = renderZones.filter(z => {
            if (z.type === 'FVG') return config.showFVG;
            if (z.type === 'WickBlock') return config.showWickBlocks;
            if (z.type === 'IcebergBlock') return config.showIcebergBlocks;
            if (z.type === 'MagneticBlock') return config.showMagneticBlocks;
            if (z.type === 'LiquiditySweep') return config.showLiquiditySweeps;
            return true;
        });

        // Top 10 Active
        const activeDisplay = renderZones.filter(z => z.status !== 'Invalidated').sort((a, b) => b.score - a.score).slice(0, 10);
        // Show Invalidated ghosted if needed
        const invalidDisplay = renderZones.filter(z => z.status === 'Invalidated').slice(-5);

        return [...activeDisplay, ...invalidDisplay];

    }, [rawCandles, timeframe, config, setDashboardMetrics]);
}
