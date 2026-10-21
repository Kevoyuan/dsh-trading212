#!/usr/bin/env node
/**
 * Token drift check.
 *
 * `design-system/tokens.css` is canonical. `src/app/styles.css` carries a copy of
 * its `:root` / `[data-theme="dark"]` blocks because the preview inlines that
 * file and cannot `@import`. Copies drift — the previous hand-maintained pair had
 * already lost two type steps and a radius alias before anyone noticed, which is
 * why this check exists.
 *
 * It compares the *declarations*, not the bytes: comments and whitespace are
 * ignored, order is not.
 *
 *   node scripts/check-tokens.mjs        # exit 1 on drift
 */
import { readFileSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')

function blocks(source, { merge = false } = {}) {
  const out = new Map()
  // Match `selector{ ... }` for the two selectors we care about, without nesting.
  const re = /(:root|\[data-theme="dark"\])\s*\{([^}]*)\}/g
  let m
  while ((m = re.exec(source))) {
    const key = m[1]
    const decls = new Map()
    const body = m[2].replace(/\/\*[\s\S]*?\*\//g, '')
    for (const chunk of body.split(';')) {
      const d = /^\s*(--[\w-]+)\s*:\s*([\s\S]+?)\s*$/.exec(chunk)
      if (d) decls.set(d[1], d[2].replace(/\s+/g, ' ').trim())
    }
    // tokens.css is declarations only, so its blocks merge (primitives live in
    // their own :root). In the product file the first block wins: later `:root`
    // blocks are behavioural overrides (prefers-reduced-motion zeroes the
    // durations), not token declarations.
    if (merge) out.set(key, new Map([...(out.get(key) ?? []), ...decls]))
    else if (!out.has(key)) out.set(key, decls)
  }
  return out
}

const canonical = blocks(readFileSync(resolve(root, 'design-system/tokens.css'), 'utf8'), { merge: true })
const product = blocks(readFileSync(resolve(root, 'src/app/styles.css'), 'utf8'))

const problems = []
for (const [selector, decls] of canonical) {
  const theirs = product.get(selector)
  if (!theirs) { problems.push(`missing block: ${selector}`); continue }
  for (const [name, value] of decls) {
    // Primitive ramps are documented in tokens.css for reference only; the
    // product consumes roles, never raw ramp values.
    if (/^--(gray|navy|green|red|amber)-\d+$/.test(name)) continue;
    if (!theirs.has(name)) problems.push(`${selector} ${name}: missing in styles.css`)
    else if (theirs.get(name) !== value) {
      problems.push(`${selector} ${name}: tokens.css="${value}" styles.css="${theirs.get(name)}"`)
    }
  }
}

// A token declared in the product but not in the canonical file is an undeclared
// value — the exact failure mode this file exists to prevent.
for (const [selector, decls] of product) {
  const canon = canonical.get(selector) ?? new Map()
  for (const name of decls.keys()) {
    if (/^--(gray|navy|green|red|amber)-\d+$/.test(name)) continue
    if (!canon.has(name)) problems.push(`${selector} ${name}: declared in styles.css but not in tokens.css`)
  }
}

if (problems.length) {
  console.error(`token drift: ${problems.length} difference(s)\n` + problems.map(p => '  · ' + p).join('\n'))
  console.error('\nFix design-system/tokens.css and src/app/styles.css together.')
  process.exit(1)
}
console.log(`tokens in sync (${[...canonical.values()].reduce((n, m) => n + m.size, 0)} declarations)`)
