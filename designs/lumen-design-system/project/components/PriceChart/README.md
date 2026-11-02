# PriceChart

One series, one dashed cost line, and execution fills drawn as exactly the shapes the legend shows.

## Construction

- One series: `--accent`, no fill, no gradient, no second axis. The stroke width
  and the dashed cost line are set in the chart library's options in
  `src/app/App.tsx` (`lineWidth: 2`, `LineStyle.Dashed`), not in CSS — SPEC §4.7
  still says 1.6px. The preview draws the marks at the shipped width.
- Buy = `--pos` square. Sell = `--warn` triangle. **The legend draws those exact
  shapes**; a legend that shows something the chart does not contain is worse than
  no legend.
- Average cost = dashed `--ink-4`, labelled in the legend. An unlabelled dashed
  line is an artifact, not information.
- Price scale on the right, inside the plate, never overlapping the series.
- One meta row under the chart: legend left, interval + fill count right.
- **Known debt:** the library's axis font is set to 10.5px in the chart options,
  below the system's own 12px floor. The README's "nothing below 12px" rule is
  correct and the implementation is wrong; fix the option, not the rule.

## Header

Title row is the instrument identity (`Apple Inc.` + `AAPL · USD · NASDAQ`), the
last price and the change. Range control is a SegmentedControl. No instructional
prose inside a chart header — instructions belong in Help.

## What the consumer provides

- A single currency per chart, stated in the header micro line when it differs from
  the account currency.
- The fills in range, as real execution records (date, side, quantity, price) —
  the markers are not decoration.
- An accessible summary: `role="img"` plus an `aria-label` naming the instrument,
  the range and the fill count.

## Don't

- Don't put two instruments on one axis.
- Don't colour the line by performance: the sign lives in the header figure, and a
  green line over a loss claim is a contradiction.
- Don't let markers sit outside the price scale — clamp or omit, never float.
