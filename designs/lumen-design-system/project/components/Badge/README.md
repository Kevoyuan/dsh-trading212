# Badge

A short status word or unit chip. It labels; it never carries an action.

## Construction

Radius `--r-1`, height 18–20, `type-micro`, `--well` ground with an inset 1px
`--hair`, label `--ink-2`. A single-word badge may go `--r-pill`; anything longer
stays at `--r-1`, because a pill around two words reads as a button.

The only saturated fills are signed states: `--pos-soft` for a gain, `--neg-soft`
for a loss, each with its `--pos` / `--neg` label. A tinted badge is still a label,
so it takes the low weight.

## What the consumer provides

- Three or four characters to one short word. If it needs a sentence, it is a
  paragraph or an empty state, not a badge.
- The state, not the colour: `tone="pos" | "neg" | "warn" | "neutral"`.

## Don't

- Don't put a badge in a heading's line box: its smaller leading lifts the baseline.
- Don't use a badge as a filter or a dismissible token — those are controls and
  need a 44px target.
- Don't invent a colour outside the token layer for a new state; add a role instead.
