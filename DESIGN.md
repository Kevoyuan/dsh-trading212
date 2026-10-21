# Lumen — design system

The product's visual rules live in three files, not in this one:

| File | What it is |
| --- | --- |
| [`design-system/tokens.css`](design-system/tokens.css) | **The canonical token layer.** Colour roles, type scale, space, radius, elevation, motion, component contracts. |
| [`design-system/SPEC.md`](design-system/SPEC.md) | **The rules.** Principles, foundations, every component with its states and prohibitions, content rules, accessibility contract, governance. |
| [`design-system/styleguide.html`](design-system/styleguide.html) | **The living specimen.** Every token and component rendered from `tokens.css`, light and dark. |
| [`design-system/AUDIT.md`](design-system/AUDIT.md) | Why the previous layer was rebuilt, with before/after measurements. |

`src/app/styles.css` is the only implementation. It carries a byte-identical
copy of the token blocks (the preview inlines that file, so it cannot `@import`),
and `pnpm tokens:check` fails when the two drift apart.

```bash
pnpm tokens:check      # token drift between tokens.css and styles.css
pnpm preview:build     # regenerate preview-redesign.html / -en.html
pnpm verify:design     # both
```

## The short version

- **Six type tiers**: 12 / 14 / 16 / 20 / 26 / 40, mobile hero 32. Nothing below
  12px, anywhere, including chart axes and legal text. The display tier is the
  only fluid one — `clamp(32px, 2.4vw + 16px, 40px)`, endpoints on the scale.
- **One accent** (`--accent`, deep navy `#2C3E63`) for interaction, selection and
  magnitudes. Green and red are reserved for signed money and are never
  decorative. The single filled control is ink (`--accent-plate`), not accent.
- **The ground is neutral.** `--canvas` carries no blue cast, and `--well`
  always sits between canvas and surface in both themes, so a recess is a recess
  wherever it appears.
- **Five radii**: 6 chip · 10 control · 14 card · 18 plate · 999 pill (badges,
  dots, avatars, segmented thumbs only). A button is never a pill.
- **Three elevations**: bare (rhythm + hairline) · plate (surface + 1px +
  `--sh-plate`) · float/overlay. Never a shadow without a line.
- **One hero per page.** The account total, or the instrument price on the
  detail page. Nothing else competes.
- **The number is the interface.** Tabular figures, zero tracking, units next to
  values, labels at the micro tier. Quantities trim trailing zeros (`27.4`, not
  `27.4000`) through one `shareCount()` formatter.
- **Two currencies never share a block unlabelled.** A quote in the listing
  currency beside a result in the account currency carries one micro line naming
  both: `报价 USD · 收益折合 EUR`.
- **The preview may not lie.** It renders only what a `.tsx` file renders, and
  is generated, never hand-edited.

## History

The 2026-09 layer claimed six type sizes, four radii, "no stacked overrides" and
"0 contrast failures". Measured, it had ten type sizes, 39 runs at 11px, a
`--r-pill` alias that made 55 elements 18px, three appended override passes
(~600 lines), six dark-mode contrast failures, and a preview section no
component rendered. `design-system/AUDIT.md` records the numbers; the previous
text of this file is in git history.

A second pass closed the five items the first one left open: quantities printed
four decimals, the instrument head mixed `$` and `€` with no label, `--fs-hero`
was flat at 40px above 681, the account plate was content-width between 681 and
980 (422px inside a 755px column), and 12 CSS classes still described components
that no longer exist. `design-system/AUDIT.md` §10–15.

A third pass replaced the palette. The old one was the default dashboard plan —
blue-grey canvas, royal-blue accent, blue-black ink, mint and salmon in dark —
and it read as a template no matter how disciplined the spacing was. The canvas
is neutral and one step deeper, the accent is ink-navy, the money hues are
desaturated pine and terracotta, and the dark theme's depth order was fixed
(`--well` had been *lighter* than `--surface`, inverting every recess). Still
0 contrast failures at 1440 and 390 in both themes.
