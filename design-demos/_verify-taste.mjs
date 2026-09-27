/**
 * cartographer.html 改动验证（Node 版，等价于 _verify-taste.py）。
 *
 * 按 tasteskill 的要求「用证据验证，不靠猜」：不只看截图，
 * 直接读 computed style 与 DOM 结构，确认分隔线、主题、交互状态真的生效。
 *
 * 用法：node design-demos/_verify-taste.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '..');

/** 本机没装 playwright 依赖，从 npx 缓存里挑版本最高的那份。 */
function loadChromium() {
  const cache = path.join(process.env.HOME || '', '.npm', '_npx');
  const candidates = [];
  if (fs.existsSync(cache)) {
    for (const dir of fs.readdirSync(cache)) {
      const pkg = path.join(cache, dir, 'node_modules', 'playwright', 'package.json');
      if (!fs.existsSync(pkg)) continue;
      try {
        const v = JSON.parse(fs.readFileSync(pkg, 'utf8')).version;
        candidates.push({ v, entry: path.join(cache, dir, 'node_modules', 'playwright') });
      } catch {}
    }
  }
  candidates.sort((a, b) => a.v.localeCompare(b.v, undefined, { numeric: true }));
  if (!candidates.length) throw new Error('未找到 playwright，请先 npx playwright --version');
  const picked = candidates[candidates.length - 1];
  console.log(`使用 playwright@${picked.v}  (${picked.entry})`);
  return require(picked.entry).chromium;
}

const chromium = loadChromium();

const pagePath = path.join(here, 'cartographer.html');
const shots = path.join(here, 'shots');
fs.mkdirSync(shots, { recursive: true });
const url = `file://${pagePath}`;

const fails = [];
const check = (label, cond, detail = '') => {
  console.log(`  [${cond ? 'PASS' : 'FAIL'}] ${label}${detail ? '  -> ' + detail : ''}`);
  if (!cond) fails.push(label);
};

/** 遍历样式表，看是否存在包含指定片段的规则。 */
const ruleHas = (needle) => {
  for (const ss of document.styleSheets) {
    let rules; try { rules = ss.cssRules; } catch { continue; }
    for (const r of rules || [])
      if (r.selectorText && r.selectorText.includes(needle)) return true;
  }
  return false;
};

/** 读取元素三边边框宽度，返回 "bottom|top|left"。 */
const borders = (el) => {
  const s = getComputedStyle(el);
  return `${s.borderBottomWidth}|${s.borderTopWidth}|${s.borderLeftWidth}`;
};

/** 页面内自包含（可整段序列化进页面）：
 *  只扫描真正会被渲染出来的文案。
 *  kind='dots'   找出「·」连用超过 1 次的文本；
 *  kind='dashes' 找出含 em-dash / en-dash 的文本。 */
const auditCopy = (kind) => {
  const SKIP = new Set(['SCRIPT', 'STYLE', 'NOSCRIPT', 'TEMPLATE', 'HEAD', 'TITLE']);
  const hits = [];
  const walk = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  let n;
  while ((n = walk.nextNode())) {
    const el = n.parentElement;
    if (!el || SKIP.has(el.tagName)) continue;
    const t = n.textContent;
    if (!t.trim()) continue;
    let p = el, hidden = false;
    while (p && p !== document.body) {
      const cs = getComputedStyle(p);
      if (cs.display === 'none' || cs.visibility === 'hidden') { hidden = true; break; }
      p = p.parentElement;
    }
    if (hidden) continue;
    const bad = kind === 'dots'
      ? (t.match(/\u00B7/g) || []).length > 1
      : /[\u2014\u2013]/.test(t);
    if (bad) hits.push(t.trim().slice(0, 60));
  }
  return hits;
};

const themeOf = () => document.documentElement.getAttribute('data-theme');
const colorSchemeOf = () => getComputedStyle(document.documentElement).colorScheme;
const overflowOf = () =>
  document.documentElement.scrollWidth - document.documentElement.clientWidth;
const weightOf = (el) => getComputedStyle(el).fontWeight;
const transitionOf = (el) => getComputedStyle(el).transitionProperty;
const readStore = (k) => localStorage.getItem(k);

const browser = await chromium.launch();

try {
  // ---------- 1. 浅色模式 ----------
  console.log('\n=== 浅色模式 ===');
  const ctxLight = await browser.newContext({
    viewport: { width: 1440, height: 1000 }, deviceScaleFactor: 2, colorScheme: 'light',
  });
  const pg = await ctxLight.newPage();
  const errors = [];
  pg.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
  pg.on('pageerror', (e) => errors.push(String(e)));
  await pg.goto(url);
  await pg.waitForLoadState('networkidle');
  await pg.waitForTimeout(600);

  check('无 JS 报错', errors.length === 0, errors.slice(0, 2).join('; '));

  const title = await pg.title();
  check('title 无 em-dash / en-dash', !title.includes('—') && !title.includes('–'), title);

  // 标的元信息条：细分隔线真的生效
  const strip = pg.locator('#asset-tag');
  check('meta-strip 存在', await strip.count() === 1);
  const nChildren = await strip.locator('> *').count();
  check('meta-strip 有 3 段', nChildren === 3, `实际 ${nChildren}`);
  const sep = (await strip.locator('> span').first().evaluate(borders)).split('|');
  check('次级项有细分隔线', sep[2] !== '0px', `border-left = ${sep[2]}`);
  const bold = await strip.locator('> b').first().evaluate(weightOf);
  check('首项加粗', bold === '600' || bold === '700', `font-weight = ${bold}`);

  // 图表元信息
  const cm = pg.locator('.chart-meta');
  check('chart-meta 存在', await cm.count() === 1);
  const cmN = await cm.locator('> *').count();
  check('chart-meta 有 2 段', cmN === 2, `实际 ${cmN}`);
  const cmSep = (await cm.locator('> span').nth(1).evaluate(borders)).split('|');
  check('chart-meta 有细分隔线', cmSep[2] !== '0px', `border-left = ${cmSep[2]}`);

  // 分隔线策略统一：行分隔用 border-bottom，不用 border-top
  for (const sel of ['.pending-row', '.order-row', '.pos-row', '.hp-row']) {
    const st = await pg.locator(sel).first().evaluate(borders);
    const [bot, top] = st.split('|');
    check(`${sel} 用 border-bottom`, bot !== '0px' && top === '0px', `bottom=${bot} top=${top}`);
  }

  // 交互状态
  check('存在 :active 规则', await pg.evaluate(ruleHas, ':active'));
  check('存在 focus-visible 规则', await pg.evaluate(ruleHas, 'focus-visible'));
  const press = await pg.locator('.nav-tab').first().evaluate(transitionOf);
  check('按钮过渡含 transform', press.includes('transform'), press);

  await pg.screenshot({ path: path.join(shots, 'taste-light.png'), fullPage: true });

  // ---------- 2. 动态切换标的（验证 renderTag） ----------
  console.log('\n=== 动态切换标的 ===');
  const target = pg.locator('.pos-row').nth(1);
  const wantAsset = await target.getAttribute('data-asset');
  await target.click();
  await pg.waitForTimeout(400);
  const afterFirst = (await pg.locator('#asset-tag > b').first().innerText()).trim();
  check('切换后主标识跟随所选标的', afterFirst === wantAsset, `期望 ${wantAsset}，实际 ${afterFirst}`);
  const n2 = await pg.locator('#asset-tag > *').count();
  check('切换后仍是结构化 3 段', n2 === 3, `实际 ${n2}`);
  const sep2 = (await pg.locator('#asset-tag > span').first().evaluate(borders)).split('|');
  check('切换后分隔线仍在', sep2[2] !== '0px', `border-left = ${sep2[2]}`);

  // ---------- 3. 深色模式（系统偏好） ----------
  console.log('\n=== 深色模式 ===');
  const ctxDark = await browser.newContext({
    viewport: { width: 1440, height: 1000 }, deviceScaleFactor: 2, colorScheme: 'dark',
  });
  const pg2 = await ctxDark.newPage();
  await pg2.goto(url);
  await pg2.waitForLoadState('networkidle');
  await pg2.waitForTimeout(600);
  const theme = await pg2.evaluate(themeOf);
  check('深色系统偏好下自动用 dark', theme === 'dark', `data-theme = ${theme}`);
  const cs = await pg2.evaluate(colorSchemeOf);
  check('color-scheme 同步为 dark', cs.includes('dark'), cs);
  await pg2.screenshot({ path: path.join(shots, 'taste-dark.png'), fullPage: true });

  // ---------- 4. 浅色系统偏好 + URL 覆盖 ----------
  console.log('\n=== 主题优先级 ===');
  const ctxL2 = await browser.newContext({ viewport: { width: 1440, height: 900 }, colorScheme: 'light' });
  const pg3 = await ctxL2.newPage();
  await pg3.goto(url);
  await pg3.waitForLoadState('networkidle');
  const t3 = await pg3.evaluate(themeOf);
  check('浅色系统偏好下用 light', t3 === 'light', `data-theme = ${t3}`);

  await pg3.goto(url + '?theme=dark');
  await pg3.waitForLoadState('networkidle');
  const t4 = await pg3.evaluate(themeOf);
  check('URL 参数覆盖系统偏好', t4 === 'dark', `data-theme = ${t4}`);

  // 持久化：点 #themeBtn 切换后，无参数重开应沿用保存的偏好
  await pg3.goto(url + '?theme=light');
  await pg3.waitForLoadState('networkidle');
  await pg3.locator('#themeBtn').click();
  await pg3.waitForTimeout(200);
  const t5 = await pg3.evaluate(themeOf);
  check('点击主题按钮后切到 dark', t5 === 'dark', `data-theme = ${t5}`);
  const stored = await pg3.evaluate(readStore, 'cartographer-theme');
  check('主题偏好写入 localStorage', stored === 'dark', `stored = ${stored}`);

  await pg3.goto(url);
  await pg3.waitForLoadState('networkidle');
  const t6 = await pg3.evaluate(themeOf);
  check('重载后沿用已保存偏好（覆盖系统 light）', t6 === 'dark', `data-theme = ${t6}`);

  // ---------- 5. 键盘可达性 ----------
  console.log('\n=== 键盘可达性 ===');
  const ctxKb = await browser.newContext({ viewport: { width: 1440, height: 1000 }, colorScheme: 'light' });
  const kb = await ctxKb.newPage();
  await kb.goto(url);
  await kb.waitForLoadState('networkidle');
  await kb.waitForTimeout(400);

  const rowMeta = await kb.locator('.pos-row').first().evaluate((el) => ({
    role: el.getAttribute('role'), tabindex: el.getAttribute('tabindex'),
    cursor: getComputedStyle(el).cursor,
  }));
  check('.pos-row 有 role=button', rowMeta.role === 'button', JSON.stringify(rowMeta));
  check('.pos-row 可聚焦 (tabindex=0)', rowMeta.tabindex === '0');
  check('.pos-row 光标为 pointer', rowMeta.cursor === 'pointer', rowMeta.cursor);

  // 直接把焦点给第二行，验证焦点环真的画出来
  const second = kb.locator('.pos-row').nth(1);
  const wantKb = await second.getAttribute('data-asset');
  await second.focus();
  const ring = await second.evaluate((el) => {
    const s = getComputedStyle(el);
    return { w: s.outlineWidth, style: s.outlineStyle, off: s.outlineOffset };
  });
  check('聚焦时出现焦点环', ring.w === '2px' && ring.style === 'solid', JSON.stringify(ring));
  check('整行焦点环内收', ring.off === '-2px', ring.off);

  // 回车应触发选中
  await kb.keyboard.press('Enter');
  await kb.waitForTimeout(300);
  const kbAsset = (await kb.locator('#asset-tag > b').first().innerText()).trim();
  check('回车触发选中', kbAsset === wantKb, `期望 ${wantKb}，实际 ${kbAsset}`);
  const cur = await second.getAttribute('aria-current');
  check('aria-current 跟随选中', cur === 'true', `aria-current = ${cur}`);
  const others = await kb.locator('.pos-row[aria-current="true"]').count();
  check('同时只有一项 aria-current', others === 1, `实际 ${others}`);

  // 空格同样应触发
  const third = kb.locator('.pos-row').nth(2);
  const wantSp = await third.getAttribute('data-asset');
  await third.focus();
  await kb.keyboard.press(' ');
  await kb.waitForTimeout(300);
  const spAsset = (await kb.locator('#asset-tag > b').first().innerText()).trim();
  check('空格触发选中', spAsset === wantSp, `期望 ${wantSp}，实际 ${spAsset}`);

  // 装饰元素对辅助技术隐藏
  const decor = await kb.evaluate(() => {
    const sel = '.pos-row .logo-32, .pos-row .spark, .pos-row .arrow';
    const all = [...document.querySelectorAll(sel)];
    return { total: all.length, hidden: all.filter((e) => e.getAttribute('aria-hidden') === 'true').length };
  });
  check('装饰元素已对 AT 隐藏', decor.total > 0 && decor.total === decor.hidden, JSON.stringify(decor));

  // 只读行不应有按压态（会暗示不存在的交互）
  const roActive = await kb.evaluate(ruleHas, '.pending-row:active');
  check('只读行无 :active 规则', roActive === false, `.pending-row:active = ${roActive}`);

  // ---------- 6. 分隔符用量 ----------
  console.log('\n=== 分隔符 ===');
  const dots = await kb.evaluate(auditCopy, 'dots');
  check('渲染文案无「·」连用（每行 ≤1）', dots.length === 0, dots.join(' | '));
  const tipDots = await kb.evaluate(() => [...document.querySelectorAll('[title]')]
    .map((e) => e.getAttribute('title'))
    .filter((t) => (t.match(/·/g) || []).length > 1));
  check('tooltip 无「·」连用', tipDots.length === 0, tipDots.join(' | '));
  const emdash = await kb.evaluate(auditCopy, 'dashes');
  check('渲染文案无 em/en-dash', emdash.length === 0, emdash.join(' | '));

  // ---------- 7. 横向溢出 ----------
  console.log('\n=== 布局 ===');
  for (const w of [1440, 1024, 768, 390]) {
    const c = await browser.newContext({ viewport: { width: w, height: 900 } });
    const p = await c.newPage();
    await p.goto(url);
    await p.waitForLoadState('networkidle');
    await p.waitForTimeout(250);
    const ov = await p.evaluate(overflowOf);
    check(`${w}px 无横向溢出`, ov <= 1, `溢出 ${ov}px`);
    await c.close();
  }
} finally {
  await browser.close();
}

console.log('\n' + '='.repeat(46));
if (fails.length) {
  console.log(`失败 ${fails.length} 项:`);
  for (const f of fails) console.log('  -', f);
  process.exit(1);
}
console.log('全部通过');
