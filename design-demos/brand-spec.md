# Brand & product spec — dsh-trading212

## What this product is
`dsh-trading212` v0.8.8 — a **read-only** Trading 212 portfolio workspace plugin for **dsh**.
It renders as a native `T212` tab in the dsh Web chat panel (`src/client/index.tsx` → `src/app/App.tsx`).
Views: 概览 · 持仓 · 历史 · 设置 · 帮助 + setup / boot / error / empty states. Bilingual via `tx(zh, en)`.

## Brand position
Trading 212-inspired product language: navy product chrome, a clear interaction blue, light data canvas,
green/red reserved for signed finance only. The plugin is **not** an official Trading 212 product and must
never imply it can place, modify or cancel orders.

## Hard constraints (cannot be redesigned away)
1. **Read-only.** No control may read as "place an order". Disabled Buy/Sell affordances stay visually honest and carry read-only copy.
2. **Privacy toggle.** The eye control masks every balance (`.js-balance`, `hide-balances` on the root). The masked state must look designed, not broken.
3. **Real data only.** Every number traces to `PortfolioSnapshot.analytics` / `positions` / `pendingOrders`, T212 history, or Yahoo Finance candles. No invented metrics, no filler stats.
4. **Real brand assets.** Ticker logos are genuine fetched PNGs (`src/logo-service.ts` → tickerlogo.com, 512KB cap, 7-day cache). The initials avatar (`.ticker-avatar.fallback`) is the honest fallback and must look intentional in both states.
5. **Source caveats stay visible.** Yahoo prices vs Trading 212 wallet impact must remain distinguishable; portfolio return never derives from Yahoo prices.
6. **Locale-aware formatting.** Money/date formatting follows the account or instrument currency.

## Asset policy for this redesign
- No webfonts, no CDN, no new runtime dependency: the plugin ships as an npm package and must work offline.
- Type comes from the system stack (`-apple-system` / SF Pro, PingFang SC) plus `ui-monospace` for figures.
- No serif display face: headless Chromium and non-Safari browsers fall back to Times New Roman, which reads as the cheapest possible outcome. Verified absent in all three directions.
- Ticker logo slot geometry is defined once so the real PNG and the initials fallback are interchangeable.
