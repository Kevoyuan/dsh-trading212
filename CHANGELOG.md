# Changelog

## 0.13.4 - 2026-11-02

### Documentation

- The README keeps a single hero screenshot, captured from the synthetic demo preview (`DEMO` account) instead of a live account. The earlier release commits that captured a live instance have been rewritten out of this repository's history.

## 0.13.3 - 2026-11-02

### Fixes

- The instrument header no longer crushes the identity when long English price labels and the range switcher compete for the same row: the price block wraps under the identity and stays right-aligned, and the ticker and read-only chips never break mid-word.
- Allocation blocks shed their ticker before it can ellipsize into a single letter, and brand tiles get a hairline ring so a white logo (Alphabet) stays visible on a light block.

### Documentation

- README screenshots refreshed from the running plugin: light and dark full pages, an allocation close-up and the mobile view.
- `scripts/capture-screenshots.py` now accepts `--url`, so the same shots can be captured from a live instance instead of only the static preview.

## 0.13.2 - 2026-11-02

First published release since 0.11.0; 0.12.0 – 0.13.1 existed only as local builds.

### Features

- Light and dark themes rebuilt on Trading 212's palette: cool near-white canvas, cyan accent, dark account stage, tokenised chart label chips. `design-system/tokens.css` stays canonical and `src/app/styles.css` byte-identical (134 declarations checked by `pnpm tokens:check`).
- Asset allocation blocks answer weight first: the brand mark, ticker and weight sit centred in a signal-tinted block, and the block's colour carries the selected metric (today / total return).
- Sticky topbar gets a page-coloured ground, so cards no longer ghost through the gaps between its capsules.

### Fixes

- Treemap slivers no longer bleed copy into neighbouring blocks: per-size tiers shed lines (change, ticker, weight, mark) instead of clipping text, and the display-size weight only applies to blocks wide enough for it.
- The fourth line (today / total change) now only renders where a block can hold it, keeping the T212 three-line look on small blocks.

### Documentation

- Design previews regenerated; preview mocks follow the new block structure.
- Ten canvas artboards added under `designs/` (A–G exploration, P overview, Q density variant, R account-value detail dialog) with the Trading 212 brand rules.
