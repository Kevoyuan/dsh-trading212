# Trading 212 inspired UI system · dsh-trading212

## Design direction

The interface follows the Trading 212 Invest product language: a deep navy account/navigation shell, a light data canvas, clear portfolio value hierarchy, compact rounded surfaces, restrained blue interaction accents, and green/red only for financial semantics. The plugin remains read-only; visual controls must never imply that an order can be placed.

The dashboard is source-backed. The default view leads with the account snapshot, then shows the selected instrument's market movement, holding detail, portfolio drivers, currency exposure, and exact holdings. All visible values come from `PortfolioSnapshot.analytics`, `PortfolioSnapshot.positions`, `pendingOrders`, Trading 212 history, or Yahoo Finance market data.

## Tokens

```css
:root {
  --canvas-0: #f5f7fa;
  --canvas-1: #ffffff;
  --canvas-2: #e8edf3;
  --navy: #102b46;
  --ink: #15263a;
  --ink-2: #41566c;
  --muted: #708196;
  --rule: #e4e9ef;
  --rule-strong: #c9d3de;
  --primary: #1677ff;
  --primary-bright: #3d91ff;
  --primary-deep: #0957c7;
  --positive: #18a957;
  --negative: #e0524d;
  --warning: #d88a15;
  --radius-sm: 8px;
  --radius-md: 10px;
  --radius-lg: 14px;
  --shadow-card: 0 1px 3px rgba(20, 45, 72, .08);
  --shadow-action: 0 4px 12px rgba(22, 119, 255, .20);
}
```

## Layout

- Sticky 64px navy top bar with `INVEST`, environment badge, primary tabs, search, privacy toggle, and refresh.
- Desktop overview: narrow account/portfolio rail plus a flexible selected-instrument detail pane.
- Rail order: account value, main pot, API snapshot KPIs, portfolio context, AI prompt shortcuts, investments, pending orders, asset allocation, actions.
- Detail order: selected holding header, live/market history chart, holding metrics, AutoInvest read-only affordance, portfolio intelligence, P/L drivers, currency exposure, and holdings table.
- At 900px and below the grid becomes one column; at 680px controls stack and tables remain horizontally scrollable rather than clipping.

## Data model and metric roles

| UI surface | Source fields |
| --- | --- |
| Account value | `analytics.totalValue`, `analytics.unrealizedProfitLoss`, `analytics.unrealizedReturnPercent` |
| Cash widget | `analytics.availableCash`, `cashInPies`, `reservedForOrders` |
| Snapshot KPIs | `positionMarketValue`, `totalCost`, `realizedProfitLoss`, `fxImpact` |
| Context strip | `positionCount`, `piePositionCount`, `availableCashWeightPercent`, `top3WeightPercent` |
| Investments | `positions[]`, `walletImpact`, `quantity`, instrument metadata |
| Allocation | `analytics.allocation[]` with value, weight, cost, P/L, FX impact, return |
| Currency exposure | `analytics.currencyExposure[]` |
| Pending orders | `pendingOrders[]` |
| Price chart | Yahoo Finance `MarketSeries.candles[]` |
| Trade markers/history | Trading 212 `HistoricalOrder[]`, `CashTransaction[]`, `Dividend[]` |

## Chart contract

- Primary question: how has the selected instrument moved over the requested range, and where did Trading 212 fills occur?
- Chart: single-series time line with separate buy and sell markers.
- Blue line and open blue area communicate price movement; green squares mark buys; amber triangles mark sells.
- Keep date range, interval, currency, source, and fill count visible near the chart.
- Do not infer account performance from Yahoo prices; portfolio return always comes from Trading 212 wallet impact.

## Component rules

1. Use light surfaces with 1px cool-gray borders and small-to-medium corners; no glass blur, neon glow, or decorative gradients.
2. Use blue for interaction and selection, navy for product chrome, and green/red only for signed finance values.
3. Show metric labels, units, time scope, and source caveats close to the number or chart.
4. Hide balances through the existing privacy toggle; do not expose hidden values in alternate visible labels.
5. Disabled Buy/Sell controls remain visually honest and carry a read-only explanation.
6. Use Lucide outline icons at 1.5px or less; use SVG/chart marks for quantitative distinctions.
7. All Chinese/English copy continues to use `tx(zh, en)` and locale-aware money/date formatting.

## Validation

```bash
pnpm typecheck
pnpm build
NODE_OPTIONS='--localstorage-file=/tmp/dsh-trading212-localstorage.json' pnpm test
pnpm exec tsx scripts/make-preview.mjs
```

The independent preview is generated from the same `src/app/styles.css` used by the React application. Verify desktop and mobile rendering, then confirm that the account, allocation, holdings, currency exposure, pending orders, history, and market data paths are still API-backed.
