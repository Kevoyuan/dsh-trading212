# dsh-trading212 UI refresh · Trading 212 inspired blue system

## What changed

- Replaced the previous Carbon Ledger dark-canvas treatment with a deep navy Trading 212-style product shell and a light portfolio canvas.
- Kept the existing read-only architecture and API contracts intact.
- Added an account snapshot strip driven by `PortfolioSnapshot.analytics`: invested value, cost basis, realized P/L, FX impact, holdings count, Pie count, cash weight, top-three concentration, and reserved funds.
- Kept the selected holding as the primary detail workflow with Yahoo Finance price history and Trading 212 fill markers.
- Kept portfolio allocation, P/L contributors, currency exposure, pending orders, and exact holdings in the default overview.
- Updated the standalone preview to include the same hierarchy and representative source-shaped values.

## Data integrity notes

The preview file is intentionally static and is only a visual shell. The real application continues to fetch through `/api/trading212/status`, `/portfolio`, `/history`, and `/market`. No API key, secret, live account value, or order action is embedded in the preview. Currency values are formatted using the account or instrument currency returned by the API.

## Verification

- `pnpm typecheck` ✅
- `pnpm build` ✅
- `pnpm test` ✅ — 24 tests passed
- Desktop screenshot reviewed at 1440px width.
- Mobile screenshot reviewed at 390px width after fixing the responsive grid override.
- Preview regenerated with `scripts/make-preview.mjs`.

## Reference

The layout takes cues from Trading 212's recent home-screen guidance: account value and performance first, dedicated investment/funds widgets, and a clear investment list. It is an inspired implementation for dsh, not a copy of Trading 212's proprietary UI.
