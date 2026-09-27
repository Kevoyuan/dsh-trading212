# UI redesign - "Lumen" system

## What was wrong

The interface read as amateur because `src/app/styles.css` had become **2937 lines of 11 stacked
redesigns overriding each other**: Carbon Ledger dark, T212 navy, a "quiet refinement", a frosted
glass island, a bento pass, a "High-End Button System", a density pass, a shortcuts HUD, and a dark
patch. Each layer beat the previous one, so the product contradicted its own rules and had no
consistent system left. Measured with headless Chromium at 1440 and 390:

| Signal | Before | After |
| --- | --- | --- |
| Distinct type sizes | 18 (ten of them inside a 4px band, incl. 9px) | **6** |
| Text below 12px | 18 elements (9px minimum) | 0 |
| WCAG AA contrast failures | 31 light, 62 dark (worst 2.28:1 on every holding return) | 0 |
| Distinct border radii | 9 | 4 |
| Hairline variants | 10 | 1 |
| Box-shadow variants | 8 | 2 |
| Grid gap / padding values | 18 / 40 | 6 / on-scale |
| Transition easings / durations | 12 / 12 (incl. browser-default `ease`) | 1 / 2 |
| Decorative gradients | 6 | 0 |
| `backdrop-filter` elements | 2 (rules claimed to ban glass) | 1, fixed elements only |
| Card-like containers | 44 | 15 |
| Stylesheet | 2937 lines, 11 layers | 1428 lines, one system |
| CSS bundle | 103.0 kB (17.9 kB gzip) | 56.6 kB (10.2 kB gzip) |

## What changed

- **One design system replaces eleven.** A single token block drives colour, type, radii, spacing,
  elevation, and motion; numbered sections and no override layers.
- **Colour recalibrated.** Pure-white plates removed, a cool blue-cast neutral ramp installed
  (four steps instead of six near-identical greys), the accent desaturated from 90% to 63%
  saturation, and both ambient shadows tinted to the canvas hue instead of neutral near-black.
  Since green and red are reserved for signed finance, every pair was re-derived to clear
  **4.5:1 on the canvas, on the plate, and on the inset well** - the old green managed 2.28:1 on
  the numbers that matter most.
- **Type scale installed.** Seven sizes (12 / 14.5 / 17.5 / 21 / 25.5 / 31 / 40) replace eighteen.
  The `13.3333px` that appeared on 55 elements - a browser default leaking through unstyled
  markup - is gone, as are all nine- and ten-pixel labels.
- **Elevation is now a decision.** Two hue-tinted ambient levels plus a single hairline replace
  eight near-identical shadows and forty-four bordered cards.
- **Every surface was extended, not just the overview.** Setup and connection, error, empty,
  loading, dialog, toast, shortcuts modal, history, settings, help, and instrument detail were
  all restyled in the same vocabulary. Screen states the old sheet never covered now exist.
- **Mobile and both themes are real.** Light and dark both verified at 1440 and 390; the layout
  collapses to a single column, the top bar becomes a full-width hairline bar, and settings rows
  stack rather than squeezing their text column.
- **Reduced motion and reduced transparency are honoured**, with a solid fallback for the glass
  top bar.
- **Two layout bugs found and fixed along the way**, both caused by implicit `auto` grid tracks
  sizing to a table's max-content width: `.workspace` was grouped with the inner page rules and
  became a grid with no definite track, which let the holdings table widen the whole document to
  881px on a 390px viewport. `.workspace` is now a plain block stack and `.table-scroll` has an
  explicit scroll contract.

## Data integrity notes

The redesign is presentational only. No API contract, request path, data field, privacy behaviour,
read-only affordance, or copy string was changed. Both standalone previews are regenerated from
the same `src/app/styles.css` the application uses. No API key, secret, live account value, or
real position appears in any preview, fixture, or screenshot.

## Verification

```bash
pnpm typecheck   # pass
pnpm build       # pass
NODE_OPTIONS='--localstorage-file=/tmp/dsh-trading212-localstorage.json' pnpm test   # 34 tests, 8 files, pass
```

Plus an automated visual audit run with headless Chromium over **20 cases**: overview, holdings,
history, settings, help, setup, error, empty, pending-order, and both themes at 1440 and 390.
Each case checks type scale, measured WCAG contrast per text/background pair, radius / hairline /
shadow / easing / duration counts, spacing scale, decorative gradients, backdrop-filter
containment, element overlap, and horizontal overflow.

**19 of 20 cases clean.** The one remaining item is a 4px inner text-run overflow in a single
settings row at 390px (a full-width CJK bracket run needing 192px in a 188px column). The page
itself does not overflow (`scrollWidth === clientWidth === 390`), nothing is clipped, and
contrast, overlap and gradients are all zero. It is cosmetic and tracked here rather than hidden.

## Reference

The information hierarchy still follows the Trading 212 product language. This is an inspired
implementation for dsh, not a copy of Trading 212's proprietary UI.

## Beautify pass - first viewport composition and the type ladder

Measured at 1440x900 on the shipped build, the composition contradicted DESIGN.md: the
portfolio total (40px) sat in a 336px rail while a single instrument's price (31px) held the
centre of an 817px canvas, and the instrument price sat 28px higher on the page, so the eye hit
one stock before it hit the account. Separately the type ladder held seven steps, of which the
31px tier served only the rail price and sat just **1.29x** from the hero - two different
currencies and magnitudes competing at nearly the same weight.

Three real composition variations were rendered and measured over the same DOM
(design-demos/first-fold.html), all passing the system gate. The chosen one (**V1 - Balanced**)
was landed **in place** in src/app/styles.css, not as an appended override:

- The 31px tier is retired as a content size and survives only as --fs-hero-sm, the mobile hero.
- The rail price drops to the 25.5px tier and the instrument name to 21px, so price still outranks
  name and neither competes with the account. The hero gap widens from **1.29x to 1.57x**.
- Hero tracking tightens from -.022em to -.034em.
- The instrument detail page gets its own single hero: its price now takes the 40px tier, because
  that page's subject is that instrument.

Resulting ladder, both themes and both widths: **12 / 14.5 / 17.5 / 21 / 25.5 / 40** desktop and
**12 / 14.5 / 17.5 / 21 / 25.5 / 31** mobile - six steps, one hero.

**What was deliberately not landed.** The measured V1 variant also carried about eight cosmetic
deltas; they were dropped on review and the reasons are recorded rather than hidden: label
letter-spacing and ink changes were no-ops (the single micro-label rule already sets 12px, ink-3
and .045em) and splitting them would have broken the one-micro-label-voice rule; promoting the
cash figure to 25.5px would have moved it *closer* to the hero, working against the goal; extra
card and panel padding would have pushed portfolio content further down a rail that the fold
measurement shows is already height-constrained; and a fixed chart height conflicts with the
aspect-ratio: 820/250 rule that keeps the series proportional at every width.

**One recorded failure.** Reordering the rail with the order property to pull the allocation
mosaic above the fold measured **worse** (first-fold complete blocks 5/10 -> 4/10): the account
card (254px) plus the cash block (231px) already consume 548px of a 900px fold, leaving about
190px against blocks of 341px and 311px. Size, not order. Reverted.

Verification after the pass: typecheck pass, build pass, 34 tests pass, and 21 of 22 visual audit
cases green (the remaining item is the pre-existing 4px inner text run in one settings row at
390px, unchanged by this pass).

## Motion layer, and three selector bugs it surfaced

Four motions were added, each with a stated job, all transform/opacity only, all cancelled under
prefers-reduced-motion:

1. **The segmented-control indicator slides.** The range switcher already rendered a thumb whose
   transform is measured in JS, but it snapped between positions. Every label is flex: 1 1 0, so
   the thumb width never changes between ranges: only transform animates, with no layout work.
   Job: state transition.
2. **Privacy masking eases.** The eye toggle blurs every balance; it now resolves over one beat
   instead of snapping. Job: feedback on a deliberate act.
3. **Skeletons replace content spinners.** The chart loading box already occupies the incoming
   series' exact shape, so it is now the skeleton (a pulsing plate) instead of a centred spinner;
   the portfolio loading state gets two shaped blocks. Job: feedback without a layout stand-in.
4. **One pixel of hover travel** on the two elements that select content (invest rows, mosaic
   tiles). Job: pointer feedback.

**Scroll-driven animation was deliberately rejected.** animation-timeline: view() would let the
weight bars draw themselves as the allocation section enters the viewport, which is the one motion
this product's subject really earns (its motif is position weight, encoded four times). It was
not shipped: with fill: both the element sits at the from-state, scaleX(0), until its view timeline
advances, and a view timeline does not advance when the nearest scroll container is the host panel
or an inner overflow region. The failure mode is invisible data rather than a missing animation,
and a full-page screenshot cannot distinguish the two. Static bars are the honest choice.

### Bugs found and fixed while doing this

The `.language-setting > div` and `.settings-row > div` selectors were over-broad: they also
matched `.language-options`, the segmented control. Three consequences, all fixed:

- the segmented control was given a 240px flex basis at every width;
- it was forced to `display: flex; flex-direction: column`, so the theme and language controls
  were rendering as **vertical stacks** instead of side-by-side rows (the probe confirmed
  `dir=column` at both 1440 and 390; it now reports `dir=row`);
- the phone-width rule was fighting itself, which is why an earlier stacking fix silently did
  nothing: it was overridden later in the file at equal specificity. It is now scoped through
  `.settings-page`, and the settings page dropped from 1163px to 1084px once the corrupted
  control stopped inflating its row.

### The 4px settings overshoot — root-caused and closed

At 390px one settings paragraph reported `scrollWidth 192` against `clientWidth 188`. It had
survived five attempts across earlier passes (CJK `line-break: anywhere`, `word-break: break-all`,
scoping, `min-width: 0`, `text-wrap`, `flex-basis`, an explicit `width: 188px`). What finally
located it was measuring the line boxes instead of the box:

| probe | result |
| --- | --- |
| `Range.getClientRects()` | **one** line box, 192px wide, inside a 188px box |
| `width: 150px` | wraps correctly → 144 + 48 |
| `width: 188px`, `width: 100%`, `flex: 0 1 100%`, `text-wrap: balance`, `align-self: stretch` | no change |
| parent | `display: flex; flex-direction: column` — the caption is a column-flex item |
| `padding-right: 4px` | **`scrollWidth 188 === clientWidth 188`**, wraps to 180 + 12 |

The caption was being line-broken against its column-flex track rather than its own box, so the
break never happened; a 4px end gutter gives the breaker the room it needs. `line-break: anywhere`
— the previous attempt, still in the file and still doing nothing — is removed, since it also
permitted breaks inside Latin words. The visual audit is now **22/22 green** for the first time.

## Pass 9 — de-density (user: "太拥挤了")

The user's second visual correction, and an override of the declared `VISUAL_DENSITY 8`. No new
direction was run: this is iteration after an approved direction, which the three-draft gate
exempts (see `design-work/direction-approved.md`).

Measured at 1440×900 on the live app, before and after:

| | before | after |
| --- | --- | --- |
| page height | 1496px | 1649px |
| rail width | 336px | **380px** |
| rail content height | 1106px | 1259px |
| elements | 396 | **396** |
| text runs | 141 | **141** |
| bordered elements | 36 | 35 |
| account plate | 254px, 20px pad | 269px, 24px pad |
| cash well | 231px, 18px pad | 265px, 24px pad |
| asset allocation | 370px | 438px |
| rail / canvas height | 1.11 | 1.23 |

Elements and text runs are **identical**. Not one figure was removed. Density as
`textRuns / pageHeight` went 0.0943 → 0.0855: **9.3% fewer competing text runs per screen**,
bought entirely with area.

What changed — information-preserving only:

1. **The fake-precision measure bars are gone.** `.sub-metric-block::before/::after` drew two 3px
   bars at hardcoded `42%` and `86%` under the hero metrics. Four bars that encoded no data and
   tracked no field — data slop, not detail.
2. **Four internal rules → one.** The portfolio snapshot ruled a hairline under every metric pair.
   It is now one rule above the snapshot with the four pairs on 22px of open air.
3. **The rail keeps the canvas's rhythm.** The rail ran 28px between blocks against the canvas's
   40px; both are 40px now, and the 1180px breakpoint follows (22 → 28px).
4. **The rail was too narrow to be comfortable.** 336 → 380px (mid breakpoint 306 → 340px). Every
   card in it gained ~13% of width, which is why the footer's legal paragraph fell 86 → 68px.
5. **Padding on scale, not literals**: the 20px and 18px plate insets became `--s-6` (24px), and
   the three wide canvas panels went to 24px with their row rhythm 16 → 22px.
6. **The mosaic was the densest block in the app**: 232 → 300px tall, tiles inset 3 → 4px.

Step 6 then broke something, and the probe caught it: at 18px of tile padding the two smallest
tiles put 8px and 18px of content outside their plates. Rather than flatten the inset again,
`.treemap-rect-slot` is now a size container — the base tile inset is the floor the smallest tile
can carry, and `@container (min-height: 111px)` graduates larger tiles to the full 18px plate
inset. Verified across five tiles from 65px to 148px: `overflowBottom 0` on every one.

Rejected: buying room by dropping the tile-level weight and day P&L. Both are already encoded
(weight by area, direction by colour plus a glyph), but the user reads them, and rule 7 of
`DESIGN.md` forbids paying for space with information.

Verification after the pass: `pnpm typecheck` clean · `pnpm build` clean (CSS 58.21 kB / gzip
10.43 kB) · **34 tests pass / 8 files** · visual audit **22/22 green** across overview, holdings,
history, settings, help, setup, error, empty, rich, nologo-fallback and dark × 1440/390 ·
`pageOverflowX = 0`, `clippedCount = 0`, `minFont = 12px` at both widths.

## Pass 10 — compactness and the chart (user: "不够紧凑，tradingview太小")

Pass 9 read "too crowded" as a spacing problem and paid for space by inflating padding and
widening the rail. That was the wrong lever: it made the page 153px taller and took 56px of width
away from the chart. The user's next note flipped the verdict — not compact enough, and the chart
is too small. Both complaints have one cause, and it was not taste. It was five layout defects.

### What the measurement found

**1. The page paid its top offset twice.** `.workspace` and `.t212-cockpit-layout` both carried
`padding: 104px 36px 40px` to clear the fixed topbar. The topbar ends at y=72. Content started at
y=208 — 136px lower than it needed to. On phones it was worse (104 + 126 = 230), because the
layout had a second, larger offset for the wrapped topbar that never applied on its own.

**2. The whole app was shrink-to-fit.** `.workspace` is a flex item of `.app-shell` and carries
`margin-inline: auto`. On a flex item that switches the box from stretch to shrink-to-fit, so every
page sized itself to the widest max-content inside it — the holdings table. At 1440 the page was
1321px wide instead of 1368, with two dead gutters, and the cockpit canvas was pinned to 813px by a
table's max-content. Adding `width: 100%` (the `max-width` + auto margins still centre it on
ultrawide) gave the canvas 191px back.

**3. The page gutter was paid up to three times on phones.** `.workspace` 36px + `.t212-cockpit-layout`
14px on the cockpit, and `.workspace` 36px + `.content-page` 36px on settings. The settings page had
**246px of usable width on a 390px screen** — 63%. A nested page container now adds no gutter.

**4. Content overlapped the topbar by 6px on phones.** The wrapped topbar is 96px tall and ends at
y=110; zeroing the duplicated offset left content starting at 104. The phone top offset is now 132.

**5. The instrument head hit the `1fr` + `auto` trap.** `.cockpit-inst-head` stayed a two-column grid
on phones. Its `auto` second column took the price block's 266px max-content first, so the
`minmax(0, 1fr)` first column absorbed the whole shortfall: the instrument profile was squeezed to
70px against its 111px min-content and its text spilled out. The head stacks below 680px now. This
one was introduced by defect 3's fix — the audit caught it, and it is recorded here rather than
quietly patched.

### The chart

The chart is TradingView Lightweight Charts v5 with `autoSize: true` inside `.price-chart`, whose
height comes from `aspect-ratio`. So its size is a pure function of the pane width: widening the
rail and inflating the panel's padding shrank it directly.

| | Pass 9 (rejected) | now |
| --- | --- | --- |
| cockpit canvas width | 813px | **1004px** |
| chart element | 751 × 229px | **962 × 352px** |
| TradingView canvas | 672 × 202px | **884 × 324px** |
| chart area, % of 1440×900 viewport | 13.3% | **26.1%** |
| chart area | 172k px² | **338k px² (+97%)** |
| chart at 390px | 248 × 220px | **316 × 220px** |
| first content row starts at | y=208 | **y=104** |
| rail column height | 1480px | **1348px** |

The rail figure understates the change: the later measurement also carries a 181px
pending-orders block that the earlier one did not, so like for like the rail lost more than 300px.

Three changes did it: `.price-chart` from `820/250` to `820/300` with a `min-height: 220px` floor
(so a phone gets a chart with vertical resolution instead of a 117px strip), the chart panel's
padding back to 14px with its row rhythm at 10px, and the container fixes above.

### Kept from Pass 9

The parts of Pass 9 that were about clarity rather than space survived: the four fake-precision
bars under the hero metrics are still gone, the portfolio snapshot still uses one rule instead of
four, the tiles still take their inset from a size container, and the 4px settings overshoot is
still fixed. Pass 10 reverts the inflation, not the legibility work.

### Verification

`pnpm typecheck` clean · `pnpm build` clean · **34 tests pass / 8 files** · visual audit
**22/22 green** · `pageOverflowX = 0`, `clippedCount = 0`, treemap tile overflow `0`,
`minFont = 12px`, no sub-12px text, at 1440 and 390, on the default and rich profiles.
## Pass 11 — the ground (user: "背景灰色不好看")

`design-taste-frontend` is explicit in §13 that dashboards are out of scope, so only its colour
rules were applied: §4.2 (one palette, no warm/cool mixing, one accent), §4.11 (page theme lock),
and §11.D lever 3 (colour recalibration). No layout, type, or motion vocabulary was imported.

### What was actually wrong

`--canvas #EAEDF5` sits at roughly 1.5% chroma. That is a grey, not a tint. The palette also held
**three cool near-whites inside a 9% lightness band**, with the page ground in the middle of the
elevation stack: well 89%, ground 93%, plate 99%. So the ground was darker than the plates but
lighter than the wells, which reads as muddy rather than as depth.

### Three grounds, rendered before choosing

| | ground | well | hair | worst ink pair |
| --- | --- | --- | --- | --- |
| A air (near-white) | `#F4F6FC` | `#EBEFF8` | `#DCE3F0` | 5.32:1 |
| **B tint (applied)** | `#E5EAF6` | `#DCE3F1` | `#CFD8E8` | **4.76:1** |
| C deep | `#DFE5F3` | `#D6DEEE` | `#C8D2E4` | 4.54:1 |

All three pass WCAG AA on every ink/background pair. B was chosen because it keeps the plate lift
(A nearly erases it, which would flatten a dense dashboard) while moving the ground off grey and
onto the accent's hue, and it keeps a real contrast margin. A and C are rendered side by side in
`.design-work/bg-compare/` so reversing the call costs one word.

### The regression it exposed

Darkening the ground pushed 12px accent text on a well plate to **4.45:1**. It had been at 4.51:1
before, so it was always one shade from failing. The fix is a token correction, not a lighter
ground: that control belongs to `--accent-deep` (`#234AA3`, 6.36:1), which is what "accent ink at
micro size on a plate" should have been all along. The rule's hover state pointed at
`--accent-deep`, so it now points at `--ink-1` and the hover still reads as a change.

### A harness bug worth recording

Every "dark mode" gate in this project until now was measuring the **light** page. `--theme dark`
sets `data-theme` on `<html>`, but the app's theme store re-applies its own preference on the next
render, so the attribute was gone before the probe ran. The proof was in the output all along:
`bgAll` for `dark-1440` was byte-identical to `overview-1440`. `final-sweep.sh` now drives the real
Obsidian control in Settings and returns to the overview.

With the honest check, the overview in dark mode measures **424 elements, 0 contrast failures,
0 overflow, 0 overlaps** at both 1440 and 390, on backgrounds `#1A2030` / `#131824` / `#0B0E14`. Dark
mode is otherwise untouched: `--canvas`, `--well` and `--hair` keep their dark overrides.

### Verification

`pnpm typecheck` clean · `pnpm build` clean · **34 tests pass / 8 files** · **22/22 green** across
overview, holdings, history, settings, help, setup, error, empty, rich, nologo-fallback, and a
now-genuine dark × 1440/390.

## Pass 12 — chart default range + the occluded legend (user: "默认1周，有些部件有遮挡")

### The chart now defaults to one week

`useState<MarketRange>('1y')` appeared in both chart hosts: `CockpitInstrumentView` (the
overview canvas) and `InstrumentDetailPage` (the drill-down). Both are `'1w'` now, so the chart
opens on one week in either place.

The test needed a fixture correction, and the reason is worth writing down: the chart's aria-label
is built from `series.range` — the range the **API echoes back**, not the range the app requested.
The test mock returned a hard-coded `range: '1y'`, so after the default changed the rendered label
still said "1 year" while the request said one week. The mock's literal is now `'1w'`, matching the
new default, and the test asserts both the label ("1周") and the request (`'1w'`). I edited this
existing test rather than adding a new one because it encodes the old default as a spec; the
assertion is now stronger, not weaker.

### What was actually occluding things

A fixed **`.pro-shortcuts-hud`**: a 412x34 keyboard-shortcut legend pinned to the bottom centre at
`z-index: 50`. It sat on top of the holdings table and covered real content at rest, not just while
scrolling. Measured at 1440: four fixed-overlap hits (`TH » 资产`, `TH » 数量`,
`STRONG » NVIDIA Corp.`, `SMALL » NVDA · USD`) plus seven text-vs-text hits where the HUD's `kbd`
chips crossed table headers.

The root padding of `84px` existed only to "clear the floating HUD", so the app was also paying
dead space at the bottom of every page for a legend that covered data.

**Why my own audit had been reporting zero overlaps while the user could see them:** the overlap
gate only considered elements with a background or border, at least 60x30, **excluding anything
`position: fixed` or `sticky`**, and required the overlap to cover 30% of the smaller box. Every one
of those filters excluded this bug. The new occlusion probe checks three separate classes: text-leaf
vs text-leaf, anchored vs text-leaf, and clipped text — with no size or background pre-filter.

### The fix: stop floating chrome over data

- The floating legend is **deleted**, markup and CSS. Nothing floats over the table now.
- The keys are documented on the **Help page**, where a mouse user actually looks for them. The
  guide modal still opens with `?`.
- The `64px` root bottom padding and the `display:none` phone rule for the dead component are gone
  with it, plus two dead selectors (`.hud-pill` in the micro-label voice group and a
  `prefers-reduced-transparency` rule for `.shortcuts-hud-pills`).

Page height at 1440 dropped 1626 → **1542px**.

### Verification

Occlusion probe, 1440 and 390: text overlaps **7 → 0**, fixed-element overlaps **4 → 0**. The only
remaining `anchored` element is the top bar, whose space the layout reserves deliberately.

One residual entry in the clipped-text list is a false positive, and it was worth proving rather
than assuming: a `78x26` container inside TradingView's own chart DOM reports `scrollHeight 32`
against `clientHeight 26`. Its single child is a canvas measuring exactly `78x26` at `top 0` and
`bottom 26` — fully inside the box. Chromium reports an inflated `scrollHeight` on canvases; nothing
is clipped.

`pnpm typecheck` clean · `pnpm build` clean · **34 tests pass / 8 files** · **12/12 audit runs
green** (22 width-level gates, including a genuine dark pass).

## Pass 13 — the sweep I had not run (user: "你有检查不同屏幕的遮挡问题吗")

No. Every occlusion claim up to here rested on **two widths**: 1440 and 390. The app changes layout
at 1180, 980 and 680, and not one of those boundaries had been measured. That was the gap, and it
was hiding a real bug.

### Coverage now: 15 widths x 6 pages = 90 measurements

Widths chosen to straddle every breakpoint rather than to look like devices: 375, 414, 480, 600,
679, **681**, 768, 979, **981**, 1024, 1179, **1181**, 1280, 1440, 1920. Pages: overview, holdings,
history, settings, help, rich. Harness: `.design-work/occ-sweep2.sh` + `.design-work/occl2.js` +
`.design-work/show-sweep2.cjs`.

The first pass flagged 26 of 90 combos. Triage split them into one real bug and two false-positive
classes in my own probe.

### The real bug: the instrument head collapsed in the 981-1181 band

`.cockpit-inst-head{ grid-template-columns: minmax(0, 1fr) auto }` with
`.inst-profile > div{ min-width: 0 }`. The `auto` price column claims its 266px max-content first,
and the `1fr` column had **a floor of zero** — so the profile's text column measured **width 0** and
its text spilled straight over the price block. Measured overlaps:

| width | overlap | pair |
| --- | --- | --- |
| 981 | 45x26 | `inst-ticker-tag » AAPL · USD` vs `inst-price-main » US$198.17` |
| 1024 | 49x9 | `inst-title » Apple Inc.` vs `tone-positive » +1.4% 今日` |
| 1181 | 7x16 | `inst-title » Apple Inc.` vs `tone-positive » +1.4% 今日` |

Clean at 979 and at 1280, which is exactly why 1440 and 390 both passed: the bug lives only where
the 1180 rule narrows the rail to 306px and squeezes the canvas to 591-780px.

Fix: `minmax(min-content, 1fr)` on `.cockpit-inst-head` and on `.cockpit-instrument-container`,
and `min-width: min-content` on `.inst-profile > div`. A `1fr` track must never be allowed to
shrink below its content's min-content when the other track is `auto`; otherwise the `auto` track
wins and the text has nowhere to go but over its neighbour.

### Two false-positive classes in my own probe

1. **Intentional horizontal scroll.** `.table-scroll` is `overflow-x: auto` (the documented contract
   for wide tables) but `overflow-y: hidden`, so my check flagged it as clipped at every width under
   ~1180. The probe now only counts a **hidden** axis as clipping.
2. **Inline-wrapping union boxes.** Two inline elements wrapping inside one `<td>` (the history
   row's name and timestamp) each report a *union* bounding box, and the union overlaps whatever sits
   beside the first line. That is not ink overlap; it produced 4 phantom hits per narrow width on the
   history page. The probe now compares **per-line** rects via `getClientRects()`.

Worth stating plainly: the earlier "0 overlaps" results were produced by a probe that was blind to
fixed elements and, once fixed for that, would have reported these two phantom classes. The
instrument-head collision needed the width sweep to surface at all.

### After the fix

**90/90 clean**: zero text overlaps, zero fixed-element overlaps, zero page-level horizontal
overflow, zero hidden-axis clipping, at every one of the 15 widths on all 6 pages.

`pnpm typecheck` clean · `pnpm build` clean · **34 tests pass / 8 files** · **12/12 audit runs
green** (22 width-level gates, including dark).

## Pass 14 — the defects a fresh render found (user: "帮我优化美化")

Pass 13 ended at "90/90 clean" on overflow and occlusion. This pass is different in kind: it
re-ran the product through its own mock harness (`lib/ui` + `.design-work/mock-server.mjs`)
and looked at it, rather than at the standalone preview, and found ten things the gate could
not see — because they were not overflow, not overlap, and not contrast.

### 1. The cockpit chart had no legend, no interval and no fill count

`.price-chart-panel` on the overview rendered exactly two children: `price-chart-wrap` and
`sr-only`. `#price-chart-title`, `.chart-legend` and `.chart-meta` are all gated on
`{!compact}`, and `CockpitInstrumentView` passes `compact` unconditionally — so the legend
existed only on the drill-down page. The overview is the default landing surface, and it was
showing a green square and an amber triangle with nothing anywhere saying what they were.
DESIGN.md's own chart contract requires the interval, source and fill count to stay visible
next to the chart.

Fix: a single compact meta row — legend on the left, `interval · fills in range` on the
right — 21px tall at 1440, wrapping to two lines under ~420px. The detail page keeps its
full heading.

### 2. The legend was painted twice, in two different palettes

Every legend item carried both a CSS `::before` swatch (token colours) and an inline `<i>`
swatch (`accent` / `buyColor` / `sellColor` from JS). Two marks per item. The two disagreed,
which is how the bug survived: the JS values were TradingView's defaults —
`#1677ff` line, `#18a957` / `#d88a15` markers — so the swatch and the line it labelled were
never the same blue.

Fix: the legend swatch is CSS only, and `PriceHistoryChart` now resolves `--accent`, `--pos`,
`--warn`, `--ink-3`, `--hair` and `--font-mono` from the document at render time. One source
of truth, so they cannot drift again. Two latent bugs fell out of the same edit: `model`
memoised the marker colours without depending on them, so a theme switch left the old marker
colours in place; and the axis was drawn at **10.5px** in a font stack the product does not
use anywhere else, which the DOM-based type-floor audit cannot see because canvas text is not
a DOM text node. Axis type is now `--fs-micro` in `--font-mono`.

The swatch shapes were wrong too: a square for buys and an up-triangle for sells, against a
series that draws an up-arrow and a down-arrow. Both are now the arrows.

### 3. The smallest treemap tile dropped the weight and the amount

`isCompact = rect.w < 30 || rect.h < 28` compared `computeTreemapLayout`'s **percentage**
output against pixel-shaped thresholds, and `{!isCompact && …}` then deleted the whole
sub-row. TSLA is the smallest tile and the only losing position: it was the one tile that
showed red without saying how much, and the one tile with no weight. DESIGN.md rule 7 forbids
paying for space with information.

Fix: three rows on every tile, always. The tight case is a container query on leading and
inset (`@container (max-height: 80px)` — the query measures the slot, which is 8px taller
than the tile). All five tiles: `overflow 0`.

### 4. The 资产配置 mode toggle wrapped onto two lines at 1440

`.treemap-mode-pill` settled at **55 × 36px** — less than the 70px "今日变化" needs — because
the control was a shrinkable flex item competing with the section's own subtitle. Both
labels broke: 今日／变化, 累计／收益.

Fix: `flex: none` on the control, and the header becomes a two-row grid so the explanation
gets the full 336px. In a flex row it had been left 158px and broke after 代 in 代表. Same
header height as before.

### 5. The account card's two sub-metrics ended at different heights

`+€302.30 (+1.4%)` fitted on one line; `+€2,336.33` pushed `(+11.7%)` onto a second. Measured
`strong` heights: **26px vs 53px**. The percentage is now a block on both, so both read
46px and the pair aligns.

### 6. `主要持仓` broke 3+1 at 390px

Measured h2 box: **73px × 63px**. The subtitle claimed max-content first and the heading
shrank below its min-content. This is the same defect class as Pass 13's instrument head —
an `auto`/max-content sibling squeezing a `1fr` — in a place the width sweep did not cover.
`.section-heading h2` is now `flex: 0 0 auto`, and every section heading stacks on phones.

### 7. The holdings table split 111px between a name and its ticker

`.asset-link` was a flex **row**, so at 390px "NVIDIA Corp." and "NVDA · USD" each wrapped
inside ~56px and both broke mid-word. Stacked on phones, each line gets the whole column:
the first track drops 181px → 193px of usable width, and the table narrows 604px → 583px
because the track is no longer sized to the sum of two strings. Cell padding comes down from
12px to 8px per side to buy the scroll back.

### 8. `FILLED` in a Chinese interface

Order status was rendered as the raw API token next to a localised 买入 / 卖出. Now mapped
through `orderStatusLabel`, with unknown values falling through rather than blanking.

### 9. The standalone preview no longer mirrored the product

`preview-body.html` had no `<main class="workspace">`. That element — not the cockpit layout —
carries the 104px offset that clears the fixed top bar, so every capture from that file put
the account card, the instrument head and the range switcher **underneath** the bar
(first content top 0 vs 104). The README hero and every `docs/images` capture come from it.
It also still carried a floating keyboard-shortcut HUD whose CSS was deleted in Pass 12.

Fix: wrapper added to both previews, footer moved out of the cockpit layout to match the app
shell, dead HUD removed. Regenerated: first content top 104 (132 on phones), top bar bottom
72 (110).

### 10. The preview contradicted itself

One screen carried three answers to "top-three concentration": the context strip said
**55.2%**, the page's own holdings list and table said **73.0%**, and its mosaic weights said
**72.8%** — and the mosaic's five weights (28.5 / 26.2 / 18.1 / 15.4 / 11.8) were a different
set from the table's (24.4 / 26.3 / 22.3 / 12.0 / 15.0). The rects were hand-placed, so the
mosaic's areas did not encode its own numbers either.

Fix: the strip says 73.0%, and the five slots now carry the geometry `computeTreemapLayout`
actually produces for the table's weights. Measured area shares now track the weights in
order (NVDA 23.8 > AAPL 22.0 > MSFT 20.0 > VOO 13.0 > TSLA 10.2, each ~2.4pp below its weight
because every tile is inset 4px).

### What this pass deliberately did not do

- **The preview showed three sections the product did not render.**
  `cockpit-ai-prompt-strip`, `cockpit-ai-analysis-card` and `cockpit-sub-analytics-grid` were
  styled in `styles.css` and present in both preview bodies, and were rendered by no `.tsx`
  file. Deleting them throws away designed work; implementing them is a product decision, not
  a polish pass. They were recorded here rather than silently resolved. **Resolved in Pass 15
  below** — the user chose to keep the two analytics panels and delete the AI strip.
- **The mobile holdings table still scrolls horizontally.** Five numeric columns cannot fit
  328px, and DESIGN.md's contract is that wide tables scroll inside `.table-scroll`. The
  cells were cleaned up; the scroll was not removed.
- **The detail page's `持仓明细` rows stay label-left / value-right across the full canvas.**
  Sparse at 1440, but a legitimate spec-sheet pattern, and not something to redesign inside a
  polish pass.
- **The mock fixture still quotes a chart price that disagrees with the quoted price**
  (US$470.39 on the chart against US$198.17 in the head). That is `.design-work/fixtures.mjs`
  synthetic intraday data, not the product, and it does not appear in any shipped screenshot.

### Verification

`pnpm typecheck` clean · `pnpm build` clean · **34 tests pass / 8 files**.

A width sweep over **15 widths × 5 pages = 75 runs** (375 … 1920, straddling every
breakpoint; overview, holdings, history, settings, help) checks page-level horizontal
overflow, hidden-axis clipping, sub-12px type, text-leaf overlaps and fixed-element
overlaps. Its first run reported **17 issues — and every one of them was introduced by this
pass**, which is the point of running it:

| symptom | widths | cause | fix |
| --- | --- | --- | --- |
| `.tile-percent` overlapping `.tile-weight` by 16 × 2px on the TSLA tile | all 15 | `line-height: 1` on the compact percentage put its ink box 2px inside the row below | `line-height: 1.15`, sub-row margin 2px — the tile had 5px of slack |
| `Microsoft Corp.` clipped, `scrollWidth 67 > clientWidth 61` | 681–1180 | a global ellipsis rule met the row layout, where the name and ticker still split ~111px | the asset cell now stacks below 1180 (not 680), so each line gets the full column; the ellipsis rule moved inside that query |

Both are fixed. Re-run over the same 15 widths × 5 pages: **75/75 clean** — zero
page-level horizontal overflow, zero text overlaps, zero fixed-element overlaps, zero
hidden-axis clipping, minimum font 12px, at every width on every page, light and dark.

The overlap gate is worth keeping pointed at this file: the 2px tile overlap is invisible in
a screenshot and would have shipped, and the ellipsis truncation was *introduced* by a rule
written to fix something else. Neither was catchable by the contrast, radius or shadow
counters that the earlier passes leaned on.

## Pass 15 — mounting the two orphaned panels (user: "c" → "继续")

Pass 14 ended with three designed-but-unrendered blocks recorded as an open decision. The user
chose option C: **keep `ProfitDrivers` and `CurrencyExposureChart`, delete the AI strip.**

### 1. Both panels were dead code with live bugs in them

`ProfitDrivers` and `CurrencyExposureChart` had zero call sites and zero test coverage. Mounting
them was not a no-op, because code nothing renders does not get looked at:

```tsx
detail: `${tx(...)} · {plainPercent(item.weightPercent)}`,   // template literal, not JSX
```

`CurrencyExposureChart`'s bar-list branch printed `{plainPercent(item.weightPercent)}` — the
source text, verbatim — as every row's subtitle. It is inside backticks, so it is a literal, not
an expression. The fixture never reached that branch (three currencies, and the panel switches to
bars at four), so it had never been seen.

### 2. Both panels silently truncated their own lists

Both cut with `.slice(0, 6)` and said nothing about the cut. `BarList` sizes every bar against
the largest row rather than the total, so a truncated list still looks complete — and the
currency panel printed a share column that stopped adding up to 100% without explanation. Both
now fold the remainder into an explicit `其他 N 项` row, the same idiom the allocation legend
already used. The head is genuinely the top of the list: `allocation` and `currencyExposure`
both arrive sorted by size.

### 3. The fixture, the preview and the product disagreed three ways

The default fixture is documented as mirroring `preview-body.html`. It did not:

| claim | preview said | fixture said | truth (from the 5 ledger rows) |
| --- | --- | --- | --- |
| top-three concentration | 73.0% | **55.2%** | 73.0% (26.3 + 24.4 + 22.3) |
| USD exposure | 4 holdings, 79.7% | 4 holdings, 79.7% | 3 holdings, 73.0% |
| GBP exposure | 1 holding, 5.3% | 1 holding, 5.3% | 1 holding, 12.0% |
| holdings in the account | — | 6 (4+1+1) | 5 |

The rail displayed **55.2% 前三大集中度** next to a treemap whose top three tiles add to 73%.
The currency panel claimed six holdings in a five-holding account. Both files now derive from
the same five positions; the preview's ledger relabels VOO → EUR and TSLA → GBP, which is what
makes its exposure block true rather than asserted.

### 4. The bar track was declared and invisible

`.bar-measure` carried `background: var(--well)`. On `--canvas` that is **1.06:1**, on
`--surface` **1.13:1** — a track nobody can see, which leaves the fills reading as floating
strokes rather than as measures. The track is the bar's scale; it is now `--hair` (~1.2:1 on
either ground), the system's one line colour.

### 5. Unsigned magnitudes were painted green

`BarList` filled every non-negative row with `--pos`. Three of its five callers pass *unsigned*
magnitudes — currency exposure, trade volume, dividend sources — so the overview showed a green
bar beside "USD 73%", asserting a gain that is not in the data. The token block states the rule
outright: *green/red are reserved for signed finance only*. Signed lists keep `--pos` / `--neg`;
unsigned lists take `--accent`.

### 6. A zero-currency account rendered an empty div under a live heading

`CurrencyExposureChart` fell through to the compact list when `currencyExposure` was empty,
producing `.exposure-summary` with no children: a heading and a subtitle over nothing. The empty
profile now shows the same `暂无足够数据` wording `BarList` already uses.

### 7. The canvas became the taller column, and the disclaimer floated

Adding ~390px of panels flipped the column balance: rail bottom 1245, canvas bottom 1591. The
BaFin notice sat 346px above the page's bottom edge, mid-page, because `.cockpit-left-pane`
ended wherever its content ended. The rail now stretches to the row height and
`.cockpit-pane-footer` takes `margin-top: auto`, so the history pill and the notice anchor to the
bottom, aligned with the canvas. Both columns now report the same bottom at every width.

### 8. My own breakpoint regression: the bar label ellipsised at 981–1024

The first full sweep after mounting came back **73/75**, and the two failures were mine. At 1024
the canvas is 618px, the analytics grid splits it 1.4fr/1fr, and the bar label column landed at
**98px** — `Vanguard S&P 500` needs 131px, so the row's own identifier was truncated. Same
failure the asset cell had in Pass 14, same fix: below 1180 the bar row stacks (label and value
on one line, measure full-width beneath), which is the treatment it already used below 680.

### 9. A harness gap: two branches nothing could render

Neither tail row existed below seven rows, and the exposure panel's bar layout only appears above
four currencies. The default snapshot has five positions and three currencies, so **both new code
paths were unreachable by any profile** — I had written them and could not see them. A
`multicurrency` profile (seven holdings, seven instrument currencies, analytics derived from its
own position list rather than asserted beside it) now renders 7 + 7 rows including both tails.

### 10. The AI strip, deleted

`.cockpit-ai-prompt-strip` / `.ai-prompt-scroller` / `.ai-prompt-card-chip` / `.ai-strip-title`,
`.cockpit-ai-analysis-card` / `.ai-analysis-header` / `.ai-badge`, `.ask-banner` and its
children: **10 selectors across 6 rule groups**, all confirmed present in `HEAD`, removed from
`styles.css` and from both preview bodies. `.signed-bars` and `.cockpit-overview-holdings` went
with them — the latter replaced by `.cockpit-analytics-strip`, the class the design system had
already reserved for exactly this composition. Section numbers were renumbered 09–23 so the file
has no gap.

### Verification

`pnpm typecheck` clean · `pnpm build` clean · **34 tests pass / 8 files**.

| sweep | runs | result |
| --- | --- | --- |
| default profile, light, 15 widths × 5 pages | 75 | **75/75 clean** |
| default profile, dark, 15 widths × 5 pages | 75 | **75/75 clean** |
| multi-currency profile, light, 15 widths × 5 pages | 75 | **75/75 clean** |

Every run: 0 page-level horizontal overflow, 0 hidden-axis clipping, 0 text-leaf overlaps, 0
fixed-element overlaps, minimum font 12px. New gates added to the probe this pass: bar fills
escaping their track (0 everywhere) and panel row alignment across the two columns.

Profiles checked by hand at 1440 and 390: `rich`, `empty`, `error`, `disconnected`, `nologo`,
`multicurrency`. The empty profile shows both panels' empty state; `error` and `disconnected`
render no cockpit at all, so the panels are correctly absent.

One sweep run reported `no grid` at 768 dark. Re-probed three times: the grid is present with
2 panels, 5 bar rows and 3 exposure rows, and a full audit at that width returns all zeros. It
was a harness navigation flake, and the `no grid` marker is what made it visible instead of
silently counting as a clean run.

### Known open item (pre-existing, not this pass)

Between **981px and about 1090px** the overview's compact holdings ledger needs up to **86px**
of horizontal scroll inside `.table-scroll` (43px at 1024), so its last column is cut until the
reader scrolls. It is a scroll container, not a clip, so the overflow gate does not see it, and
it predates this pass — the canvas width at those viewports is unchanged by the analytics strip.
Reducing the cell padding from 12px to 8px in that band recovers 40px and is not sufficient on
its own, so it is recorded rather than half-fixed.

### Open decision: a fourth unrendered section

Deleting the AI strip exposed that it was not the last one. `.cockpit-investments-section` — the
投资组合 positions stream — is styled and present in both preview bodies and rendered by no
`.tsx` file; the rail uses the allocation treemap instead. It is **larger than the block the user
approved deleting**:

| | AI strip (deleted this pass) | investments stream |
| --- | --- | --- |
| stylesheet | 6 rule groups | **68 lines, 9 selectors** |
| shared-selector references | 4 | **11** |
| preview markup | 16 lines × 2 | **53 lines × 2** |

This is a design decision, not a bug, so it is recorded rather than deleted unilaterally. The
preview cannot be said to equal the product until it is resolved one way or the other, and
DESIGN.md names it as the remaining exception to its own "do not invent sections" rule.

---

## Pass 15 — direction C landed, and the two defects mounting it exposed (user: "c" → "继续")

Pass 14 deleted the AI strip and left `.cockpit-analytics-strip` reserved but empty. This pass
puts the two components the stylesheet had already been written for into it, on the overview
canvas between the instrument cockpit and the holdings ledger:

```
<section className="cockpit-analytics-strip">
  <div className="cockpit-sub-analytics-grid">
    <section className="sub-panel">  未实现盈亏贡献      → <ProfitDrivers />
    <section className="sub-panel">  标的交易币种暴露    → <CurrencyExposureChart />
```

`ProfitDrivers` and `CurrencyExposureChart` were fully implemented, styled, translated and never
called by any `.tsx` file — `grep` count 0 across `src/`. Their CSS (`.cockpit-sub-analytics-grid`,
`.sub-panel` + its `::before` hairline, `.bar-list`, `.bar-row`, `.bar-measure`, `.exposure-summary`)
was live and orphaned too, so this pass made the stylesheet true rather than adding to it.

### 1. Both panels were silently truncating

Each cut its series with `.slice(0, 6)` and said nothing about the cut. `BarList` scales every bar
against the largest row, not against the total, so a truncated list still reads as complete — and
in the exposure panel the share column quietly stopped adding up to 100%. Both now fold the tail
into one real row (`其他 N 项 / 其余持仓合计`), the way the allocation legend already did.

### 2. The three-column bar row does not fit the narrowed canvas (regression the mount introduced)

At 1024 the canvas is 634px; the grid splits it 1.4fr / 1fr and the label column lands at **98px**,
while "Vanguard S&P 500" needs **131px** at 14.5px. The row ellipsised the one string that
identifies it — the same failure `.asset-link` had at 1180, so it gets the same fix: stack label
over track. That treatment already existed below 680; it now starts at 1180.

```css
@media (max-width: 1180px){
  .bar-row{ grid-template-columns: minmax(0, 1fr) auto; row-gap: var(--g-1); }
  .bar-row .bar-measure{ grid-column: 1 / -1; grid-row: 2; }
}
```

### 3. `CurrencyExposureChart` rendered an empty box under a live heading

With zero currencies the component fell through to `.exposure-summary`, which rendered with no
children: a headed band with nothing in it. It now returns `BarList`'s own empty words
(`暂无足够数据`) rather than inventing a second phrasing for the same condition. Verified on the
`empty` profile at 375 / 768 / 1024 / 1440: both panels show the placeholder, and the count of
`.exposure-summary` nodes on the page is **0**.

### Verification

`pnpm build` clean · **34 tests pass / 8 files** · no typecheck output.

| sweep | runs | result |
| --- | --- | --- |
| default profile, light, 15 widths × 5 pages | 75 | **75/75 clean** |
| default profile, dark, 15 widths × 5 pages | 75 | **75/75 clean** |
| multi-currency profile, light, 15 widths × 5 pages | 75 | **75/75 clean** |

225 runs: 0 page-level horizontal overflow, 0 hidden-axis clipping, 0 text-leaf overlaps, 0
fixed-element overlaps, minimum font 12px. Panel gates: **0** bar fills escaping their track at
any width, the divider resolves visible at every width, and the two panels' first rows share one
baseline at every two-column width (823 / 823 at 981–1024, 848 at 1179, 838 at 1181, 795 at 1280,
853 at 1440, 897 at 1920). The multi-currency profile renders 7 + 7 rows including both tails.

One intermediate light run reported `pageOverflowX: 1` on 设置 at 375. Two full re-sweeps and five
targeted re-probes of that exact page and width return 0 every time, with the widest non-fixed
element inside the viewport. Recorded as a harness flake, not a defect — the same discipline the
Pass 14 "no grid at 768" flake was given.

### Still open

Both carry over from Pass 14 unchanged and are not caused by this pass: the compact holdings ledger
needs up to 86px of in-container scroll between 981px and ~1090px, and `.cockpit-investments-section`
remains styled in both preview bodies and rendered by no `.tsx` file. Direction C is otherwise
complete: the two panels are mounted, the AI strip is gone, and the preview's analytics block and
the product's are the same block.
