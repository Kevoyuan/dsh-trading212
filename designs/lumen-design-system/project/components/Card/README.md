# Card

A plate that holds exactly one idea.

## Construction

`--surface`, 1px `--hair`, radius `--r-4` (18), `--sh-plate`, padding 20
(`--card-pad`). Nested frames are forbidden: the file lost an inset `::before`
bezel because it read as a picture frame around a picture.

The three levels are deliberate:

| Level | Recipe | Use |
| --- | --- | --- |
| bare | no border, no shadow | bands on the canvas, separated by `--g-*` rhythm |
| plate | `--surface` + 1px `--hair` + `--sh-plate` | cards, tables, the chart |
| float | `--glass` + 1px + `--sh-float` | sticky navigation capsules only |

## When two cards sit in one column

One is the answer (plate, `--surface`), the other is context (well, `--well`). Two
identical plates side by side invite the reader to compare things that are not
comparable.

## What the consumer provides

- One idea. If the card needs a title, a subtitle and a legend to be understood, it
  is two cards or a section.
- Padding from the density contract, not a local number.
- No shadow without the hairline: elevation is a decision, structure carries the
  layout.

## Don't

- Don't put a card inside a card.
- Don't use a left-border accent stripe to signal state; that is what
  `--accent-soft` selection or a badge is for.
- Don't give a card a radius outside the scale.
