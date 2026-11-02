# MetricBand

Five equal facts about one object — never a dashboard row of unrelated numbers.

## Construction

The band is a row of label/value cells with one 1px `--hair` above each and 1px
vertical rules between. Label `type-micro` in `--ink-3`; value `type-row` in
`--ink-1`. Values carry their units (`€5,428.10`, `27.4`, `+18.3%`) and signed
values keep their sign and take `--pos` / `--neg`.

**Cell count is fluid, not fixed.** SPEC §4.9 says five equal columns; the shipped
grid is `repeat(auto-fit, minmax(min(150px, 100%), 1fr))`, which gives five columns
at desktop width, folds to two under 680px, and lets a four-fact band fill its row
instead of leaving a hole. The preview renders the shipped behaviour.

The band answers "what is this position, in five numbers": value, return, shares,
average price, cost. It is not a KPI strip — if two of its cells measure different
objects, it is two bands.

## What the consumer provides

- Exactly the five facts, each already formatted.
- A label short enough to fit the column at `--fs-micro` (about 18 characters at
  1440, 12 at 390).
- A stable height so several bands stack into a comparable column.

## Don't

- Don't put a sixth column in; use a second band or a table.
- Don't let one value take a display size — the band is context, and the page has
  exactly one loud thing.
- Don't drop the vertical rules on mobile: they are what keeps five numbers from
  reading as one run-on line. Wrap the band to two rows instead.
