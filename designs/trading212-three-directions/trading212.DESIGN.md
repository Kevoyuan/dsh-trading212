---
version: alpha
name: Trading 212-design-analysis
description: A commission-free brokerage whose product surface is a bright, utilitarian desk: white sheets on a faint cool-grey canvas, one vivid cyan carrying every action, and a single dark account stage as the only heavy mass on the page. Numbers are the typography — tabular, right-aligned, paired with a one-decimal percentage that always says what it measures. Depth is a hairline plus a 1px shadow, never a soft glow. The brand never decorates; it points.
colors:
  primary: "#12B5DD"
  primary-pressed: "#0FA3C8"
  primary-deep: "#0E93AC"
  primary-text: "#0A7C96"
  primary-soft: "#DCF1F6"
  ink: "#111214"
  ink-secondary: "#3F4247"
  ink-muted: "#696B70"
  hairline: "#E1E3E5"
  hairline-soft: "#EBEDEF"
  canvas: "#F5F7F8"
  surface: "#FFFFFF"
  surface-soft: "#EEF0F2"
  surface-well: "#F4F5F6"
  account-stage-from: "#0B1014"
  account-stage-to: "#103B47"
  on-stage: "#FFFFFF"
  on-stage-muted: "rgba(255,255,255,.72)"
  on-primary: "#05161C"
  semantic-up: "#0C6E45"
  semantic-down: "#A82C3D"
  warning: "#8A5A12"
typography:
  hero:
    fontFamily: "-apple-system, BlinkMacSystemFont, 'SF Pro Text', 'PingFang SC', 'Microsoft YaHei', sans-serif"
    fontSize: 44px
    fontWeight: 560
    lineHeight: 1.09
    letterSpacing: -1.3px
  title:
    fontFamily: "-apple-system, BlinkMacSystemFont, 'SF Pro Text', sans-serif"
    fontSize: 26px
    fontWeight: 600
    lineHeight: 1.23
    letterSpacing: -0.6px
  heading:
    fontFamily: "-apple-system, BlinkMacSystemFont, 'SF Pro Text', sans-serif"
    fontSize: 16px
    fontWeight: 600
    lineHeight: 1.375
    letterSpacing: 0
  value:
    fontFamily: "-apple-system, BlinkMacSystemFont, 'SF Pro Text', sans-serif"
    fontSize: 16px
    fontWeight: 600
    lineHeight: 1.25
    letterSpacing: 0
  body:
    fontFamily: "-apple-system, BlinkMacSystemFont, 'SF Pro Text', sans-serif"
    fontSize: 14px
    fontWeight: 400
    lineHeight: 1.43
    letterSpacing: 0
  label:
    fontFamily: "-apple-system, BlinkMacSystemFont, 'SF Pro Text', sans-serif"
    fontSize: 12px
    fontWeight: 500
    lineHeight: 1.33
    letterSpacing: 0
spacing:
  base: 4px
  scale: [4, 8, 12, 16, 20, 24, 32, 40]
  rail: 336px
  gutter: 40px
rounded:
  card: 16px
  control: 10px
  chip: 6px
  tile: 10px
  pill: 999px
---

# Trading 212 — design system

## Brand idea

A brokerage desk, not a bank lobby. The product answers "what am I worth, where is it going, what changed" in one screen. Every accent is cyan and every cyan is an action or a data mark; nothing else in the palette is allowed to attract the eye. The account stage is the one dark moment — it holds the number the user came for.

## Color rules

- **One accent.** `primary` cyan is the only voltage: actions, chart marks, active navigation, share-of-book bars. No second blue.
- **Cyan never means profit.** Profit and loss use `semantic-up` / `semantic-down` only, always with a direction glyph (▲ / ▼) or a signed amount, never color alone.
- **Canvas is cool, not grey.** `canvas` sits at L 96.6% with a faint blue cast; cards are pure white with a `hairline` border and a 1px shadow. If a section starts to look "grey", the fix is a brighter data mark, not a darker canvas.
- **The stage is the only dark mass.** Gradient from `account-stage-from` to `account-stage-to` at 158°. Inside it, text is `on-stage`; secondary text is `on-stage-muted`, never grey.
- **Cyan on cyan needs dark ink.** On `primary` fills (buttons, chart price tags in dark mode) text is `on-primary`, not white.

## Typography

- System stack only (the product ships offline, no webfonts). Weight carries hierarchy: 560 hero, 600 headings and values, 400 body, 500 labels.
- Numbers are tabular and right-aligned in every column. Percentages carry one decimal and state their window ("+30.1% since entry", "61.5% of book").
- Floor: 12px for labels, 14px for body, 16px for values. Hero is 44px, instrument title 26px.
- Never letterspace lowercase text; tracking is reserved for uppercase tickers.

## Surfaces

| Layer | Token | Rule |
|---|---|---|
| Page | `canvas` | Full-bleed background only |
| Card | `surface` | White, 16px radius, hairline border, 1px offset shadow |
| Well | `surface-soft` | Insets inside a card (control tracks, row hover) |
| Stage | gradient | Account value card only |
| Block | `surface-soft` + cyan tint | Allocation blocks: tint the fill toward cyan, not grey |

Cards earn their border. No decorative shadows, no gradient fills except the account stage, no glass.

## Motion

- 140ms, `cubic-bezier(.32,.72,0,1)` on background/color only, for row and control state changes.
- Charts move because the data moves; there is no entrance choreography.

## Do not

- Do not introduce a second accent hue for "secondary actions".
- Do not paint allocation as flat grey blocks — T212 blocks carry a cyan tint so the book reads as brand, not as a table.
- Do not put white text on cyan fills in light mode; use `primary-text` on white, `on-primary` on cyan.
- Do not use red/green as the only signal.
