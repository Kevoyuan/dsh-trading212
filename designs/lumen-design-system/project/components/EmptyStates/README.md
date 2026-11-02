# EmptyStates

Empty, loading and error: one sentence, one action, and the shape of what is coming.

## Empty

One sentence saying what would be here, and one action that produces it. No
illustration: in a data workspace, a drawing where the data should be reads as a
failure of the product, not as friendliness.

```
No trades in this range.
[Change range]
```

## Loading

Skeleton blocks with the incoming content's shape — a chart placeholder the size of
the chart, row placeholders the height of rows. Never a full-page spinner over a
layout that has already been measured: the spinner erases the structure the reader
was building and then re-flows it.

The skeleton takes `--well` on `--surface`, at the real block sizes, and does not
shimmer unless `prefers-reduced-motion` allows it.

## Error

Say what happened, what it means for the data already on screen, and offer one
retry. An error that replaces valid numbers with an apology is a regression.

```
Prices are unavailable right now.
Holdings and history are still accurate; the chart is hidden.
[Retry]
```

## What the consumer provides

- Which of the three states this is, and the one action (or none).
- The remediation copy, sanitized: no stack traces, no upstream response bodies, no
  credentials.
- The surrounding layout, so the state lands inside the panel it belongs to rather
  than on top of the whole workspace.

## Don't

- Don't use `--pos` or `--neg` here: those hues assert a signed money value, and an
  error is not a loss.
- Don't offer two actions.
- Don't hide the data that is still valid.
