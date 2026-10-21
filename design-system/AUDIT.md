# UI audit — what made it look unprofessional

Measured with headless Chromium (Playwright, channel `chrome`) against
`preview-redesign.html` generated from `src/app/styles.css` at the commit before
this pass (`git show HEAD:src/app/styles.css`), at 1440 / 1024 / 390, in both
themes. Screenshots: `shots/before-1440-light.png`, `shots/after-1440-light.png`,
`shots/before-1440-dark.png`, `shots/after-1440-dark.png`.

---

## Summary

| Signal | Before | After |
| --- | --- | --- |
| Type sizes in use | **10** (40 / 26 / 22 / 18 / 17 / 14 / 13 / 12 / 11.5 / 11) | **6 tiers** (40 / 26 / 20 / 16 / 14 / 12; the display tier ramps 32→40) |
| Smallest text | **11px** (`账户总价值`, 39 runs) | **12px** |
| Radius values | 4 declared, **55 elements on 18px** (`--r-pill: var(--r-4)`) | 5 (6 / 10 / 14 / 18 / 999), controls on 10 |
| Shadow recipes | 2 | 5 (three elevation levels + two inset) |
| Contrast failures, dark | **6** (1.33 – 3.13 : 1) | **0** |
| Contrast failures, light | 0 | 0 |
| Duplicate section titles | **2× "投资组合"** | 0 |
| Page height @1440 | 1952px | **1634px** (−16%) |
| Page height @390 | 4251px | **3459px** (−19%) |
| Sections rendered by no `.tsx` | 1 (`cockpit-investments-section`, 458px tall) | 0 |
| CSS classes pointing at no markup | 12 | 1 (`tv-lightweight-charts`, created by the chart library) |
| Appended override passes in `styles.css` | 3 (20.x / 21.x / 22.x, ~600 lines) | 1 remaining (page-specific, see SPEC §8) |
| Horizontal overflow @1440/1024/800/681/680/390 | 0 | 0 |

The UI did not look immature because it was ugly. It looked immature because it
was **inconsistent in ways a viewer feels but cannot name**: ten type sizes, five
of them within 4px of each other; fifty-five elements sharing one radius so
nothing had a shape language; two card grammars in one column; and the same five
holdings printed three times on one screen.

---

## 1. Type: ten sizes, four of them redundant

```
before 40 26 22 18 17 14 13 12 11.5 11
after  40 26 20 16 14 12
```

`22 / 18 / 17 / 13` were not steps, they were accidents: a heading at 22, a
section title at 18, a row value at 17, a table cell at 13. Adjacent sizes 1px
apart read as *misalignment*, not as hierarchy — the eye sees a mistake, not a
level. And 39 runs of text sat at 11px (labels, tile meta, table sub-values,
legal copy), below the documented 12px floor, which is the single strongest
"someone stopped maintaining this" signal in a dense UI.

**Fixed:** one scale, each tier owning size + line-height + tracking together.
Numbers are tabular with **zero tracking** — the old micro-label voice applied
`.045em` to everything, including digits, which is why columns of money never
looked aligned even when they were.

## 2. Shape: `--r-pill` was an alias for 18px

```css
--r-1: 6px; --r-2: 10px; --r-3: 14px; --r-4: 18px; --r-pill: var(--r-4);
```

Fifty-five elements resolved to an 18px radius — buttons, tabs, badges, cards,
chips. A 34px-tall button with an 18px radius is neither a rectangle nor a pill;
it is a lozenge. Five lozenges in a row is the visual grammar of a toy, which is
exactly the impression the top bar gave.

**Fixed:** `--r-pill: 999px`, and controls moved to `--r-2` (10px). Pills now
appear only where a pill is structurally correct: single-line badges, dots,
avatars, and the sliding thumb of a segmented control.

## 3. Surfaces: three card languages in one column

- Account plate: white, 20px radius, shadow **plus** an inset `::before` frame
  with its own radius (the "double bezel") — a card inside a card.
- Cash plate: grey well, no border, no shadow.
- Chart: a 6px canvas bezel *inside* a bordered card *plus* an inner shadowed
  panel — three nested surfaces for one chart.

The canvas (`#F8FAFC`) and the card (`#FFFFFF`) were 1.02:1 apart, so cards were
held up by shadow alone. On a light screen that reads as "floating pieces of
paper" rather than as a grid.

**Fixed:** canvas deepened to `#F1F4F9`; every card is `surface + 1px hair +
sh-plate`; both bezels deleted. Card edges are now legible with shadows off.

## 4. Colour: green everywhere, so green meant nothing

The account plate carried four green figures of equal weight (今日盈亏,
累计未实现, 已实现盈亏, 汇兑影响) plus a green treemap with five green tiles and
a green bar list. Green is supposed to assert "this number is positive"; when
60% of the numbers on screen are green, it asserts nothing.

**Fixed:** green/red stay on the number and nowhere else — tile fills dropped
from 100% pastel to a 7% tint with a 20% border, bar fills from a gradient to a
flat signal, and the nav's solid blue plate became a soft tint so the account
total is the loudest object on the page again.

## 5. Data honesty: the same five holdings, three times

The rail showed a positions list, then a treemap of the same five holdings, then
the canvas showed a table of the same five holdings. Two of those sections were
titled **投资组合**, stacked 40px apart.

Worse: the positions list is rendered by **no `.tsx` file** — it existed only in
the preview markup. The preview was 458px taller than the product and duplicated
a section the product does not have.

**Fixed:** the stream is gone from both preview bodies and its 60 lines of CSS
deleted; the allocation mosaic — which the app does render — absorbed the freed
height; the mosaic is retitled 资产配置, matching `App.tsx`.

## 6. The chart was the weakest element on the page

- Legend said "▲ 买入 / ▼ 卖出"; the chart drew **squares**. The legend had been
  rewritten twice into shapes the series does not contain.
- A dashed line ran across the top of the plot with no legend entry and no
  meaning.
- The plot began 72 units into an 820-unit viewBox, leaving an ~84px dead gutter
  on the left while the price scale sat on the right, colliding with the last
  point.
- Three stacked rows of 12px prose above the data ("可拖动底部滑块或双指缩放"),
  which is a manual, not a chart header.
- The price appeared twice within 40px: once in the instrument head, once in the
  chart header.

**Fixed:** legend swatches are the marks the series draws (line / square /
triangle); the dashed line is now the average cost at `$167.44` and is labelled
in the legend; the plot starts at the plate's padding; header collapsed to one
meta row (legend left, interval + fill count right) — the form `App.tsx` already
used, so the preview stopped contradicting the app.

## 7. Ranked bars: the measure had no scale and no direction

Each row was its own grid, so the value column was sized per row; the track was
`--hair` (≈1.2:1, effectively invisible); and a **loss was drawn as a red bar
growing rightwards**, identical in direction to a gain. Sign existed only in
hue.

**Fixed:** fixed 104px value column, `--hair-strong` track, 8px flat fill, and
losses grow **leftwards** from the zero point at the right edge — the sign now
survives greyscale and colour-blindness.

## 8. Dark theme had six contrast failures

```
账户                 1.85 : 1
AP                   2.26 : 1
Apple Inc.           3.13 : 1
27.4000 AAPL         2.26 : 1
€5,428.10            3.13 : 1
+€840.60 (+18.3%)    1.33 : 1   ← green text on the dark selected-row tint
```

All six sat inside the **selected** position row, where `--pos` green landed on
`--accent-soft`. Dark `--accent-soft` was `rgba(59,130,246,.16)` — a blue tint
that, composited over `#090C10`, is nearly black, so the green died.

**Fixed:** dark `--accent-soft` is a solid `#1B2A4D`, and the tile meta moved to
`--ink-2` on tinted grounds (ink-3 clears 4.9:1 on the plate but only 4.49:1 on a
7% tint). Both themes now measure **0 failures** across every text node.

## 9. Mobile: the subject arrived on the third screen

Below 980px the rail stacked as one block above the canvas, so a phone showed
account → cash → four facts → 420px mosaic → *then* the chart the page is about.
The mobile page was 4251px tall.

**Fixed:** at ≤980 the rail dissolves (`display: contents`) and its children are
ordered around the canvas — account total, cash, four facts, chart, allocation.
Page height at 390 is now 3459px, and the chart appears in the second screen.
The top bar also lost a third row that rendered as an empty white capsule.

---

## Second pass — the five items left open the first time

### 10. Quantities printed as `27.4000`

Four decimals is correct as a ceiling (0.0001 of a share is a legal position) but
wrong as a fixed width: `27.4` shares printed as `27.4000`, in the instrument
metric row, the holdings ledger and the mosaic tooltips. It reads as a number
that has not been rounded by anyone.

**Fixed:** one `shareCount()` formatter in `App.tsx` (Intl drops the zeros), 18
call sites converted, and the preview's hard-coded counts corrected with it. The
count no longer has a per-call-site digit count to disagree with.

### 11. Two currencies in one block, unlabelled

```
$198.17
+€440.17 (+4.30%)
```

The quote is in USD, the return is in EUR, and nothing said so. On a page whose
whole job is money, that reads as a bug in the arithmetic.

**Fixed:** one micro line under the price — `报价 USD · 收益折合 EUR` — shown only
when the two currencies differ, so EUR-listed instruments get no extra chrome.
The `只读账户` chip moved from under the price into the identity row at the same
time: it is account state, and stacked under the delta it turned the number block
into four lines of unrelated text.

### 12. The display tier was flat at 40px

`--fs-hero` jumped from 32 (mobile) to 40 at 681px and stayed there. At 700px the
account plate is 642px wide and the hero was 40px — a desktop number in a phone
card, which is a hierarchy error even when it does not overflow.

**Fixed:** `clamp(32px, 2.4vw + 16px, 40px)` with a matching line-height ramp, so
681–1000px gets 32.3 → 40 instead of a step. The endpoints stay on the scale, so
the ramp never invents a size above the tier.

### 13. The account plate was 422px wide inside a 755px column

Between 681 and 980 the layout becomes a flex column, but `align-items: start`
from the desktop grid came with it. Every plate therefore sized to its own
max-content: at 800px the account plate measured **422.4px inside a 755.2px
column**, and the single-column layout read as a narrow card floating left.

**Fixed:** `align-items: stretch` on the mobile flex column. All six plates now
match the column width at every width below 980.

### 14. The chart heading repeated the live price

`$198.17` appeared in the instrument head and again in the chart heading 60px
below, each with its own `+4.30%` — one the total return, one the 1-year change.
Two identical numbers with two different meanings is the most expensive kind of
duplication.

**Fixed:** the heading keeps the range change and names the range (`+4.30% 1年`).

### 15. Twelve CSS classes described components that no longer exist

`pos-stream-item`, `pos-stream-ident`, `pos-stream-num-col`,
`cockpit-investments-section`, `investments-header`, `invest-metric-row`,
`page-header`, `history-header`, `settings-header`, `inst-title-sub`, `toast`,
`toast.failed` — all referenced by no `.tsx` and no preview body.

**Fixed:** deleted, including their entries inside shared selector groups. The
only unreferenced class left is `tv-lightweight-charts`, which the chart library
creates at runtime. CSS is 61.18 kB (from 62.03 kB).

---

## Third pass — the palette

The first two passes fixed type, shape, spacing and contrast, and still kept the
original hue plan: a blue-grey canvas, a royal-blue accent, a blue-black ink and
a mint/salmon pair in dark. That combination is the default dashboard palette —
a viewer reads it as a template before parsing a single number. Measured at 100%
zoom, the page had **five hues at similar saturation** (canvas, accent, chart
line, gain, loss) and no hierarchy between them.

| Role | Before (light / dark) | After (light / dark) |
| --- | --- | --- |
| `--canvas` | `#F1F4F9` / `#0B0F15` | `#EAEBEC` / `#0B0B0D` |
| `--surface` | `#FFFFFF` / `#121821` | `#FFFFFF` / `#151619` |
| `--well` | `#F7F9FC` / `#1A212C` | `#F4F5F6` / `#101114` |
| `--ink-1` | `#121822` / `#F3F6FA` | `#17181A` / `#F2F3F5` |
| `--ink-3` | `#66707F` / `#8590A2` | `#63686F` / `#888D94` |
| `--accent` | `#2B57D6` / `#7C9DF7` | `#2C3E63` / `#9FB0CE` |
| `--accent-plate` | `#2B57D6` / `#3A63E0` | `#181A1D` / `#E7E9ED` |
| `--pos` | `#0B6547` / `#35C08B` | `#1B5E48` / `#5FB78F` |
| `--neg` | `#B03028` / `#F1797F` | `#9E3B31` / `#D98A80` |
| `--hair` | `#E3E9F2` / `#232B38` | `#E3E4E6` / `#26282C` |

Four decisions did the work:

1. **The ground went neutral.** The canvas lost its blue cast (`#F1F4F9` →
   `#EAEBEC`) and got one step deeper, so white plates read as objects rather
   than as a page with slightly-off white space. Nothing else on the page changed
   value, and the cards stopped looking pasted on.
2. **The accent became ink.** `#2B57D6` is a link blue; at `#2C3E63` (chroma
   ≈ 0.09) the accent reads as dark ink that happens to be blue. It can carry the
   chart line and the selection border without competing with the hero figure.
   The one filled control (primary button) is now `--accent-plate: #181A1D` —
   ink, not accent, in light and bone `#E7E9ED` in dark.
3. **The money hues were desaturated.** Pine `#1B5E48` and terracotta `#9E3B31`
   replace the forest/brick pair; in dark, sage `#5FB78F` and dusty `#D98A80`
   replace mint and salmon. They still separate in greyscale, and forty rows of
   them no longer shout.
4. **The dark depth order was inverted — a real bug.** `--well` was *lighter*
   than `--surface` (`#1A212C` vs `#121821`), so every "recess" in dark was
   drawn as a raised plate, including the segmented-control thumb, which sat
   darker than its own track. `well` now sits between `canvas` and `surface` in
   both themes: `#0B0B0D` < `#101114` < `#151619`.

Two smaller cleanups fell out of it: the duplicated `[data-theme="dark"]` token
block in `styles.css` §21 is gone (dark roles are declared once, in §01 — the
drift check could only ever see the first copy), and the chart's price-label
background is a real token now instead of an undefined `--chart-price-label-bg`
falling back to `#2563EB`, which put a stray royal blue on the chart.

Measured after the change: **0 text runs below WCAG AA** at 1440 and 390 in both
themes (187 runs each), `ink-3` at 4.70:1 on the canvas and 5.61:1 on white,
six type sizes and five radii unchanged.

---

## What still needs markup work

Recorded in `SPEC.md` §8 rather than fixed, because each needs a product decision
or live credentials, not a stylesheet:

1. Three late CSS passes for setup / history / settings / dialogs remain, plus
   three competing declarations of `.shortcuts-modal-grid` and `.history-metrics`.
   They are ordered overrides, not duplicates — merging them changes the cascade
   for equal-specificity rules in between — so each has to be folded into its
   owning section as that page is touched.
2. The preview body is a hand-written replica of `App.tsx`, and it stacks
   compositions the product never stacks (instrument head + non-compact chart).
   The durable fix is rendering the preview from React with fixture data.
