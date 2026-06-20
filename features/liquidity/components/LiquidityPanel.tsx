"use client";
import { useStore } from '@/store/store';
import { XMarkIcon, ChartBarIcon, ArrowTrendingUpIcon, ArrowTrendingDownIcon, ViewfinderCircleIcon, InformationCircleIcon } from '@heroicons/react/24/solid';
import { useState } from 'react';

export default function LiquidityPanel() {
    const [isOpen, setIsOpen] = useState(false);
    const settings = useStore((state) => state.liquiditySettings);
    const metrics = useStore((state) => state.dashboardMetrics);
    const toggleSetting = useStore((state) => state.toggleLiquiditySetting);

    const togglePanel = () => setIsOpen(!isOpen);

    const renderToggle = (key: keyof typeof settings, label: string) => (
        <div className="flex items-center justify-between py-2 border-b border-surface/30">
            <span className="text-xs font-medium text-text-secondary">{label}</span>
            <label className="relative inline-flex items-center cursor-pointer">
                <input
                    type="checkbox"
                    className="sr-only peer"
                    checked={settings[key]}
                    onChange={() => toggleSetting(key)}
                />
                <div className="w-9 h-5 bg-surface-border rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-primary"></div>
            </label>
        </div>
    );

    return (
        <>
            <button
                onClick={togglePanel}
                className="absolute top-4 right-4 z-50 p-2 rounded-lg bg-surface/80 backdrop-blur-md border border-surface-border text-text-secondary hover:text-white transition-colors shadow-lg"
                title="Smart Liquidity Dashboard"
            >
                <ChartBarIcon className="w-6 h-6" />
            </button>

            <div
                className={`fixed inset-y-0 right-0 w-96 bg-surface/95 backdrop-blur-xl border-l border-surface-border shadow-2xl transform transition-transform duration-300 ease-in-out z-[60] flex flex-col ${
                    isOpen ? 'translate-x-0' : 'translate-x-full'
                }`}
            >
                <div className="flex items-center justify-between p-5 border-b border-surface-border bg-surface/50">
                    <div>
                        <h2 className="text-lg font-bold text-white tracking-wide">
                            Smart Dashboard
                        </h2>
                        <p className="text-xs text-text-secondary">Liquidity Narrative Engine</p>
                    </div>
                    <button
                        onClick={togglePanel}
                        className="p-1 rounded-md text-text-secondary hover:text-white transition-colors"
                    >
                        <XMarkIcon className="w-6 h-6" />
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto p-5 space-y-6">
                    
                    {/* Market Bias */}
                    <div className="bg-surface border border-surface-border rounded-xl p-4 flex items-center justify-between">
                        <div>
                            <p className="text-xs text-text-secondary uppercase font-semibold">Macro Bias</p>
                            <p className={`text-xl font-bold mt-1 ${metrics.bias === 'Bullish' ? 'text-green-500' : metrics.bias === 'Bearish' ? 'text-red-500' : 'text-gray-400'}`}>
                                {metrics.bias}
                            </p>
                        </div>
                        {metrics.bias === 'Bullish' && <ArrowTrendingUpIcon className="w-8 h-8 text-green-500/50" />}
                        {metrics.bias === 'Bearish' && <ArrowTrendingDownIcon className="w-8 h-8 text-red-500/50" />}
                    </div>

                    {/* Top Setup */}
                    <div className="bg-surface border border-surface-border rounded-xl p-4">
                        <div className="flex items-center justify-between mb-3">
                            <h3 className="text-xs uppercase tracking-wider text-primary font-semibold flex items-center gap-2">
                                <InformationCircleIcon className="w-4 h-4" /> Top Setup
                            </h3>
                            {metrics.topSetup && (
                                <span className={`text-xs px-2 py-1 rounded font-bold ${metrics.topSetup.direction === 'bullish' ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>
                                    {metrics.topSetup.confidence}% Conf
                                </span>
                            )}
                        </div>
                        {metrics.topSetup ? (
                            <div className="space-y-2">
                                <p className="text-sm font-medium text-white">{metrics.topSetup.direction === 'bullish' ? 'Bullish' : 'Bearish'} Liquidity Chain</p>
                                <div className="flex flex-wrap gap-1">
                                    {metrics.topSetup.components.map((c, i) => (
                                        <span key={i} className="text-[10px] px-1.5 py-0.5 rounded bg-surface-border text-text-secondary">
                                            ✓ {c}
                                        </span>
                                    ))}
                                </div>
                                <div className="pt-2 text-xs text-text-secondary flex justify-between">
                                    <span>Status: <span className="text-white">{metrics.topSetup.status}</span></span>
                                </div>
                            </div>
                        ) : (
                            <p className="text-sm text-text-secondary italic">No high-probability setups active.</p>
                        )}
                    </div>

                    {/* Active Targets */}
                    <div className="bg-surface border border-surface-border rounded-xl p-4">
                        <h3 className="text-xs uppercase tracking-wider text-text-secondary font-semibold mb-3 flex items-center gap-2">
                            <ViewfinderCircleIcon className="w-4 h-4" /> Active Targets
                        </h3>
                        {metrics.activeTargets.length > 0 ? (
                            <div className="space-y-2">
                                {metrics.activeTargets.map((t, i) => (
                                    <div key={i} className="flex justify-between items-center bg-background/50 p-2 rounded">
                                        <span className="text-xs text-white">{t.type}</span>
                                        <span className="text-xs font-mono text-orange-400">{t.price.toFixed(2)}</span>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <p className="text-sm text-text-secondary italic">No magnetic targets detected.</p>
                        )}
                    </div>

                    {/* Zone Summary */}
                    <div className="bg-surface border border-surface-border rounded-xl p-4">
                        <h3 className="text-xs uppercase tracking-wider text-text-secondary font-semibold mb-3">
                            Zone Lifecycle
                        </h3>
                        <div className="grid grid-cols-2 gap-2 text-xs">
                            <div className="flex justify-between"><span className="text-text-secondary">Detected:</span> <span className="text-white">{metrics.zoneSummary.detected}</span></div>
                            <div className="flex justify-between"><span className="text-text-secondary">Triggered:</span> <span className="text-white">{metrics.zoneSummary.triggered}</span></div>
                            <div className="flex justify-between"><span className="text-text-secondary">Tapped:</span> <span className="text-white">{metrics.zoneSummary.tapped}</span></div>
                            <div className="flex justify-between"><span className="text-text-secondary">Partial:</span> <span className="text-white">{metrics.zoneSummary.partiallyFilled}</span></div>
                            <div className="flex justify-between"><span className="text-text-secondary">Invalidated:</span> <span className="text-red-400">{metrics.zoneSummary.invalidated}</span></div>
                        </div>
                    </div>

                    {/* Filters */}
                    <div>
                        <h3 className="text-xs uppercase tracking-wider text-text-secondary font-semibold mb-2">
                            Visibility Filters
                        </h3>
                        <div className="bg-surface border border-surface-border rounded-xl p-3 space-y-1">
                            {renderToggle('showInstitutionalZones', 'Merged Institutional Zones')}
                            {renderToggle('showFVG', 'Fair Value Gaps')}
                            {renderToggle('showWickBlocks', 'Wick Blocks')}
                            {renderToggle('showIcebergBlocks', 'Iceberg Blocks')}
                            {renderToggle('showMagneticBlocks', 'Magnetic Blocks')}
                            {renderToggle('showLiquiditySweeps', 'Liquidity Sweeps')}
                        </div>
                    </div>

                </div>
            </div>

            {isOpen && (
                <div 
                    className="fixed inset-0 bg-black/20 backdrop-blur-sm z-[55] transition-opacity"
                    onClick={togglePanel}
                />
            )}
        </>
    );
}
