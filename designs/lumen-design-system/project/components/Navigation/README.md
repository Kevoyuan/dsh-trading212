# Navigation

Two capsules, not one strip: navigation is one object, search and tools another.

## Construction

Radius `--r-3` (14) on the capsule, `--r-2` on tabs. Active tab is `--accent-soft`
ground with a `--accent-deep` label. **Never a solid accent fill**: the navigation is
chrome, and the page's accent belongs to the account total.

The right capsule carries search, the privacy toggle, the locale switch and help.
Splitting the strip is what stops a nine-item bar from reading as one undifferentiated
control.

## States and accessibility

Tabs are links, not buttons: each one is an `<a href>` with `aria-current="page"` on
the active item. Icon-only controls carry both `aria-label` and `title`. Focus is the
2px `--accent` outline with 2px offset, inside the capsule so it is not clipped.

On a phone the two capsules stack: navigation first, tools second, both full width.
Never hide a tool behind an overflow menu that has no discoverable trigger.

## What the consumer provides

- 3–6 destinations, in the product's own words (`Overview`, `Holdings`, `History`,
  `Settings`, `Help`).
- The current location, so exactly one tab is active.
- A single privacy control: masking is a state of the whole workspace, not a
  per-panel toggle.

## Don't

- Don't add a logo lockup inside the navigation capsule; the wordmark lives outside it.
- Don't animate the active background between tabs — the thumb belongs to a
  segmented control, not to navigation.
- Don't stack three rows of chrome above the content.
