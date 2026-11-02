# SegmentedControl

An exclusive switch (time range, view mode) whose selection has to survive greyscale, low-quality screens and screenshots.

## Construction

Track `--well` with an inset 1px `--hair`, radius `--r-2`, padding 3. Thumb
`--surface` + 1px `--hair` + `--sh-plate`, radius `--r-1`, sliding on `transform`
at `--d-2` with `--ease`.

**The selected label is `--ink-1` at weight 600.** White-on-grey is what *disabled*
looks like; a selection state that reads as disabled has failed.

## Behaviour

`role="radiogroup"` with one `role="radio"` per option, arrow keys move selection,
`aria-checked` on the active option. The thumb animates position only — never width
and never colour.

`prefers-reduced-motion` jumps the thumb instead of sliding it.

## What the consumer provides

- 2–7 short options that are mutually exclusive. More than seven belongs in a menu.
- The selected value, controlled by the parent.
- A visible label for the group (`aria-label`), since the options are usually
  single words such as `1D` `1W` `1M`.

## Don't

- Don't use it for multi-select — that is a set of checkboxes.
- Don't put it in a card that is itself recessed: the track needs `--well` against
  `--surface` to read as a recess.
- Don't animate the thumb with layout properties.
