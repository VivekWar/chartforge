<div align="center">
  <img src="./public/icon.png" alt="ChartForge Logo" width="120" />
  <h1>🚀 ChartForge: Institutional Liquidity Terminal</h1>
  <p><strong>A professional-grade crypto trading platform powered by the ENIGMA Liquidity Narrative Engine.</strong></p>
</div>

<br />

ChartForge is not just another indicator scanner. It is a high-conviction, institutional-grade market intelligence terminal. Moving beyond retail patterns, ChartForge is built around a discretionary **Liquidity Reasoning Engine** that actively tracks institutional footprints, applies strict Premium/Discount filters, and evaluates complex narrative setups in real-time.

---

## 🌟 The ENIGMA Liquidity Engine

The core of ChartForge is its proprietary master engine, which actively scans the market for institutional algorithms and structural liquidity shifts.

### 🧠 Smart Narrative Dashboard
* **Macro Bias Engine:** Instantly calculates the global equilibrium of the chart to establish a strict Bullish or Bearish market bias.
* **Top Setup Detection:** Hunts for high-probability sequences (e.g., *Liquidity Sweep → Wick Block → MSS → FVG*) and ranks them with a Confidence Score.
* **Zone Lifecycle Tracking:** Zones do not just appear and disappear. They move through a strict state machine: `Detected → Tapped → Triggered → Partially Filled → Completed → Invalidated`.
* **Ghosted Invalidations:** Failed theses (like a body close through a Wick Block) aren't deleted; they are marked `Invalidated` and "ghosted" on the chart for visual backtesting and failure analysis.

### 🏛️ Core Institutional Filters
1. **BombFire Blocks (BFB):** Tracks the manipulation candle, waits for the activation trigger close, and isolates the precise entry wick.
2. **Inverse Fair Value Gaps (IFVG):** When a standard FVG is invalidated by a strong body close, the engine flips its polarity, turning failed support into active resistance.
3. **Iceberg Blocks:** Requires massive impulse candles (85%+ body) and restricts execution exclusively to high timeframes (1H, 4H, 1D, 1W) to eliminate retail noise. Includes strict "No Wick" fallback tracing.
4. **Wick Blocks:** Mathematically forbidden unless the rejection wick actively swept a preceding structural Swing High or Swing Low.
5. **Magnetic Target Blocks:** Evaluates tight consolidations leading into expansions, tracking backward to find the *last opposing Order Block* to use as an algorithmic draw on liquidity.

---

## 🛠 Tech Stack

* **Frontend:** Next.js 14 (App Router), React, TailwindCSS
* **State Management:** Zustand + Immer (High-frequency state synchronization)
* **Charting:** TradingView Lightweight Charts API (Custom Canvas Primitives)
* **Real-time Data:** Binance WebSocket API (Live Candlestick Aggregation)
* **Architecture:** TypeScript, React Hooks, CSS Variables

---

## 🚀 Getting Started

### 1. Clone the repository
```bash
git clone https://github.com/VivekWar/chartforge.git
cd chartforge
```

### 2. Install dependencies
```bash
npm install
```

### 3. Run the development server
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) to view the terminal.

---

## ⚙️ Project Structure Highlight

- **`features/liquidity/`**: Contains the UI for the Smart Dashboard and the Right Panel drawer.
- **`shared/components/hooks/useLiquidityEngine.ts`**: The "brain" of the platform. This file houses the multi-dimensional detectors, the Premium/Discount equilibrium logic, and the ENIGMA narrative construction loop.
- **`shared/components/chart-components/primitives/LiquidityZonePrimitive.ts`**: The custom TradingView Lightweight Charts canvas plugin that mathematically draws, colors, and updates the opacity of the Liquidity Zones based on their state machine status.
- **`store/slices/liquiditySlice.ts`**: The Zustand state slice managing the flow of data between the engine and the UI dashboards.

---

## ⚠️ Disclaimer

ChartForge is built for educational and market research purposes only. The algorithms and liquidity concepts implemented do not constitute financial advice.

<div align="center">
  <p>Built with precision by Vivek 🚀</p>
</div>
