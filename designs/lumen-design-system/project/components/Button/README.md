# Button

The action control. There is at most one filled button per view, and it is ink — not the accent hue.

## Variants

| Variant | Ground | Label | When |
| --- | --- | --- | --- |
| Primary `.primary` | `--accent-plate` | `--accent-plate-ink` | the one action the view exists for |
| Secondary `.pill-btn` | `--surface` + 1px `--hair` | `--ink-2`, accent tint on hover | the default action |
| Quiet `.t212-pill-action` | none (transparent) + inset hairline | `--ink-2`, hover `--well` | low-weight actions in a rail footer |
| Danger `.pill-btn.danger` | none | `--neg`, hover `--neg-soft` | a destructive action — never a red fill at rest |
| Icon `.icon-btn-ghost` | none | `--ink-4`, hover `--well` | a control whose meaning is its icon; always labelled |

The ghost variant in SPEC §4.1 has no class of its own in the stylesheet — the
transparent quiet control is `.t212-pill-action`; `.icon-btn-ghost` is its icon
form. Danger exists only as an outline, never as a fill.

## Shape and type

Three control heights exist in the stylesheet — `--control-h-sm` 28, `--control-h`
34, `--control-h-lg` 40 — and `--r-2` is the control radius. The one filled control,
`.primary`, is the exception the product actually ships: 44px tall at `--r-pill`,
because it is the only filled button on the screen and carries the page's single
strongest action. Label `type-body` at weight 500.

> **Contract note.** SPEC §4.1 still describes the primary as a 28/34/40 control at
> `--r-2`. The stylesheet is what ships and what the preview renders; treat the 44px
> pill as current truth and bring SPEC into line the next time this area is touched.
> The secondary `.pill-btn` is also a pill (outline, 8px vertical padding), so the
> "a button is never a pill" rule in the README's foundations applies to the
> documented control sizes, not to the two shipped fills.

## States

Rest → hover (one step darker ground) → active (`transform: scale(.98)`) →
focus-visible (2px `--accent` outline, 2px offset) → disabled (`opacity .45`,
`cursor: not-allowed`, no hover).

A disabled control must carry its reason in the surrounding copy. A dead button with
no explanation is a bug, not a state.

## What the consumer provides

- The label as a verb (`Save`, `Retry`, `Show all`) — labels in this system are
  nouns, verbs are for buttons.
- One of the four variants; a view never invents a fifth.
- An `aria-label` when the visible label is an icon only.

## Don't

- Don't fill a button with `--accent` or `--pos`/`--neg`: signed hues assert money,
  and a filled accent competes with the hero figure.
- Don't stack two primary buttons in one view.
- Don't use a button for navigation — that is a link, and it stays a link.
