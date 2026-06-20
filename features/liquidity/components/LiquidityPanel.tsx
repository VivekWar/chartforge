"use client";

import { useStore } from '@/store/store';
import React from 'react';

export default function LiquidityPanel() {
    const settings = useStore(state => state.liquiditySettings);
    const toggleSetting = useStore(state => state.toggleLiquiditySetting);

    return (
        <div style={{
            position: 'absolute',
            top: '10px',
            right: '60px', // Avoid price scale
            backgroundColor: 'rgba(15, 23, 42, 0.85)',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            borderRadius: '8px',
            padding: '12px',
            color: '#fff',
            zIndex: 100,
            fontFamily: 'Inter, sans-serif',
            fontSize: '12px',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            flexDirection: 'column',
            gap: '8px',
            minWidth: '180px',
            boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.5)'
        }}>
            <div style={{ fontWeight: 'bold', borderBottom: '1px solid rgba(255, 255, 255, 0.1)', paddingBottom: '6px', marginBottom: '4px', display: 'flex', justifyContent: 'space-between' }}>
                <span>ENIGMA ENGINE</span>
                <span>⚙️</span>
            </div>

            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                <input type="checkbox" checked={settings.strictMode} onChange={() => toggleSetting('strictMode')} />
                <span style={{ color: settings.strictMode ? '#eab308' : '#fff', fontWeight: settings.strictMode ? 'bold' : 'normal' }}>
                    Strict Mode (OTE Only)
                </span>
            </label>

            <div style={{ height: '1px', backgroundColor: 'rgba(255,255,255,0.1)' }} />

            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                <input type="checkbox" checked={settings.showMagneticBlocks} onChange={() => toggleSetting('showMagneticBlocks')} />
                <span>🧲 Show Magnetic Targets</span>
            </label>

            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                <input type="checkbox" checked={settings.showBombFireBlocks} onChange={() => toggleSetting('showBombFireBlocks')} />
                <span>💣🔥 Show BombFire Blocks</span>
            </label>

            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                <input type="checkbox" checked={settings.showIcebergBlocks} onChange={() => toggleSetting('showIcebergBlocks')} />
                <span>🧊 Show Icebergs</span>
            </label>

            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                <input type="checkbox" checked={settings.showWickBlocks} onChange={() => toggleSetting('showWickBlocks')} />
                <span>👁️ Show Wick Blocks</span>
            </label>

            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                <input type="checkbox" checked={settings.showFVG} onChange={() => toggleSetting('showFVG')} />
                <span>📦 Show FVGs</span>
            </label>

            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                <input type="checkbox" checked={settings.showLiquiditySweeps} onChange={() => toggleSetting('showLiquiditySweeps')} />
                <span>💧 Show Sweeps</span>
            </label>

            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                <input type="checkbox" checked={settings.showTradeSetups} onChange={() => toggleSetting('showTradeSetups')} />
                <span>🎯 Show Trade Setups</span>
            </label>
        </div>
    );
}
