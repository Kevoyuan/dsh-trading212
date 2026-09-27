# MERIDIAN — dirA · institutional editorial (light)

**Vibe / layout.** Editorial Luxury × Soft Structuralism: warm porcelain canvas (#FAFAF7), white sheets, warm near-black ink (#1A1915), one deep ink-blue accent (#123A5E). Layout = The Editorial Split + hairline ledger: hero plate → ruled context tape → asymmetric 12-col body, 8-col ledger (chart, positions, holdings of record) against a 4-col insight column (cash, allocation, contribution, exposure). Exactly **two plates** (hero, chart); all else sits on canvas behind rules and rhythm — no card wall.

**Scales.** Type ≈1.2 on 12px: 46 / 28 / 18 / 15 / 14 / 12.5 / 12 (7 sizes; body 14, floor 12). Space, 4px grid: 4 · 8 · 12 · 16 · 24. Radii 3 / 6 / 999. Hairlines 3 (rule 10%, rule-strong 26%, accent). Shadows 2 (plate, figure). Motion: 380ms, one curve cubic-bezier(.22,.61,.36,1), 460ms staggered rise.

**Markup.**
1. Pane wrappers → `.cockpit-ledger` (main, 8 cols) + `.cockpit-insight` (aside, 4 cols) in new `.cockpit-body-grid`.
2. Hero `.cockpit-account-card` to full measure; `.portfolio-context-strip` follows as a tape.
3. `.cockpit-investments-section` → ledger; treemap + `.cockpit-sub-analytics-grid` → insight; `.cockpit-holdings-preview` → full-measure band after the columns.
4. AI strip + AI card → `.cockpit-analytics-strip`; pane-footer + `.legal` → `.cockpit-colophon`; `.pro-shortcuts-hud` static.
5. New `.chart-scroll` around the chart SVG (mobile pan); bar values carry tone classes; the collapse header gained role/tabindex/aria-expanded.

Data byte-identical. Build: `dirA-build.mjs`.

**Audit, 1440 + 390, light + dark — every gate passes:** contrastFail 0 · sizes 7 (min 12) · radii 3 · borders 3 · shadows 2 · gap 6 · pad 11/12 · ease 1 · dur 1 · gradients 0 · backdrop-filter 0 · overflow 0 · bg 8 · fg 7. Dark: #14130F / #1C1B17, measured pairs 5.17–15.39:1. Nothing unreachable. A stray override block in dirA.css from another writer was removed.