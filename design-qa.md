# Design QA

## Comparison Target

- Authoritative product direction: `/Volumes/SSD/Projects/Code/dsh-trading212/DESIGN.md`
- Source visual truth path: unavailable. The user confirmed the detail-first direction in `DESIGN.md`, but no approved visual target exists for that direction.
- Browser-rendered implementation screenshot: `/Users/kevinsyuan/.gstack/projects/dsh-trading212/designs/design-audit-20260828/screenshots/final-desktop.png`
- Mobile implementation screenshot: `/Users/kevinsyuan/.gstack/projects/dsh-trading212/designs/design-audit-20260828/screenshots/final-mobile.png`
- Desktop viewport: 1440 x 1000 CSS px, deviceScaleFactor 1. Full-page capture: 1440 x 1905 px.
- Mobile viewport: 390 x 844 CSS px, deviceScaleFactor 1. Viewport capture: 390 x 844 px.
- Density normalization: none. Captures were produced at 1x CSS density.
- State: Chinese locale, balances visible, Apple selected, 1-year range, read-only account.

## Evidence

- Desktop before/after evidence: `/Users/kevinsyuan/.gstack/projects/dsh-trading212/designs/design-audit-20260828/screenshots/desktop-before-after.png`
- Mobile before/after evidence: `/Users/kevinsyuan/.gstack/projects/dsh-trading212/designs/design-audit-20260828/screenshots/mobile-before-after.png`
- Focused mobile navigation evidence: `/Users/kevinsyuan/.gstack/projects/dsh-trading212/designs/design-audit-20260828/screenshots/finding-002-after.png`
- Focused chart evidence: `/Users/kevinsyuan/.gstack/projects/dsh-trading212/designs/design-audit-20260828/screenshots/finding-003-after.png`
- A source-to-implementation full-view comparison cannot be produced because no approved detail-first source visual is available. The before/after boards document the design-review iteration only and are not treated as source fidelity proof.

## Findings

- [P1] Approved visual source is missing
  - Location: entire detail-first overview.
  - Evidence: `DESIGN.md` describes the intended product hierarchy, but it is not a visual target with measurable typography, spacing, crop, assets, and state.
  - Impact: the implementation can be reviewed for product quality, but visual fidelity cannot be passed under the Design QA contract.
  - Fix: approve a desktop and mobile visual target for the current detail-first direction, then capture the implementation at matching viewport, density, data, and interaction state.

- [P2] Host-rendered React implementation cannot be captured standalone
  - Location: `http://127.0.0.1:4173/trading212/`.
  - Evidence: the standalone Vite render shows the dsh Host 404 error page and logs two 404 resource errors. The independent static preview renders correctly and has no console errors after interaction testing.
  - Impact: static-preview improvements are verified, but the final host-integrated React screen cannot be compared visually in this environment.
  - Fix: run the plugin inside a working dsh Host with representative API data, then recapture desktop and mobile states.

## Required Fidelity Surface Review

- Fonts and typography: system Chinese UI stack is coherent, antialiasing is clean, financial figures use tabular numerals, and hierarchy is readable. Exact source matching remains unverified without an approved visual target.
- Spacing and layout rhythm: detail-first desktop hierarchy is calm and mobile now brings the selected instrument to the first viewport. Outer gutters, card radii, and section rhythm are internally consistent.
- Colors and visual tokens: navy shell, light canvas, blue interaction accent, and green/red finance semantics map to `DESIGN.md`. No decorative gradients or glow treatments are present.
- Image quality and asset fidelity: the static preview uses ticker initials rather than production logo assets. The host-rendered asset state could not be captured, so final asset fidelity remains unverified.
- Copy and content: read-only status, data source caveats, chart interval, range options, and visible trade-marker count are coherent. The preview now exposes all six runtime ranges.
- Responsiveness: verified at 320px and 390px without page-level horizontal overflow. At 320px, all five navigation items remain single-line and 44px high.
- Accessibility and interaction: privacy toggle, range selection, and investment-list collapse were tested; active/ARIA state updates correctly and the console remains clean. Full keyboard, loading, empty, and error-state validation requires the host-rendered app.

## Comparison History

### Iteration 1

- Earlier finding: mobile content order placed the full account rail before the selected instrument.
- Fix made: main pane now precedes the left pane below 900px.
- Post-fix evidence: `finding-001-after.png`; main pane moved from 1515px to 107px at 390px width.

### Iteration 2

- Earlier finding: Chinese navigation labels wrapped vertically at 320px and range buttons were 29px tall.
- Fix made: single-line, non-shrinking navigation items; mobile controls use a 44px minimum target.
- Post-fix evidence: `finding-002-after.png`; five navigation items fit at 54 x 44px and labels remain one line.

### Iteration 3

- Earlier finding: static preview omitted 1-day and 1-week runtime ranges, lacked chart axis context, and reported 14 trades while showing 3 markers.
- Fix made: six runtime ranges, price/date ticks, and matching three-trade copy.
- Post-fix evidence: `finding-003-after.png`; desktop chart now exposes price, time, and range context.

## Primary Interactions Tested

- Balance privacy toggle and accessible label update.
- Range selection and `aria-checked` state.
- Investment-list collapse and arrow state.
- Desktop and mobile layout overflow.
- Browser console after interactions: no errors in the static preview.

## Implementation Checklist

- Produce or approve a detail-first desktop source visual.
- Produce or approve a 390px mobile source visual.
- Launch the plugin inside dsh Host with representative data.
- Capture the same data, range, locale, privacy, and selected-instrument state.
- Compare source and host render in a combined input.
- Verify keyboard, loading, empty, error, and production logo states.

final result: blocked

Blocker: no approved visual source exists for the confirmed detail-first direction, and the host-integrated React implementation cannot be rendered from the standalone Vite server.
