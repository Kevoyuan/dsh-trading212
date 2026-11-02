# AllocationMosaic

Area-encoded allocation, where the number carries the colour and the tile does not shout.

## Construction

- **Area encodes market value.** If every tile is the same size it is a grid of
  coloured boxes and must be replaced by a list.
- Tile = 1px border at 20% of the tile's signal + a 7% tint of the same signal. A
  100% pastel fill makes five tiles read as five alerts; the *number* is what
  carries the colour.
- The percent is the tile's answer: centred in the area it was given, at
  `type-title` when the tile is taller than 150px, `type-row` otherwise.
- Every tile carries a ▲/▼ glyph so direction is never colour-only.
- Selection is `--accent`, never the tile's own signal.

## What the consumer provides

- The value and the signed return for each tile, already formatted with their units.
- Stable ordering (largest first) so two screenshots of the same portfolio compare.
- A minimum tile size: below roughly 40×40 the label does not fit, so the tail
  belongs in a list or an explicit `and N more` row.

## Don't

- Don't use the mosaic for anything that is not area-proportional.
- Don't print the tile's percentage at a size the area cannot support, and never
  below `--fs-micro`.
- Don't change tile colour on hover; hover raises the border, selection takes the
  accent.
