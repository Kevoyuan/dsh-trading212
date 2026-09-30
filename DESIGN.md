# dsh x Trading 212 - design system ("Lumen")

## Current visual rules

The implementation in `src/app/styles.css` is the source of truth for tokens. Cards use
18px outer corners, 14px panel corners, 10px inset corners, and 6px compact controls.
Elevated surfaces have a subtle upper inset highlight and layered soft shadows in both
themes. Main interface text uses Inter with SF Pro as the system fallback; monospace is
reserved for very small technical labels. Hero figures use weight 550 and −0.03em
tracking. English interface labels use sentence case, while ticker symbols and the
INVEST brand keep their original casing. The sticky navigation groups use translucent
glass and a gentle blur, with an opaque reduced-transparency fallback.

## Design direction

The interface is a **soft-structuralist data instrument**: a cool, faintly blue-cast neutral
canvas, off-white plates, two hue-tinted ambient elevations, and exactly one desaturated
accent. Depth comes from surface steps and a single hairline, not from borders on everything.
Green and red are reserved for signed finance only.

This replaced a 2937-line stylesheet that was **11 stacked redesigns overriding each other**
(Carbon Ledger dark → T212 navy → quiet refinement → frosted island → bento → "High-End Button
System" → density pass → HUD → dark patch). The layers contradicted their own rules: the tokens
claimed flat instrument chrome while the top bar carried `backdrop-filter: blur(20px)` and the
page carried six decorative gradients that the direction explicitly banned.

The dashboard is source-backed. The default view leads with the account snapshot, then the
selected instrument's market movement, holding detail, portfolio drivers, currency exposure,
and exact holdings. All visible values come from `PortfolioSnapshot.analytics`,
`PortfolioSnapshot.positions`, `pendingOrders`, Trading 212 history, or Yahoo Finance data.

## Tokens

```css
:root {
  /* surfaces - cool blue-cast ramp, four steps, no pure white */
  --canvas:  #f4f6fc;   --surface: #fcfdff;
  --well:    #ebeff8;   --glass:   rgba(252, 253, 255, .74);

  /* ink ramp - 16.9 / 8.9 / 5.7 : 1 on white, 5.2 : 1 on the canvas */
  --ink-1: #101420;  --ink-2: #414958;  --ink-3: #5a6272;

  /* one accent, 63% saturation, 5.5:1 on the plate */
  --accent: #2e5fd0;  --accent-deep: #234aa3;  --accent-soft: #e6ebfa;

  /* finance semantics, each verified >= 4.5:1 on canvas and on well */
  --pos: #0d6a48;  --neg: #b3352b;  --warn: #8a6212;
  --pos-soft: #e4f2ea;  --neg-soft: #fae9e7;

  --hair: #dce3f0;                       /* ONE hairline */
  --sh-plate: 0 1px 2px rgba(26,38,62,.05), 0 14px 34px -18px rgba(26,38,62,.18), inset 0 1px 0 rgba(255,255,255,.9);
  --sh-float: 0 2px 6px rgba(26,38,62,.06), 0 26px 60px -26px rgba(26,38,62,.30);

  --r-1: 8px; --r-2: 14px; --r-3: 20px; --r-pill: 999px;
  --fs-micro: 12px; --fs-body: 14.5px; --fs-row: 17.5px; --fs-fig: 21px;
  --fs-title: 25.5px; --fs-hero-sm: 31px; --fs-hero: 40px;
  --ease: cubic-bezier(.32,.72,0,1);  --d-1: 140ms; --d-2: 260ms; --d-3: 420ms;
}
```

`--fs-hero-sm` is the 31px mobile hero and is not a desktop content tier. The dark
theme overrides `--canvas / --surface / --well / --glass / --ink-* / --accent* /
--pos / --neg / --warn / --pos-soft / --neg-soft / --hair / --sh-*` and nothing else.

Shadows are tinted to the canvas hue (`rgba(26,38,62,…)`), never neutral black, and both
elevations carry an inset top highlight so plates read as physical.

**The chart is not exempt from the tokens.** The series line, the buy/sell markers,
the axis ink, the gridline and the crosshair are all read from `--accent`, `--pos`,
`--warn`, `--ink-3`, `--hair` and `--font-mono` at render time (`PriceHistoryChart`
resolves them with `getComputedStyle`). Charting defaults are not a palette: a
TradingView `#1677ff` line beside a `--accent` swatch put two blues on one card.
Canvas type is set at `--fs-micro` (12px) for the same reason the DOM floor exists.

## Locked rules

1. **Colour.** One accent for the whole product. It is never used for signed finance and
   never varies by section. No pure `#000` or `#fff` anywhere.
2. **Shape.** `--r-1` chips and inputs, `--r-2` inner cards, `--r-3` hero plates,
   `--r-pill` interactive controls. Those four only.
3. **Type.** Six sizes: 12 / 14.5 / 17.5 / 21 / 25.5 / 40. Nothing below 12px, ever.
   Exactly **one hero per page** at 40px (31px on mobile): the portfolio total on the
   overview, the instrument price on the detail page. No second size competes with it; the
   31px step exists only as the mobile hero.
4. **Motion.** One curve, three beats (140 / 260 / 420ms), `transform` and `opacity` only,
   `prefers-reduced-motion` collapses everything to static.
5. **Blur.** `backdrop-filter` only on the fixed top bar and modal scrims, with a
   `prefers-reduced-transparency` solid fallback.
6. **Horizontal overflow is a bug.** Wide tables scroll inside `.table-scroll`; every
   flex/grid container on the path carries `min-width: 0`; `.workspace` is deliberately
   a plain block stack so no implicit `auto` grid track can ever size to a table's
   max-content width.
7. **Density is bought with area, never with information.** De-densifying may add space,
   remove non-data chrome, or widen a column — it may not delete a figure, raise the type
   floor, or drop a rule that carries meaning. The dial is `VISUAL_DENSITY 5` (was 8; the
   user overrode it: "太拥挤了"). Measured as `textRuns / pageHeight`, currently 0.0855.

## Layout

- Floating glass island top bar: sticky, `width: max-content`, fully rounded, detached from
  the top edge; full-width hairline bar on mobile.
- Desktop overview: two columns - a fixed **336px** account rail (account value, main pot +
  snapshot KPIs, context strip, allocation treemap, see-all, history) on the left, the
  instrument canvas (head, chart, holding detail, portfolio analytics, holdings table) on the
  right. The rail is narrower at 1180px (306px); below 980px it is a single column in DOM
  order - rail first, then canvas.
- **The canvas is the taller column, and the rail stretches to meet it.** It used to be the
  other way round, which is why the rail carried `align-items: start` and ended wherever its
  content ended. Once the two analytics panels moved into the canvas that stopped being true,
  and an unpinned legal notice floated in the middle of the page. `.cockpit-left-pane` now
  stretches to the row height and `.cockpit-pane-footer` takes `margin-top: auto`, so the
  history pill and the BaFin notice sit on the page's bottom edge, aligned with the canvas.
- Rail order: account value, main pot + snapshot KPIs, portfolio context, pending orders
  (only when the API returns any), allocation treemap, actions. Blocks are separated by 40px,
  matching the canvas rhythm.
- Canvas order: selected holding head, price chart with Trading 212 fills, holding metrics,
  portfolio analytics (P/L contributors + instrument-currency exposure, side by side and
  separated by one hairline), holdings ledger.
- Detail order: selected holding head, price chart with Trading 212 fills, holding metrics,
  trade history.
- The analytics pair is two bare bands, not two cards: they sit directly on the canvas with a
  single vertical hairline between them, because the ledger plate below is the only boxed
  thing in that strip. They split 1.62fr / 1fr (1.4fr / 1fr at 1180) and collapse to one
  column at 980, where the hairline turns horizontal. Their first rows share a baseline,
  because `.bar-row` and `.exposure-summary > div` both use 12px of vertical padding over one
  hairline.

## Data model and metric roles

| UI surface | Source fields |
| --- | --- |
| Account value | `analytics.totalValue`, `analytics.unrealizedProfitLoss`, `analytics.unrealizedReturnPercent` |
| Cash widget | `analytics.availableCash`, `cashInPies`, `reservedForOrders` |
| Snapshot KPIs | `positionMarketValue`, `totalCost`, `realizedProfitLoss`, `fxImpact` |
| Context strip | `positionCount`, `piePositionCount`, `availableCashWeightPercent`, `top3WeightPercent` |
| Investments | `positions[]`, `walletImpact`, `quantity`, instrument metadata |
| Allocation | `analytics.allocation[]` with value, weight, cost, P/L, FX impact, return |
| P/L contributors panel | `analytics.allocation[]` ranked by `\|unrealizedProfitLoss\|`, top 6 plus an explicit tail row |
| Currency exposure panel | `analytics.currencyExposure[]` (value, weight, `positions`), top 6 plus an explicit tail row; below four currencies it renders the compact key/value list instead of bars |
| Pending orders | `pendingOrders[]` |
| Price chart | Yahoo Finance `MarketSeries.candles[]` |
| Trade markers/history | Trading 212 `HistoricalOrder[]`, `CashTransaction[]`, `Dividend[]` |

## Chart contract

- Primary question: how has the selected instrument moved over the requested range, and where
  did Trading 212 fills occur?
- Single-series time line with separate buy and sell markers; buy is an up-arrow in green,
  sell is a down-arrow in amber, so the distinction survives colour-blindness. The legend
  draws those two arrow shapes, not an approximation of them.
- Keep date range, interval, currency, source, and fill count visible near the chart. The
  cockpit chart is `compact` - it drops the full heading, the price repeat and the reset
  button, but it keeps one meta row with the legend, the interval and the in-range fill
  count. A chart whose markers have no legend is not compact, it is unexplained.
- Do not infer account performance from Yahoo prices; portfolio return always comes from the
  Trading 212 wallet impact.

## Component rules

1. Elevation is a decision, not a default: hero plates get `--sh-plate` / `--sh-float`;
   everything else sits on the canvas separated by rhythm and the single hairline.
2. Blue marks interaction and selection; ink marks structure; green/red only mark signed values.
   A measure bar filled by magnitude rather than by sign takes `--accent`, not `--pos`: a
   green bar next to "USD 73%" claims a gain the data never had.
3. Show metric labels, units, time scope, and source caveats close to the number or chart.
4. Hide balances through the existing privacy toggle; the masked state is styled deliberately
   (muted ink plus letter-spacing) and never leaks the hidden value into another label.
5. Disabled Buy/Sell controls stay visually honest and carry a read-only explanation.
6. Lucide outline icons at 1.5px or less; SVG and chart marks carry quantitative distinctions.
7. Every figure uses `font-variant-numeric: tabular-nums`.
8. All Chinese/English copy continues to use `tx(zh, en)` and locale-aware money/date formatting.

## Verification

```bash
pnpm typecheck
pnpm build
NODE_OPTIONS='--localstorage-file=/tmp/dsh-trading212-localstorage.json' pnpm test
```

The independent preview is generated from the same `src/app/styles.css` used by the React
application. Measured with headless Chromium at 15 widths (375 → 1920) x 5 pages x light and
dark, plus every harness profile (default, rich, multi-currency, empty, error, disconnected,
no-logo): **0 contrast failures, 0 page-level horizontal overflow, 0 element overlaps, 0 text
clipped by a hidden axis, 0 type below 12px, 0 bar fills escaping their track, 6 type sizes,
4 radii, 1 hairline, 2 shadows, 1 easing curve.**

Two things the preview must keep doing, both of which it stopped doing at some point and
which the CSS-only regeneration check cannot catch, because they live in markup rather
than in the stylesheet:

1. **Wrap the page in `<main class="workspace">`.** That element, not the cockpit layout,
   carries the 104px offset (132px on phones) that clears the fixed top bar. Without it the
   account card and the instrument head render underneath the bar.
2. **Do not invent sections, and do not contradict yourself.** `cockpit-ai-prompt-strip` and
   `cockpit-ai-analysis-card` were styled in the stylesheet and rendered by nothing; they are
   now deleted, and `cockpit-sub-analytics-grid` is rendered by `App.tsx`. Anything styled but
   unrendered must not appear in the preview, and the numbers the preview does show must
   reconcile with each other — one screen once carried three different answers to "top-three
   concentration", and the currency panel claimed six holdings in a five-holding account.
   **One section still violates this:** `.cockpit-investments-section` (the 投资组合 positions
   stream, 68 lines of stylesheet across 9 selectors plus 11 shared-selector references, and
   53 lines in each preview body) is rendered by no `.tsx` file — the rail uses the allocation
   treemap instead. It is recorded here as an open decision rather than deleted unilaterally.

A ranked list that shows only its head is a claim about the tail. `BarList` sizes every bar
against the largest row rather than against the total, so a truncated list still looks
complete; both analytics panels therefore fold the remainder into an explicit `其他 N 项` row
instead of cutting at six and printing nothing.

The bar track is the bar's scale, so it is `--hair`, not `--well`: `--well` on `--canvas` is
1.06:1 and on `--surface` 1.13:1, i.e. declared and invisible, which leaves the fills reading
as floating strokes rather than as measures. `--hair` clears ~1.2:1 on both grounds.

Known open item, pre-existing and out of scope for the analytics pass: between 981px and about
1090px the overview's compact holdings ledger needs up to 86px of horizontal scroll inside
`.table-scroll` (43px at 1024), so its last column is cut until the reader scrolls. It is a
scroll container, not a clip, so the overflow gate does not see it. Reducing the cell padding
from 12px to 8px in that band recovers 40px and is not sufficient on its own.
