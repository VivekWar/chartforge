import { CandleType, TimeFrameType } from '@/shared/types/common';
import { Time } from 'lightweight-charts';
import { useMemo } from 'react';

export type FVGType = 'bullish' | 'bearish';
export type MitigationStatus = 'Unmitigated' | 'Partially Filled' | 'Fully Mitigated';

export interface FVGZone {
    id: string;
    type: FVGType;
    startTime: Time;
    endTime: Time;
    topPrice: number;
    bottomPrice: number;
    isMitigated: boolean; // True if 'Fully Mitigated'
    mitigationStatus: MitigationStatus;
    mitigatedTime?: Time;
    score: number;
    timeframe: TimeFrameType;
    gapSize: number;
    volumeRatio: number;
    confluenceFactors: string[];
}

// --- HELPER FUNCTIONS ---

function getTimeframeWeight(tf: TimeFrameType): number {
    switch (tf) {
        case '1w': return 50;
        case '1d': return 40;
        case '4h': return 30;
        case '1h': return 20;
        case '15m': return 10;
        case '5m': return 5;
        case '1m': return 0;
        default: return 10;
    }
}

function getLookbackLimit(tf: TimeFrameType): number {
    switch (tf) {
        case '1m': return 200;
        case '5m': case '15m': case '1d': return 300;
        case '1h': case '4h': return 500;
        default: return 300;
    }
}

function getGapSizeScore(gapSize: number, currentPrice: number): number {
    if (currentPrice === 0) return 0;
    const gapPercent = (gapSize / currentPrice) * 100;
    if (gapPercent >= 1.0) return 15;
    if (gapPercent >= 0.5) return 10;
    if (gapPercent >= 0.1) return 5;
    return 0;
}

function getVolumeScore(volume: number, volumeSMA: number): number {
    if (volumeSMA === 0) return 0;
    const ratio = volume / volumeSMA;
    if (ratio >= 2.0) return 15;
    if (ratio >= 1.5) return 10;
    if (ratio >= 1.2) return 5;
    return 0;
}

function getDisplacementScore(candle: CandleType, pastCandles: CandleType[]): number {
    let score = 0;
    const body = Math.abs(candle.close - candle.open);
    const range = candle.high - candle.low;
    
    // Body-to-Range Ratio (Max 10)
    if (range > 0) {
        const ratio = body / range;
        if (ratio >= 0.8) score += 10;
        else if (ratio >= 0.6) score += 5;
    }

    // Relative Size vs past candles (Max 15)
    if (pastCandles.length > 0) {
        const avgBody = pastCandles.reduce((sum, c) => sum + Math.abs(c.close - c.open), 0) / pastCandles.length;
        if (avgBody > 0) {
            const relSize = body / avgBody;
            if (relSize >= 3.0) score += 15;
            else if (relSize >= 2.0) score += 10;
            else if (relSize >= 1.5) score += 5;
        }
    }
    
    return score;
}

function getMarketStructureScore(type: FVGType, candle: CandleType, pastCandles: CandleType[]): { score: number, factor: string | null } {
    if (pastCandles.length === 0) return { score: 0, factor: null };
    
    if (type === 'bullish') {
        const highestHigh = Math.max(...pastCandles.map(c => c.high));
        if (candle.close > highestHigh) return { score: 25, factor: 'Bullish BOS' };
    } else {
        const lowestLow = Math.min(...pastCandles.map(c => c.low));
        if (candle.close < lowestLow) return { score: 25, factor: 'Bearish BOS' };
    }
    return { score: 0, factor: null };
}

function getConfluenceScore(type: FVGType, topPrice: number, bottomPrice: number, swingHighs: number[], swingLows: number[]): { score: number, factor: string | null } {
    if (type === 'bullish') {
        // Support/Resistance Flip (Bullish FVG sitting on previous Swing High)
        const isNearHigh = swingHighs.some(sh => Math.abs(sh - topPrice) / topPrice < 0.005);
        if (isNearHigh) return { score: 20, factor: 'S/R Flip (Swing High)' };
    } else {
        // Bearish FVG sitting on previous Swing Low
        const isNearLow = swingLows.some(sl => Math.abs(sl - bottomPrice) / bottomPrice < 0.005);
        if (isNearLow) return { score: 20, factor: 'S/R Flip (Swing Low)' };
    }
    return { score: 0, factor: null };
}

function checkMitigationStatus(zone: FVGZone, futureCandles: CandleType[]): { status: MitigationStatus, time?: Time } {
    const midpoint = (zone.topPrice + zone.bottomPrice) / 2;
    let status: MitigationStatus = 'Unmitigated';
    let mitigatedTime: Time | undefined = undefined;

    for (const c of futureCandles) {
        if (zone.type === 'bullish') {
            if (c.low <= midpoint) {
                return { status: 'Fully Mitigated', time: c.time as Time };
            } else if (c.low <= zone.topPrice) {
                status = 'Partially Filled';
                mitigatedTime = c.time as Time;
            }
        } else {
            if (c.high >= midpoint) {
                return { status: 'Fully Mitigated', time: c.time as Time };
            } else if (c.high >= zone.bottomPrice) {
                status = 'Partially Filled';
                mitigatedTime = c.time as Time;
            }
        }
    }

    return { status, time: mitigatedTime };
}

// --- MAIN HOOK ---

export function useFVGDetector(
    rawCandles: CandleType[],
    timeframe: TimeFrameType | undefined,
    showMitigated: boolean = false,
): FVGZone[] {
    return useMemo(() => {
        if (!rawCandles || rawCandles.length < 3) return [];

        const tf = timeframe || '15m';
        const limit = getLookbackLimit(tf);
        const candles = rawCandles.slice(Math.max(0, rawCandles.length - limit));
        const zones: FVGZone[] = [];
        const baseWeight = getTimeframeWeight(tf);

        // Pre-calculate 10-period Volume SMA
        const volumeSma: number[] = new Array(candles.length).fill(0);
        for (let i = 10; i < candles.length; i++) {
            let sum = 0;
            for (let k = 1; k <= 10; k++) {
                sum += candles[i - k].volume || 0;
            }
            volumeSma[i] = sum / 10;
        }

        // Find swing highs/lows (window of 5: 2 before, 2 after)
        const swingHighs: number[] = [];
        const swingLows: number[] = [];
        for (let i = 2; i < candles.length - 2; i++) {
            const h = candles[i].high;
            const l = candles[i].low;
            if (h > candles[i - 1].high && h > candles[i - 2].high && h > candles[i + 1].high && h > candles[i + 2].high) swingHighs.push(h);
            if (l < candles[i - 1].low && l < candles[i - 2].low && l < candles[i + 1].low && l < candles[i + 2].low) swingLows.push(l);
        }

        // 1. Detect FVGs
        for (let i = 2; i < candles.length; i++) {
            const c1 = candles[i - 2];
            const c2 = candles[i - 1]; // Displacement candle
            const c3 = candles[i];

            let type: FVGType | null = null;
            let topPrice = 0;
            let bottomPrice = 0;

            if (c1.high < c3.low) {
                type = 'bullish';
                topPrice = c3.low;
                bottomPrice = c1.high;
            } else if (c1.low > c3.high) {
                type = 'bearish';
                topPrice = c1.low;
                bottomPrice = c3.high;
            }

            if (!type) continue;

            const gapSize = Math.abs(topPrice - bottomPrice);
            const volumeRatio = volumeSma[i - 1] > 0 ? c2.volume / volumeSma[i - 1] : 0;
            const confluenceFactors: string[] = [];

            // --- Scoring Engine ---
            let score = baseWeight;

            // Gap Size Score (Max 15)
            score += getGapSizeScore(gapSize, c2.close);

            // Volume Score (Max 15)
            score += getVolumeScore(c2.volume, volumeSma[i - 1]);

            // Displacement Quality (Max 25)
            const past10 = candles.slice(Math.max(0, i - 11), i - 1);
            score += getDisplacementScore(c2, past10);

            // Market Structure Confirmation (Max 25)
            const past15 = candles.slice(Math.max(0, i - 16), i - 1);
            const ms = getMarketStructureScore(type, c2, past15);
            score += ms.score;
            if (ms.factor) confluenceFactors.push(ms.factor);

            // Confluence Bonus (Max 20)
            const conf = getConfluenceScore(type, topPrice, bottomPrice, swingHighs, swingLows);
            score += conf.score;
            if (conf.factor) confluenceFactors.push(conf.factor);

            score = Math.min(100, score);

            zones.push({
                id: `fvg-${type}-${c1.time}-${c3.time}`,
                type,
                startTime: c1.time as Time,
                endTime: c3.time as Time,
                topPrice,
                bottomPrice,
                isMitigated: false, // Updated in pass 2
                mitigationStatus: 'Unmitigated',
                score,
                timeframe: tf,
                gapSize,
                volumeRatio,
                confluenceFactors,
            });
        }

        // 2. Mitigation Check (Midpoint Logic)
        for (let i = 0; i < zones.length; i++) {
            const zone = zones[i];
            const startIndex = candles.findIndex((c) => c.time === zone.endTime);
            if (startIndex === -1) continue;

            const futureCandles = candles.slice(startIndex + 1);
            const { status, time } = checkMitigationStatus(zone, futureCandles);
            
            zone.mitigationStatus = status;
            if (time) zone.mitigatedTime = time;
            if (status === 'Fully Mitigated') zone.isMitigated = true;
        }

        // 3. Smart Filtering
        let displayZones = zones;
        if (!showMitigated) {
            // Keep Unmitigated and Partially Filled. Remove Fully Mitigated.
            displayZones = displayZones.filter((z) => !z.isMitigated);
        }

        // Filter out low quality
        displayZones = displayZones.filter((z) => z.score >= 50);

        // Separate and rank
        const bullish = displayZones.filter(z => z.type === 'bullish').sort((a, b) => b.score - a.score);
        const bearish = displayZones.filter(z => z.type === 'bearish').sort((a, b) => b.score - a.score);

        // Return Top 5 of each
        return [...bullish.slice(0, 5), ...bearish.slice(0, 5)];
    }, [rawCandles, timeframe, showMitigated]);
}
