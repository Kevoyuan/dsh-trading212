# Design QA

## Comparison Target

- Source visual truth: `/Volumes/SSD/Projects/Code/dsh-trading212/docs/images/dashboard-concept-v5.png`
- Rendered implementation: `/Volumes/SSD/Projects/Code/dsh-trading212/docs/images/dashboard-implementation-v12-accurate-short-ranges.png`
- Supplemental implementation state: `/Volumes/SSD/Projects/Code/dsh-trading212/docs/images/dashboard-implementation-v12-accurate-short-ranges-mobile.png`
- Viewport: desktop comparison normalized to 1138 CSS-width-equivalent pixels; the stored implementation capture is 1138 px wide. The original browser viewport and device scale factor were not recorded with the screenshot, so CSS width and density cannot be independently verified.
- State: Chinese locale, balances visible, overview route. The source shows the portfolio-summary/holdings state; the implementation shows MongoDB selected with the 1-week market chart and holding detail. These are not the same information-architecture state.
- Source dimensions: 1507 x 1044 px.
- Implementation dimensions: 1138 x 1262 px.
- Density normalization: source downsampled proportionally to 1138 x 788 px; implementation cropped to its top 1138 x 788 px. No upscaling was used. Device scale factor is unknown for both stored captures.

## Evidence

- Full-view combined comparison: `/Volumes/SSD/Projects/Code/dsh-trading212/docs/images/design-qa/full-view-comparison.png`
- Normalized source: `/Volumes/SSD/Projects/Code/dsh-trading212/docs/images/design-qa/source-v5-normalized.png`
- Normalized implementation crop: `/Volumes/SSD/Projects/Code/dsh-trading212/docs/images/design-qa/implementation-v12-above-fold.png`
- Focused header/primary-region comparison: `/Volumes/SSD/Projects/Code/dsh-trading212/docs/images/design-qa/header-region-comparison.png`
- Focused regions were required because the navigation branding, typography, summary hierarchy, and top-of-page controls were not legible enough to judge from the full-view comparison alone.

## Findings

- [P1] Dominant above-the-fold task does not match the source
  - Location: desktop overview, `.t212-cockpit-layout` and `.cockpit-instrument-container`.
  - Fidelity surface: information architecture, layout, copy/content.
  - Evidence: the source dedicates the main pane to portfolio performance and a six-row holdings ledger. The implementation dedicates the main pane to a selected MongoDB price chart and holding-detail metrics, pushing the portfolio ledger below the fold. This materially changes region proportions, visible content, and the first task offered to the user.
  - Impact: a user comparing the build with the source will perceive a different product screen rather than a faithful implementation.
  - Fix: first resolve the intended source of truth. If `dashboard-concept-v5.png` is authoritative, restore the portfolio-performance summary and complete holdings ledger as the main above-the-fold content, moving instrument detail to a secondary state. If `DESIGN.md` is authoritative, replace the obsolete source visual with an approved detail-first target and rerun QA.

- [P1] Source brand asset is replaced by a text treatment
  - Location: top-left navigation brand, `.t212-invest-brand-pill`.
  - Fidelity surface: image quality and asset fidelity, icons, typography.
  - Evidence: the source shows the Trading 212 wordmark; the implementation shows a triangle glyph, `INVEST`, and a separate `LIVE` badge. The focused comparison makes the substitution visible.
  - Impact: branding is one of the most noticeable fidelity cues, and the replacement also changes the header's visual balance.
  - Fix: if the source remains authoritative and use is permitted, use the real source wordmark asset at the measured source size. Do not recreate it with text, CSS, or inline SVG. If the `INVEST` treatment is intentionally product-specific, capture it in the approved source visual and classify the deviation as expected.

- [P2] Summary hierarchy and typography scale drift from the source
  - Location: source performance overview versus `.cockpit-inst-head`, `.inst-price-main`, and left account card.
  - Fidelity surface: fonts and typography, spacing/layout rhythm.
  - Evidence: the source uses one restrained portfolio total with compact peer metrics; the implementation introduces two competing display-scale values (`€4,369.51` and `US$444.99`) and a much taller chart header. The system/PingFang-style family is broadly compatible, but the display scale, weight hierarchy, wrapping context, and vertical rhythm are not equivalent.
  - Impact: the implementation feels more instrument-centric and less dense than the source, reinforcing the P1 task mismatch.
  - Fix: after the target state is resolved, use one dominant account-level number above the fold, reduce secondary financial values to the source's compact metric scale, and align card/header padding to the approved target.

- [P2] Responsive evidence cannot establish source fidelity
  - Location: mobile implementation capture at 390 x 844 px.
  - Fidelity surface: responsiveness, layout, interaction state.
  - Evidence: a current mobile implementation screenshot exists, but there is no mobile source visual. Its captured state begins with clipped prior content above the instrument card, so it also does not establish the first-paint state.
  - Impact: mobile ordering, overflow, text wrapping, tap targets, and above-the-fold hierarchy cannot be accepted against a source target.
  - Fix: provide or approve a 390 px mobile target and recapture the implementation at the same scroll position and state. Include top-of-page, range control, holdings table overflow, focus, and selected states.

## Required Fidelity Surface Review

- Fonts and typography: family/fallback appears compatible with the source's system Chinese UI treatment, and antialiasing appears clean. Weight, display size, hierarchy, and density are not faithful because the dominant content differs. Exact line height and letter spacing cannot be accepted until the same state is compared.
- Spacing and layout rhythm: outer gutters, light-card treatment, corner radius, and navy-shell proportions are directionally close. Main-region proportions, vertical rhythm, and above-the-fold density are materially different and remain actionable.
- Colors and visual tokens: navy shell, light canvas, blue selected state, and green/red finance semantics are close to the source. Minor hue/opacity differences are acceptable at this stage and are not blocking independently.
- Image quality and asset fidelity: implementation stock marks are sharp, but the source brand wordmark is missing and replaced by text/glyph UI. This remains blocking while the source is authoritative.
- Copy and content: Chinese UI copy is coherent and the read-only label is appropriate. Dynamic balances, symbols, and counts are treated as source-backed data differences rather than visual defects. The app-specific screen content still does not match the source's portfolio-overview task.
- Icons: navigation icons are internally consistent outline icons, but the source uses a different visual vocabulary and no like-for-like interaction-state comparison is available.
- Accessibility and interaction states: focus, keyboard reachability, labels, reduced motion, hover, loading, empty, and error states were not tested because only stored screenshots were available. No browser-rendered console check was possible in this run.

## Objective Mismatches vs. Intentional Constraints

- Objective mismatch: overview-first source versus detail-first implementation.
- Objective mismatch: source wordmark versus text/glyph brand treatment.
- Potentially intentional: `DESIGN.md` explicitly specifies a selected-instrument detail pane and an `INVEST` top bar. This conflicts with the older visual source and must be resolved before implementation changes are safe.
- Acceptable dynamic variance: prices, holdings count, pending-order count, selected symbol, and account totals may differ when backed by current portfolio/market data.

## Open Questions

- Is `dashboard-concept-v5.png` still the approved source of truth, or has the detail-first behavior in `DESIGN.md` superseded it?
- If `DESIGN.md` is authoritative, what approved visual target should replace the concept screenshot for future QA?
- Is the `INVEST` brand treatment intentional and approved, or should the source wordmark be used?
- What is the intended mobile first-paint and scroll state?

## Implementation Checklist

- Confirm one authoritative visual target and matching screen state.
- If the concept remains authoritative, restore overview-first composition and the source brand asset.
- If the current product direction remains authoritative, create/approve a detail-first desktop source visual instead of editing toward the obsolete concept.
- Capture desktop and mobile renders at recorded CSS viewport sizes and device scale factors.
- Compare the approved source and revised render in one combined image.
- Test navigation, selected holding, range controls, table overflow, keyboard focus, loading, empty, and error states; check console errors.
- Rerun Design QA until no P0/P1/P2 findings remain.

## Follow-up Polish

- [P3] Once the screen state matches, sample the source navy, canvas, divider, and finance colors and map them to named CSS tokens.
- [P3] Verify optical alignment and stroke weight for every navigation and utility icon at 200% zoom.
- [P3] Record the exact font stack and browser rendering environment with the approved source capture.

## Comparison History

### Iteration 1 — blocked

- Earlier findings: overview/detail information-architecture mismatch; source brand asset substitution; typography and density drift; missing comparable mobile source.
- Fixes made: no product-code fixes were applied. The visible differences conflict with the current intent documented in `DESIGN.md`; changing the implementation without resolving the source would risk undoing an intentional product direction.
- Post-fix visual evidence: not available because the source-of-truth ambiguity prevents a safe fidelity iteration. Normalized initial evidence is retained in `docs/images/design-qa/`.

final result: blocked

Blocker: the available source visual and the documented/current implementation represent different approved product directions and different screen states. A matching authoritative source must be selected before fidelity fixes can be implemented and verified.
