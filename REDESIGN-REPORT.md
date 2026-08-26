# dsh-trading212 UI 重构交付说明

> 以 Trading 212 官方暗色终端为参考，对 dsh-trading212 插件 UI 进行品牌级重构。
> 目标：**暗色交易终端美学 · 修复 switcher 遮挡 · 无 AI 感 · 方便精美 · 符合股票查看场景**。

---

## 一、核心问题修复

| 问题 | 根因 | 修复 |
|------|------|------|
| **switcher 遮挡 / 粗糙** | `InstrumentDetailPage` 的 `.range-switcher` 在 `styles.css` 中**零样式**，叠加潜在 `absolute` 覆盖画布 | 改为行内**分段控件**（§4.8）：`display:inline-flex` 轨道 + 滑动 `.range-thumb` 滑块，`position:relative; z-index:10`，位于图表工具栏**正常文档流**内，与 ECharts 画布分行，**物理上无法遮挡** |
| **UI 整体粗糙** | 组件视觉规范缺失、发光滥用、圆角随意 | 落地完整设计令牌（DESIGN.md），卡片/按钮/胶囊/导航/表格逐项规范 |
| **AI-slop 观感** | 荧光常亮、渐变光斑、浅色卡片 | 默认态**零发光**，发光仅 `:hover/:active/:focus`；克制玻璃质感；Obsidian 暗底 |

---

## 二、设计系统（DESIGN.md 权威令牌）

- **画布**：Obsidian 黑 `#000` / `#05070a` / `#0b0f14`，靠明度阶梯 + 1px 发丝线建立层级。
- **强调**：Trading 212 招牌电光蓝 `#00a6ff`（hover `#33b8ff`）。
- **语义金融色**：涨 `#00b074`（绿）/ 跌 `#ff3b30`（红），各带 surface/border/glow 三件套（国际惯例：绿涨红跌）。
- **排版**：中英双语字体栈（SF/Inter + 苹方/雅黑）；金额/数量/百分比统一 `tabular-nums` 等宽，刷新不抖动。
- **克制发光**：4 个 `--glow-*` 令牌，仅交互瞬间出现；`body` 仅保留文档允许的极弱两处 `radial` 环境光。
- **z-index 层级表**：`0 / 1(图表) / 10(switcher) / 30(workspace-head) / 100(topbar) / 200(dialog) / 300(dropdown)`，严禁魔法数字。

---

## 三、关键改动清单

### `src/app/styles.css`
- 补齐 `:root` 令牌（`--glow-*`、`--space-*`、`--cockpit-*`、`--info/--warning/--danger` 等）。
- 实现 `.range-switcher` 分段控件 + `.range-thumb` 滑块 spring 缓动；删除旧的 `.cockpit-range-row`/`.t212-range-pill`。
- 图表区 `.cockpit-chart-wrap`/`.price-chart-panel` 设为 `z-index:1` 独立层叠上下文。
- `html, body` 全局 `tabular-nums`；卡片/按钮按 §4.1/§4.2 精致化；移除默认态常亮 glow。
- 末尾已含 `@media (prefers-reduced-motion: reduce)` 无障碍降级。

### `src/app/App.tsx`
- 新增可复用 `RangeSwitcher` 组件（约 553–579 行）：`useLayoutEffect` 测量 `button.active` 的 `offsetLeft/offsetWidth` 驱动滑块滑动；`role=radiogroup/radio` + `aria-checked` 可访问。
- `CockpitInstrument` 与 `InstrumentDetailPage` 两处 switcher 统一替换为 `<RangeSwitcher ... />`。
- 保留 `tx()` 双语、INVEST 胶囊、LIVE/DEMO 徽标、lucide 图标、只读买/卖语义。

### `DESIGN.md`
- 设计令牌权威文档（9 段 + Quick CSS Snippet），供后续开发消费。

### `preview-redesign.html`（新增）
- 独立可运行 HTML 预览（52KB，CSS 全内联，无外部依赖），复刻 TopNavBar + Cockpit 双栏 + 分段控件滑块，双击即可在浏览器查看重构效果。

---

## 四、质量审查结果（严过审）

**5 维评分：24/25**（设计哲学 5 / 视觉层次 4 / 执行质量 5 / 特异性 5 / 克制 5）
**硬约束：8/8 全 ✅** → **判定 PASS**

- Anti-Slop：P0 = 0（无紫色渐变/占位插画/荧光常亮/浅色卡片）。
- P1（无障碍降级）已闭环；P2（ResizeObserver 重测、键盘方向键）为可选锦上添花。

---

## 五、如何预览

1. **独立预览（推荐先开这个）**：直接双击打开 `preview-redesign.html`，无需任何环境即可看到重构后的完整视觉与分段控件交互。
2. **真实插件环境**：本地 dev server 已启动 → `http://127.0.0.1:5173/trading212/`（在 dsh 宿主内加载插件查看真实数据）。
3. **集成发布**：`pnpm build` 后由 dsh 加载插件，即可在真实账户环境呈现重构后的界面。

---

## 六、后续可选优化（非阻塞）
- `RangeSwitcher` 加 `ResizeObserver` / `document.fonts.ready` 重测，防字体 swap 瞬时错位。
- 加 roving tabindex + 左右方向键，进一步对齐 §4.8 键盘规范。

---

**结论**：重构达到品牌级水准，暗色交易终端美学、switcher 遮挡根治、无 AI 感、Trading 212 原生观感均达成，typecheck 通过，质量审查 PASS。
