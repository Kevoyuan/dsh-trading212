# Lumen — dsh × Trading 212 design system

Version 2.0 · applies to `src/app/styles.css`, `design-system/tokens.css`,
`preview-redesign.html`

---

## 1. Why this exists

The previous "system" was a document describing rules the stylesheet no longer
followed. Measured on the shipped stylesheet before this pass:

| Claim in the old `DESIGN.md` | What the stylesheet actually did |
| --- | --- |
| "Six type sizes" | **10** — 40 / 26 / 22 / 18 / 17 / 14 / 13 / 12 / 11.5 / 11 |
| "Nothing below 12px, ever" | **41 text runs at 11–11.5px** |
| "Four radii only" | **4 declared, but `--r-pill: var(--r-4)`**, so 55 elements shared an 18px radius and no control was ever a pill |
| "One accent" | true, but the accent was also used for decorative rings, and a solid blue plate in the nav out-shouted the account total |
| "No stacked overrides" | **three appended override layers** (passes numbered 20.x / 21.x / 22.x) re-declared the same components, in reverse order |
| "Preview is generated from the same stylesheet" | true, but the preview's *markup* rendered a 458px positions stream that **no `.tsx` file renders**, and titled the allocation section "投资组合" — the same title as the section above it |

A design system is not a document. It is a token file, a stylesheet that only
uses those tokens, a styleguide that renders them, and a check that fails when
they drift. This folder holds the first three; `scripts/check-tokens.mjs` is the
fourth.

---

## 2. Principles

1. **The number is the interface.** Everything else — chrome, labels, colour,
   elevation — exists to make a figure readable and comparable. Any element that
   does not help a reader answer "how much, how much of it, compared to what"
   is decoration and should be deleted.
2. **One loud thing.** One accent hue, one display size, one filled control per
   screen. If two elements are equally loud, one of them is wrong.
3. **Colour is a claim.** Green and red assert a signed money value. They are
   never used for magnitude, selection, decoration or emphasis.
4. **Structure before surface.** A card edge must be readable from its 1px line
   alone. Shadow is a decision, not the thing holding the layout up.
5. **Shape follows size.** A control's radius is a function of what it is, not of
   fashion: chip 6, control 10, card 14, plate 18, pill 999 (badges, dots,
   segmented thumbs, avatars only).
6. **One system, one file.** No appended override passes. A rule that needs to
   change is edited where it lives, or it is deleted.
7. **The preview must not lie.** If the app does not render it, the preview does
   not show it. If the preview shows a number, the app's data model can produce
   it.

---

## 3. Foundations

### 3.1 Colour

Three tiers, in order: **surface** (what a thing sits on) → **ink** (what a thing
says) → **signal** (what a thing means).

| Role | Light | Dark | Use |
| --- | --- | --- | --- |
| `--canvas` | `#EAEBEC` | `#0B0B0D` | page ground |
| `--surface` | `#FFFFFF` | `#151619` | cards, plates, popovers |
| `--well` | `#F4F5F6` | `#101114` | recessed controls, tracks, quiet plates |
| `--ink-1` | `#17181A` | `#F2F3F5` | values, headings |
| `--ink-2` | `#464A50` | `#B8BCC2` | body, labels on tinted ground |
| `--ink-3` | `#63686F` | `#888D94` | micro labels, units, meta |
| `--ink-4` | `#90959C` | `#5F646B` | icons and rules only — **never text** |
| `--accent` | `#2C3E63` | `#9FB0CE` | interaction, selection, magnitude bars |
| `--accent-plate` | `#181A1D` | `#E7E9ED` | the one filled control (primary button) |
| `--pos` | `#1B5E48` | `#5FB78F` | signed gain |
| `--neg` | `#9E3B31` | `#D98A80` | signed loss |
| `--warn` | `#87611A` | `#D2A863` | caveat, sell marker |
| `--hair` | `#E3E4E6` | `#26282C` | the one hairline |
| `--hair-strong` | `#D1D3D6` | `#36393E` | measure tracks, control borders |

Why these values, in four sentences:

- **The ground is neutral, not blue.** A blue-grey canvas plus a blue accent plus
  a blue-black ink is the default dashboard palette; it reads as a template
  before a reader has parsed a single number. Neutral greys let the one navy
  accent and the two money hues be the only colour on the page.
- **The accent is ink that happens to be blue** (`#2C3E63`, chroma ≈ 0.09).
  A royal blue is a link colour; at this depth the accent can mark selection and
  carry a chart line without competing with the hero figure.
- **Money colours are deep and desaturated** (pine `#1B5E48`, terracotta
  `#9E3B31`). They still read as gain and loss in greyscale, and they stop
  shouting at each other across a table of forty rows.
- **`--well` always sits between `--canvas` and `--surface`** in both themes, so
  the same role means the same depth everywhere: a recess inside a card is
  darker than the card, and a track on a card is darker than the card. In dark
  the old palette had `well` *lighter* than `surface`, which silently inverted
  every recess — including the segmented-control thumb, which was drawn darker
  than the track it sits on.

Rules:

- Contrast: `ink-1` ≥ 15:1, `ink-2` ≥ 8:1, `ink-3` ≥ 4.5:1 on every surface it
  can land on, in both themes. `ink-4` is exempt because it never carries text.
- No pure `#000` or `#FFF` text. No colour outside this table in a component.
- A **magnitude** bar (weights, exposure, volume) takes `--accent`. A **signed**
  bar takes `--pos` / `--neg` *and* a direction (see §4.6).
- Dark theme overrides **roles only**, never a component. A component that needs
  a new value in dark is missing a role.

### 3.2 Type

Six tiers. Each owns size, line-height and tracking together; a heading cannot
inherit body leading.

| Token | Size / LH | Tracking | Weight | Role |
| --- | --- | --- | --- | --- |
| `--fs-hero` | 40 / 44 | −0.022em | 560 | the one number the page exists for |
| `--fs-title` | 26 / 32 | −0.022em | 600 | page title, secondary money figure |
| `--fs-fig` | 20 / 26 | −0.011em | 600 | panel headings |
| `--fs-row` | 16 / 22 | −0.011em | 600 | values that carry the answer |
| `--fs-body` | 14 / 20 | 0 | 400–500 | names, prose, controls |
| `--fs-micro` | 12 / 16 | +0.02em | 400–500 | labels, units, table headers |

- **Floor is 12px.** There is no 11px, no 10px, no 9px — including chart axes,
  legal text and badges.
- **The display tier is the only fluid one.** `--fs-hero` is
  `clamp(32px, 2.4vw + 16px, 40px)`: 32px at the 680px breakpoint, 40px from
  1000px up, and a proportional value between. A 40px balance inside a 640px
  card is a hierarchy error, not a style choice — but the endpoint must still be
  the tier value, so the ramp never introduces a size above the scale.
  `--lh-hero` ramps with it (`clamp(36px, 2.4vw + 20px, 44px)`) so the ratio
  stays ~1.1 instead of tightening as the size falls.
- Mobile hero is `--fs-hero-sm` (32 / 36). It is not a desktop tier; it owns its
  own line-height, so a 32px number is not set on a 44px line.
- All figures use `font-variant-numeric: tabular-nums` and **zero tracking**.
  Tracked digits cannot be compared down a column.
- Sentence case everywhere. No uppercase micro-labels: they cost 15% of the
  legibility of the smallest text on the page for a decorative effect.
- Weights are 400 / 500 / 560 / 600. `620`, `550` and other fractional weights
  render unpredictably on non-variable fallback fonts — do not use them.

### 3.3 Space

Base 4px: `4 8 12 16 20 24 32 40` (`--s-1 … --s-8`).

Vertical rhythm between blocks in a column: `--g-1 … --g-7` = `6 10 16 20 28 40 48`.

Density contract: card padding 20 (`--card-pad`), table row 48 (`--row-h`),
control heights 28 / 34 / 40 (`--control-h-sm` / `--control-h` / `--control-h-lg`).

### 3.4 Shape

| Token | Value | Applies to |
| --- | --- | --- |
| `--r-1` | 6 | chips, badges, ticks, inner thumb |
| `--r-2` | 10 | **controls**: buttons, inputs, tabs, segmented track |
| `--r-3` | 14 | cards, nav capsules |
| `--r-4` | 18 | hero plates, the chart plate, modals |
| `--r-pill` | 999 | single-line badges, dots, avatars, segmented thumbs |

A control is never `--r-pill`. A 34px button with a 999px radius is a lozenge;
five of them in a row is a toy. The one legitimate pill is the sliding thumb of
a segmented control, because it must match the track's end caps.

### 3.5 Elevation

| Level | Recipe | Use |
| --- | --- | --- |
| 0 bare | no border, no shadow | bands on the canvas, separated by rhythm |
| 1 plate | `--surface` + 1px `--hair` + `--sh-plate` | cards, tables, the chart |
| 2 float | `--glass` + 1px + `--sh-float` | sticky navigation capsules |
| 3 overlay | `--surface` + `--sh-overlay` + scrim | dialogs, popovers |

Never a shadow without a line. Never a nested frame (the old "double bezel" —
an inset `::before` with its own radius — is gone; it read as a picture frame).

### 3.6 Motion

One curve `cubic-bezier(.32,.72,0,1)`, three beats `140 / 240 / 400ms`.
`transform` and `opacity` only. `prefers-reduced-motion` collapses every duration
to `.01ms`. Nothing animates on scroll: with `fill: both` a scroll-driven
timeline that never advances leaves the element at its from-state, i.e. invisible
data — an invisible failure mode that a screenshot cannot catch.

---

## 4. Components

Every component below is rendered live in `styleguide.html`.

### 4.1 Button

- Heights 28 / 34 / 40. Radius `--r-2`. Padding `0 12px`. Label `--fs-body` 500.
- **Primary**: `--accent` fill, white label. **One per view.**
- **Secondary**: `--surface` + 1px `--hair` + `--ink-1`. The default.
- **Ghost**: no fill, `--ink-2`; hover `--well`.
- **Danger**: `--neg` label, `--neg-soft` hover. Never a red fill at rest.
- States: rest → hover (one step darker ground) → active (`scale(.98)`) →
  focus-visible (2px `--accent` outline, 2px offset) → disabled (`opacity .45`,
  `cursor: not-allowed`, **no** hover).
- Disabled controls must carry a reason in the surrounding copy; a dead button
  with no explanation is a bug.

### 4.2 Segmented control

Track `--well` + inset 1px `--hair`, radius `--r-2`, padding 3. Thumb `--surface`
+ 1px `--hair` + `--sh-plate`, radius `--r-1`, sliding on `transform`.

**The selected label is `--ink-1` semibold.** White-on-grey is what *disabled*
looks like; selection has to survive greyscale and low-quality screens.

### 4.3 Badge / tag

Radius `--r-1` (or `--r-pill` when the label is a single word), height 18–20,
`--fs-micro`, `--well` ground + inset 1px `--hair`. Never a saturated fill except
for signed states (`--pos-soft` / `--neg-soft`).

### 4.4 Card / plate

`--surface`, 1px `--hair`, `--r-4`, `--sh-plate`, padding `--card-pad` (20).
A card contains one idea. Two cards of different elevation in the same column
must be deliberate: one is the answer (plate), the other is context (well).

### 4.5 Data table

- Header: `--fs-micro`, `--ink-3`, sentence case, weight 500, one hairline below.
- Rows: 48px, one hairline between rows, none after the last.
- Numerics right-aligned, tabular, **2 decimals for money, ≤4 for quantity, and
  trailing zeros trimmed** (`27.4`, not `27.4000`).
- Row hover `--well`. Selected row `--accent-soft` plus a 2px inset accent rule.
- Wide tables scroll inside `.table-scroll`; the page never scrolls sideways.

### 4.6 Ranked bar list

Grid `1fr | minmax(96px,1.35fr) | 104px` — **the value column is fixed**, because
six rows that each size their own value column produce six right edges and stop
being a column of comparable numbers.

Track `--hair-strong`, 8px, radius 2. Fill radius 2 (not pill: a pill fill reads
as a capsule, not a measure). A **loss grows leftwards** from the zero point at
the right edge, so sign survives greyscale and colour-blindness.

A truncated ranked list is a claim about the tail: fold the remainder into an
explicit `其他 N 项` row instead of cutting at six.

### 4.7 Price chart

- One series, 1.6px `--accent` line, no fill, no gradient.
- Buy = square `--pos`; sell = triangle `--warn`; the **legend draws those exact
  shapes** — a legend that shows something the chart does not contain is worse
  than no legend.
- Average cost = 1px dashed `--ink-4`, labelled in the legend. An unlabelled
  dashed line is an artifact.
- Price scale on the right, inside the plate, never overlapping the series.
- One meta row: legend left, interval + fill count right. No instructional prose
  ("drag the slider or pinch to zoom") inside a chart header.
- Axis type `--fs-micro` mono. Nothing below 12px.

### 4.8 Allocation mosaic

- Area encodes market value; if all tiles are the same size, it is a grid of
  coloured boxes and must be replaced by a list.
- Tile = 1px border at 20% of the tile's signal + a 7% tint of the same signal.
  The **number** carries the colour; a 100% pastel fill makes five tiles read as
  five alerts.
- The percent is the tile's answer: centred in the area it was given, at
  `--fs-title` when the tile is taller than 150px.
- Selection is `--accent`, never the tile's own signal.
- Every tile carries a ▲/▼ glyph, so direction is not colour-only.

### 4.9 Metric band

Five equal columns, one hairline above each, 1px vertical rules between. Label
`--fs-micro`, value `--fs-row`. Used for a position's five facts; never for
unrelated numbers.

### 4.10 Navigation

Two capsules, not one strip: navigation is one object, search + tools another.
Radius `--r-3`. Active tab = `--accent-soft` ground + `--accent-deep` label.
**Never a solid accent fill**: the nav is chrome, the account total is the page.

### 4.11 Empty, loading, error

- Empty: one sentence, one action, no illustration.
- Loading: skeleton blocks with the incoming content's shape; never a full-page
  spinner over a layout that has already been measured.
- Error: what happened, what it means for the data on screen, one retry.

---

## 5. Content rules

1. Labels are nouns (`当前市值`, `持仓成本`). Verbs are for buttons.
2. A unit belongs to its number (`€5,428.10`, `27.4 股`), never to a column
   header alone.
3. **Quantities drop trailing zeros.** Four decimals is the ceiling (0.0001 of a
   share is a legal position), but a whole position prints `27.4`, not
   `27.4000`. The formatter is `shareCount()` in `App.tsx`; every count goes
   through it, and no call site passes its own digit count.
4. **Currency is explicit wherever two currencies meet.** When a block shows a
   quote in the listing currency and a result in the account currency, it carries
   one micro line naming both: `报价 USD · 收益折合 EUR`. Unlabelled, `$198.17`
   beside `+€440.17` reads as an arithmetic error. The line is omitted when the
   two currencies are the same, so it never becomes permanent chrome.
5. No instructional copy in permanent chrome. If a control needs a sentence to
   explain it, the control is wrong. Instructions belong in Help.
6. Percentages: one decimal (`+18.3%`). Signed values always carry a sign, even
   when positive. A percentage always says what it measures — `+4.30% 累计` and
   `+4.30% 1年` are different numbers that can be equal.
7. Privacy masking is a state, not a hole: masked values keep their width, use
   `--ink-3` with 0.08em tracking, and never leak into an adjacent label.

---

## 6. Accessibility contract

- Text contrast ≥ 4.5:1; non-text (icons, rules that carry meaning) ≥ 3:1.
- Focus is always visible: 2px `--accent`, 2px offset, on every interactive
  element, in both themes.
- Hit targets ≥ 44px on touch, ≥ 28px with a pointer.
- Every icon-only control has an `aria-label` and a `title`.
- No meaning is carried by colour alone: signed values keep their sign, mosaic
  tiles keep their arrow, bar lists keep their direction.
- `prefers-reduced-motion` and `prefers-reduced-transparency` both have explicit
  fallbacks.
- The page never scrolls horizontally at any width from 320 to 1920.

---

## 7. Governance

1. **Tokens are the only source of values.** A component may not contain a hex,
   a px radius, a px shadow or a font size outside `--fs-*`.
2. **`design-system/tokens.css` is canonical.** `src/app/styles.css` carries a
   byte-identical copy of its `:root` / `[data-theme="dark"]` blocks (the preview
   inlines that file, so it cannot `@import`). `scripts/check-tokens.mjs` fails
   when they differ — the previous hand-maintained copy lost two type steps and a
   radius alias before anyone noticed.
3. **No appended override passes.** New work edits the section that owns the
   component. If a rule must win by source order, that is a missing token.
4. **Adding a component** means: spec entry here → live specimen in
   `styleguide.html` → implementation in the owning section → screenshot at 390
   and 1440 in both themes.
5. **Adding a colour** means adding a role with a stated job, in both themes, with
   measured contrast. Not a new hex in a component.
6. **The preview is generated, never hand-edited** (`pnpm preview:build`), and it
   may only render what a `.tsx` file renders.

---

## 8. Decisions and remaining debt

The open items below were decided rather than left open. Each decision is in the
code, not just here.

| # | Item | Decision | Where |
| --- | --- | --- | --- |
| 1 | Quantity printed `27.4000` | **Trimmed.** One `shareCount()` formatter (4-decimal ceiling, Intl drops trailing zeros). 18 call sites converted; the preview's hard-coded counts fixed too. | `App.tsx:28`, §5 rule 3 |
| 2 | Chart mixes `$` price with `€` P/L | **Labelled, not merged.** A micro line `报价 USD · 收益折合 EUR` under the price, only when the two currencies differ. | `.inst-price-note`, §5 rule 4 |
| 3 | `--fs-hero` flat 40 above 681 | **Ramped.** `clamp(32px, 2.4vw + 16px, 40px)` with a matching `--lh-hero` ramp; endpoints stay on the tier scale. | §3.2, `tokens.css` |
| 4 | `只读账户` sat under the price block | **Moved to the identity row.** Account state belongs with the instrument name, not inside the number stack — with the FX line it made four stacked lines in one column. | `.inst-tag-row` |
| 5 | Chart heading repeated the live price | **Removed.** The same number 60px apart, with two different `+4.30%`s, is a reading trap; the heading now carries the range change and names the range (`+4.30% 1年`). | `preview-body*.html` |
| 6 | Account plate was content-width between 681 and 980 | **Stretched.** `align-items: start` from the desktop grid survived into the mobile flex column, so the plate measured 422px inside a 755px column. | §22, `align-items: stretch` |
| 7 | 12 CSS classes pointed at components that no longer exist | **Deleted.** `pos-stream-*`, `invest-metric-row`, `investments-header`, `page-header`, `history-header`, `settings-header`, `inst-title-sub`, `cockpit-investments-section`, `toast`. Only `tv-lightweight-charts` remains unreferenced, because the chart library creates it. | `styles.css` |

Still open, with the reason:

| # | Item | Why it stays open |
| --- | --- | --- |
| A | `styles.css` still contains three late passes (20.x / 21.x / 22.x) for setup, history, settings and dialogs, and three competing declarations of `.shortcuts-modal-grid` / `.history-metrics` | they are page-specific and cannot be screenshot-verified without live credentials. They are ordered overrides, not duplicates: merging them changes the cascade for equal-specificity rules in between, so each must be folded into its owning section as that page is touched |
| B | The preview and `App.tsx` duplicate markup | the preview body is a hand-written replica, and it stacks compositions the product never stacks (instrument head + non-compact chart). A real fix is rendering the preview from React with fixture data; until then every preview edit is a manual mirror of a `.tsx` change |
