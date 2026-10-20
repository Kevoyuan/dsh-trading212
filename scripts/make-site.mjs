#!/usr/bin/env node
// Builds the publishable design-system site in ./site.
//
//   pnpm site:build   then publish ./site
//
// Three pages, no build step: the preview is already self-contained (its CSS is
// inlined by make-preview.mjs), the styleguide only needs tokens.css next to it,
// and the landing page is written here so the whole directory can be rebuilt
// from source at any time instead of being hand-maintained.
import { copyFileSync, mkdirSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const out = join(root, 'site')

const LANDING = `<!doctype html>
<html lang="zh-CN" data-theme="light">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<meta name="color-scheme" content="light dark" />
<title>Lumen · dsh × Trading 212 设计规范</title>
<link rel="stylesheet" href="./tokens.css" />
<style>
  *{ box-sizing: border-box; }
  body{
    margin: 0; min-height: 100vh; padding: 56px 24px 40px;
    display: flex; align-items: center; justify-content: center;
    background: var(--canvas); color: var(--ink-1);
    font-family: var(--font-sans); font-size: var(--fs-body);
    line-height: var(--lh-body); -webkit-font-smoothing: antialiased;
  }
  main{ width: 100%; max-width: 880px; }
  .eyebrow{
    margin: 0 0 var(--s-2); font-size: var(--fs-micro); line-height: var(--lh-micro);
    letter-spacing: var(--tr-wide); color: var(--ink-3);
  }
  h1{
    margin: 0; font-size: var(--fs-hero); line-height: var(--lh-hero);
    font-weight: var(--fw-display); letter-spacing: var(--tr-tight);
  }
  .lede{
    margin: var(--s-3) 0 0; max-width: 56ch;
    font-size: var(--fs-row); line-height: var(--lh-row); color: var(--ink-2);
  }
  .cards{ display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: var(--g-3); margin-top: var(--g-6); }
  .card{
    display: flex; flex-direction: column; gap: var(--s-2);
    padding: var(--card-pad); text-decoration: none; color: inherit;
    background: var(--surface); border: 1px solid var(--hair);
    border-radius: var(--r-4); box-shadow: var(--sh-plate);
    transition: transform var(--d-1) var(--ease), border-color var(--d-1) var(--ease);
  }
  .card:hover{ transform: translateY(-1px); border-color: var(--hair-strong); }
  .card:focus-visible{ outline: 2px solid var(--focus); outline-offset: 2px; }
  .card h2{
    margin: 0; font-size: var(--fs-fig); line-height: var(--lh-fig);
    font-weight: var(--fw-semibold); letter-spacing: var(--tr-snug);
  }
  .card p{ margin: 0; font-size: var(--fs-body); line-height: var(--lh-body); color: var(--ink-3); }
  .go{
    margin-top: auto; padding-top: var(--s-2);
    font-size: var(--fs-micro); line-height: var(--lh-micro);
    font-weight: var(--fw-medium); color: var(--accent);
  }
  footer{
    display: flex; flex-wrap: wrap; gap: var(--s-2) var(--g-4);
    margin-top: var(--g-6); padding-top: var(--s-4);
    border-top: 1px solid var(--hair);
    font-size: var(--fs-micro); line-height: var(--lh-micro);
    letter-spacing: var(--tr-wide); color: var(--ink-3);
  }
  @media (max-width: 680px){
    body{ padding: 32px 16px; }
    .cards{ grid-template-columns: minmax(0, 1fr); }
  }
  @media (prefers-reduced-motion: reduce){ .card{ transition: none; } }
</style>
</head>
<body>
<main>
  <header>
    <p class="eyebrow">dsh × Trading 212</p>
    <h1>Lumen</h1>
    <p class="lede">一套以数字为中心的组合看板规范：六档字号、五档圆角、三级层级、单一强调色。绿色与红色只用于带符号的金额。</p>
  </header>

  <div class="cards">
    <a class="card" href="./preview.html">
      <h2>界面预览</h2>
      <p>账户总览、资产配置拼盘、持仓账本与价格曲线，明暗双主题。</p>
      <span class="go">打开预览 →</span>
    </a>
    <a class="card" href="./styleguide.html">
      <h2>规范样张</h2>
      <p>每个 token 与组件的活体样张，含做与不做对照。</p>
      <span class="go">查看规范 →</span>
    </a>
  </div>

  <footer>
    <span>字号 12 / 14 / 16 / 20 / 26 / 40</span>
    <span>圆角 6 / 10 / 14 / 18 / 999</span>
    <span>最小字号 12px</span>
    <span>对比度 0 处失败</span>
  </footer>
</main>
<script>
  const scheme = matchMedia('(prefers-color-scheme: dark)')
  const apply = () => { document.documentElement.dataset.theme = scheme.matches ? 'dark' : 'light' }
  apply()
  scheme.addEventListener('change', apply)
</script>
</body>
</html>
`

mkdirSync(out, { recursive: true })
writeFileSync(join(out, 'index.html'), LANDING)
copyFileSync(join(root, 'preview-redesign.html'), join(out, 'preview.html'))
copyFileSync(join(root, 'design-system/styleguide.html'), join(out, 'styleguide.html'))
copyFileSync(join(root, 'design-system/tokens.css'), join(out, 'tokens.css'))

console.log('site/ rebuilt: index.html, preview.html, styleguide.html, tokens.css')
