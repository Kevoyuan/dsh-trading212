# DataTable

The holdings table: comparable numbers down a column, with the fewest rules that still let the eye track a row.

## Construction

- Header `type-micro` at weight 500 in `--ink-3`, sentence case, one `--hair` below.
- Rows `--row-h` (48), one `--hair` between rows, none after the last.
- Numerics right-aligned, `tabular-nums`, always with their unit in the cell.
- Row hover `--well`.
- **Selection is carried by the asset name, not by a row fill:** the shipped
  stylesheet colours the selected row's name (`--accent`) and nothing else —
  `.asset-link.is-selected strong`. SPEC §4.5 still specifies an `--accent-soft`
  row fill plus a 2px inset accent rule; that treatment is not implemented, so it
  is not previewed here.
- Signed money uses `.tone-positive` / `.tone-negative` on the cell (the
  `.positive` / `.negative` pair still resolves in the stylesheet, but the tone
  classes are the current spelling).
- Wide tables scroll inside the table's own box (`.table-scroll`); the page never
  scrolls sideways.

## Number formatting

Money: two decimals, thousands separated, currency symbol attached (`€5,428.10`).
Quantities: up to four decimals but **trailing zeros trimmed** (`27.4`, not
`27.4000`) — one formatter owns this and no call site passes its own digit count.
Signed returns always carry the sign, even when positive, and take `--pos` / `--neg`.

## What the consumer provides

- A stable row order and an explicit sort state; an unsorted table of money reads as
  ranked when it is not.
- The asset identity cell: initials tile + name + `TICKER · CURRENCY` micro line.
- A decision about the tail: a truncated table is a claim about what is missing, so
  fold the remainder into an explicit `and N more` row.

## Don't

- Don't zebra-stripe rows: the hairline already tracks the row, and stripes make
  the hover state ambiguous.
- Don't put an action button in every row; the row itself is the affordance.
- Don't shrink type to fit more columns — drop a column instead.
