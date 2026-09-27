# Direction gate — SELECTED: C · Lumen, colourway "Cobalt Paper"

## Prior record
Three real drafts (A · Meridian editorial, B · Kernel dark terminal, C · Lumen soft
structuralist) were rendered over the same DOM and measured by the same audit before any
implementation. The user chose **C** and asked for better colour; three colourways were then
derived over C's unchanged layout and **Cobalt Paper** was applied.
Implementation and verification: see `REDESIGN-REPORT.md`.

## Iteration 2 — "开始美化设计" (this pass)
Exempt from the three-direction gate under the "iteration after a direction is chosen" rule:
the language (Lumen / Cobalt Paper) is already the user's choice; this pass changes
**composition and the type ladder**, not the direction.

### Evidence that started it
Measured at 1440x900: the portfolio total (40px) sat in a 336px rail while a single
instrument's price (31px) held the centre of an 817px canvas, and the instrument price sat
28px higher on the page. `DESIGN.md` states the intent is "leads with the account snapshot";
the composition did not. Separately, the type ladder held 7 sizes of which the 31px tier
served only the instrument price, sitting 1.3x from the hero.

### Three real composition variations rendered
| | account value width | chart | instrument price | first fold | page height |
|---|---|---|---|---|---|
| baseline | 294x56 | 990x450 | 31px | 5/10 | 2109 |
| V1 balanced | 286x56 | 990x420 | 25.5px | 5/10 | 2096 |
| V2 portfolio canvas | **902x56** | 382x351 | 21px | 4/10 | 2830 |
| V3 ledger band | 632x56 | **1354x482** | below fold | 6/10 | 3036 |

All four pass the system gate (contrast, page overflow, overlap, type/radius/hairline/shadow
counts). Board: `design-demos/first-fold.html`.

### One recorded failure
Reordering the rail (`order`) to pull the allocation mosaic above the fold **measured worse**:
first-fold complete blocks fell 5/10 -> 4/10, because account (254px) + cash (231px) already
consume 548px of a 900px fold and the two portfolio blocks are 341px and 311px. Reverted. The
constraint is size, not order.

### Selection
> "v1"

**V1 - Balanced** landed in place in src/app/styles.css. The 31px tier is retired as a
content size, the hero gap widened from 1.29x to 1.57x, and the instrument detail page now has
its own single hero. V2 and V3 remain available as unbuilt variants if the priority changes.

## Note on the source tree
The shipped `src/app/styles.css` still carries the approved C · Cobalt Paper system with no
composition change from this pass. Variations live in `design-demos/` only.
