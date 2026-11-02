# Lumen

The visual language of **dsh × Trading 212** — a read-only portfolio workspace that
lives inside a dsh conversation panel. Lumen exists to make one thing legible: a
money figure, next to what it is made of, next to how it changed.

Neutral ground, one ink-navy accent, hairlines before shadows, and green and red
that are only ever allowed to mean a signed number.

**Canonical source.** This system is generated from the product's own token layer:

| Source | What it holds |
| --- | --- |
| `design-system/tokens.css` | the canonical token layer (roles, type ladder, space, radius, elevation) |
| `design-system/SPEC.md` | the rules: principles, every component's states and prohibitions, content rules, accessibility |
| `src/app/styles.css` | the implementation, carrying a byte-identical copy of the token blocks (`pnpm tokens:check` fails on drift) |
| `design-system/styleguide.html` | the living specimen rendered from `tokens.css` |
| `design-system/AUDIT.md` | why the previous layer was rebuilt, with before/after measurements |

The tokens in this page are that file, translated. Names are unchanged, so
`--canvas`, `--fs-hero`, `--r-3` and `--sh-plate` here are the same custom
properties the app already uses.

---

## Principles

1. **The number is the interface.** Chrome, labels, colour and elevation exist to
   make a figure readable and comparable. Anything that does not help answer *how
   much, how much of it, compared to what* is decoration and gets deleted.
2. **One loud thing.** One accent hue, one display size, one filled control per
   screen. Two equally loud elements is one too many.
3. **Colour is a claim.** `--pos` and `--neg` assert a signed money value. They are
   never magnitude, selection, decoration or emphasis.
4. **Structure before surface.** A card edge must read from its 1px `--hair` line
   alone. Shadow is a decision, not the thing holding the layout up.
5. **Shape follows size.** `--r-1` chip, `--r-2` control, `--r-3` card, `--r-4`
   plate, `--r-pill` only for single-line badges, dots, avatars and the segmented
   thumb.
6. **One system, one file.** No appended override passes. A rule that needs to
   change is edited where it lives, or deleted.
7. **Never claim what the data cannot produce.** If the app cannot render it, a
   preview does not show it; if a preview shows a number, the data model can
   produce that number.

---

## Colour

Three tiers in order: **surface** (what a thing sits on) → **ink** (what a thing
says) → **signal** (what a thing means). Roles only — a component may not carry a
raw hex, and a role is never named after a colour.

| Role | Light | Dark | Use |
| --- | --- | --- | --- |
| `--canvas` | `#EAEBEC` | `#0B0B0D` | page ground |
| `--surface` | `#FFFFFF` | `#151619` | cards, plates, popovers |
| `--well` | `#F4F5F6` | `#101114` | recessed controls, tracks, quiet plates |
| `--ink-1` | `#17181A` | `#F2F3F5` | values, headings |
| `--ink-2` | `#464A50` | `#B8BCC2` | body, labels |
| `--ink-3` | `#63686F` | `#888D94` | micro labels, units, meta |
| `--ink-4` | `#90959C` | `#5F646B` | icons and rules only — never text |
| `--accent` | `#2C3E63` | `#9FB0CE` | interaction, selection, magnitude |
| `--accent-plate` | `#181A1D` | `#E7E9ED` | the one filled control |
| `--pos` | `#1B5E48` | `#5FB78F` | signed gain |
| `--neg` | `#9E3B31` | `#D98A80` | signed loss |
| `--warn` | `#87611A` | `#D2A863` | caveat copy, sell marker |
| `--hair` | `#E3E4E6` | `#26282C` | the one hairline |
| `--hair-strong` | `#D1D3D6` | `#36393E` | measure tracks, control borders |

Four decisions behind those values, because each one was a correction:

- **The ground is neutral, not blue.** Blue-grey canvas plus blue accent plus
  blue-black ink is the default dashboard palette; it reads as a template before a
  reader has parsed a number.
- **The accent is ink that happens to be blue** (chroma ≈ 0.09). A royal blue is a
  link colour; at this depth the accent can mark selection and carry a chart line
  without competing with the hero figure.
- **Money colours are deep and desaturated.** They still read as gain and loss in
  greyscale and stop shouting at each other across forty rows.
- **`--well` always sits between `--canvas` and `--surface`** in both themes, so the
  same role means the same depth everywhere. In the earlier palette dark-mode
  `--well` was *lighter* than `--surface`, silently inverting every recess.

Contrast contract: `--ink-1` ≥ 15:1, `--ink-2` ≥ 8:1, `--ink-3` ≥ 4.5:1 on every
surface, both themes. `--ink-4` is exempt only because it never carries text.

A **magnitude** bar (weight, exposure, volume) takes `--accent`. A **signed** bar
takes `--pos`/`--neg` *and* a direction, so the sign survives greyscale.

---

## Type

Two families, six desktop tiers plus a mobile hero. No webfonts: the app ships as
an npm package that must work offline, so `--font-sans` is Inter if present and the
platform UI face otherwise, and `--font-mono` is the platform mono.

| Style | Size / leading | Tracking | Weight | Role |
| --- | --- | --- | --- | --- |
| `type-hero` | 40 / 44 | −0.022em | 560 | the one number the page exists for |
| `type-hero-sm` | 32 / 36 | −0.022em | 560 | mobile hero, below the 680px breakpoint |
| `type-title` | 26 / 32 | −0.022em | 600 | page title, secondary money figure |
| `type-fig` | 20 / 26 | −0.011em | 600 | panel headings |
| `type-row` | 16 / 22 | −0.011em | 600 | values that carry the answer |
| `type-body` | 14 / 20 | 0 | 400–500 | names, prose, controls |
| `type-micro` | 12 / 16 | +0.02em | 400–500 | labels, units, table headers |

- **The floor is 12px** — including chart axes, legal text and badges.
- **Only the display tier is fluid:** `--fs-hero` is
  `clamp(32px, 2.4vw + 16px, 40px)` and `--lh-hero` ramps with it, so a 40px
  balance is never set inside a 640px card, and the ramp never introduces a size
  above the scale.
- **All figures are `tabular-nums` with zero tracking.** Tracked digits cannot be
  compared down a column.
- Sentence case everywhere. Uppercase micro-labels cost about 15% of the
  legibility of the smallest text for a decorative effect.
- Weights are 400 / 500 / 560 / 600 only. Fractional weights render unpredictably
  on non-variable fallback faces.

---

## Space, shape, elevation, motion

**Space** is a 4px base: `--s-1`…`--s-8` = 4 8 12 16 20 24 32 40 horizontally, and
`--g-1`…`--g-7` = 6 10 16 20 28 40 48 for the vertical rhythm between blocks.
Density contract: card padding 20 (`--card-pad`), table row 48 (`--row-h`),
control heights 28 / 34 / 40 (`--control-h-sm|--control-h|--control-h-lg`).

**Shape** follows size: `--r-1` 6 chips · `--r-2` 10 controls · `--r-3` 14 cards ·
`--r-4` 18 plates · `--r-pill` 999 for single-line badges, dots, avatars and the
segmented thumb only. A 34px button with a 999px radius is a lozenge; five in a
row is a toy.

**Elevation** has three levels — bare (no border, no shadow, rhythm only), plate
(`--surface` + 1px `--hair` + `--sh-plate`), float (`--glass` + `--sh-float`) and
overlay (`--sh-overlay` + scrim). Never a shadow without a line, and never a
nested frame: the old inset `::before` bezel read as a picture frame and is gone.

**Motion** is one curve, `cubic-bezier(.32,.72,0,1)`, in three beats: 140 / 240 /
400ms. `transform` and `opacity` only. `prefers-reduced-motion` collapses every
duration to `.01ms`, and nothing animates on scroll — a scroll-driven timeline that
never advances leaves an element at its from-state, which is invisible data.

---

## Components

Each family below is a live preview in this page and a spec entry in SPEC §4.

| Family | The contract in one line |
| --- | --- |
| Button | control heights 28/34/40 at `--r-2`, but the one filled control (`.primary`) ships as a 44px pill; primary is `--accent-plate` and appears once per view |
| Segmented control | `--well` track, `--surface` thumb sliding on `transform`; the selected label is `--ink-1` semibold, never white-on-grey (that is what disabled looks like) |
| Badge / tag | `--r-1` (or pill for one word), height 18–20, `--well` + inset hairline; a saturated fill only for signed states |
| Card / plate | `--surface`, 1px `--hair`, `--r-4`, `--sh-plate`, padding 20; one idea per card |
| Data table | micro header in `--ink-3`, 48px rows, one hairline between rows, numerics right-aligned and tabular |
| Ranked bar list | fixed value column; track `--hair-strong`; a loss grows **leftwards** from the zero point |
| Price chart | one `--accent` line at 2px in the app's chart options, no fill; buy = `--pos` square, sell = `--warn` triangle, dashed `--ink-4` average cost; the legend draws the exact shapes |
| Allocation mosaic | area encodes value; a 7% tint plus a 20% border of the tile's signal; the number carries the colour, at `type-title` above 150px tall |
| Metric band | a hairline above each cell and 1px rules between; the shipped grid is `auto-fit` at a 150px minimum, not a fixed five |
| Navigation | two capsules (nav, and search + tools), `--r-3`, active tab is `--accent-soft` + `--accent-deep` — never a solid accent fill |
| Empty / loading / error | one sentence, one action; skeletons with the incoming shape; error says what happened and offers one retry |

The previews render the **real class layer** extracted from `src/app/styles.css`
(`components/bundle.css`, 935 lines, nothing invented). The React components in
`src/app/` remain the implementation; the chart's plotting library is not part of
this system, only its chrome.

**Where `SPEC.md` and the shipped stylesheet disagree, this system documents the
stylesheet** — that is what ships and what the previews render — and each affected
card carries a *contract note* naming the difference. The divergences found so far:
the primary button's size and radius, the data table's selected-row treatment, the
metric band's column rule, the chart's line width and axis size, and the "ghost"
button, which exists only as `.t212-pill-action`.


---

## Content

1. Labels are nouns; verbs are for buttons.
2. A unit belongs to its number (`€5,428.10`, `27.4 shares`), never to a column
   header alone.
3. **Quantities drop trailing zeros.** Four decimals is the ceiling, but a whole
   position prints `27.4`, not `27.4000`. One formatter owns this; no call site
   passes its own digit count.
4. **Currency is explicit wherever two currencies meet.** A quote in the listing
   currency beside a result in the account currency carries one micro line naming
   both: `quote USD · result EUR`. Omitted when they match, so it never becomes
   permanent chrome.
5. No instructional copy in permanent chrome. If a control needs a sentence, the
   control is wrong — instructions belong in Help.
6. Percentages take one decimal (`+18.3%`), always carry a sign, and always say what
   they measure: `+4.30% total` and `+4.30% 1 year` are different numbers that can
   be equal.
7. **Privacy masking is a state, not a hole.** Masked values keep their width, take
   `--ink-3` at 0.08em tracking, and never leak into an adjacent label.

---

## Iconography

- Inline stroke SVG only: 1.4–1.6px stroke, 16px box, `currentColor`, no fills, no
  emoji, no icon font. Icon-only controls carry both `aria-label` and `title`.
- The set is small and literal — search, eye, chevron, external, check, info. New
  icons are drawn on the same grid rather than pulled from a library.
- **Ticker marks** are not brand assets of this system: the app fetches real
  company logos at runtime and falls back to an initials tile. The fallback is a
  designed state, not an error state, and carries no colour of its own.
- There is no Lumen logotype. The product wordmark is set in type; do not invent a
  mark for it.

---

## Accessibility

- Text ≥ 4.5:1; non-text that carries meaning (icons, semantic rules) ≥ 3:1.
- Focus is always visible: 2px `--accent` with 2px offset, both themes, every
  interactive element.
- Hit targets ≥ 44px on touch, ≥ 28px with a pointer.
- No meaning is carried by colour alone: signed values keep their sign, mosaic
  tiles keep their arrow, bar lists keep their direction.
- `prefers-reduced-motion` and `prefers-reduced-transparency` both have explicit
  fallbacks.
- The page never scrolls horizontally between 320 and 1920.

---

## Governance

1. **Tokens are the only source of values.** A component may not contain a hex, a
   px radius, a px shadow, or a font size outside the `--fs-*` set.
2. **`design-system/tokens.css` is canonical**, and `src/app/styles.css` carries a
   byte-identical copy; `pnpm tokens:check` fails on drift. The previous
   hand-maintained copy lost two type steps and a radius alias before anyone
   noticed.
3. **No appended override passes.** A rule that must win by source order is a
   missing token.
4. **Adding a component** means: spec entry → live specimen → implementation in the
   owning section → screenshot at 1440 and 390 in both themes → a note here.

### Not in this system

- **No font files.** The product ships no webfonts by design; the stacks are named
  in `--font-sans` / `--font-mono` and resolve to the platform faces.
- **No logo or illustration assets.** There are none in the product.
- **No chart library.** The price chart's internals are TradingView Lightweight
  Charts; only its chrome, legend and marker shapes are specified here.
- **No app runtime.** Previews are the real stylesheet with representative
  markup — they do not mount React, fetch data, or reproduce live states such as
  privacy masking.
