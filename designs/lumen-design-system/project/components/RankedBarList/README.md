# RankedBarList

Magnitude ranked into a fixed value column, where a loss grows leftwards so the sign survives greyscale.

## Construction

Grid `1fr | minmax(96px, 1.35fr) | 104px` — **the value column is fixed**, because
six rows that size their own value column produce six right edges and stop being a
column of comparable numbers.

Track `--hair-strong`, 8px, radius 2. Fill radius 2 — not a pill: a pill fill reads
as a capsule, not a measure. A magnitude bar takes `--accent`; a signed bar takes
`--pos` / `--neg`.

**A loss grows leftwards from the zero point at the right edge.** Direction, not
colour alone, is what makes the row legible to a colour-blind reader.

## The tail

A truncated ranked list is a claim about the rest of the portfolio. Fold the
remainder into one explicit row (`5 others`, `其他 5 项`) rather than cutting at six
and pretending the list is complete.

## What the consumer provides

- A ranking metric, named in the panel heading and in the value's unit.
- Signed values with their sign; the component never infers direction from colour.
- Zero-point labels when the axis is not obvious.

## Don't

- Don't mix metrics in one list (return beside absolute P/L).
- Don't animate the width on mount; a bar that arrives at its length is data, not a
  reveal effect.
- Don't use it for a single value — that is a metric band or a figure.
