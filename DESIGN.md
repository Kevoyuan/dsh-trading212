---
version: 2.1.0
name: Trading212-Native-Dark-Terminal
description: |
  暗色交易终端设计令牌（dsh-trading212 全量 UI 重构）。
  以现有 styles.css 变量为基底做品牌化定制：Obsidian 黑曜画布 (#000000 / #05070a / #0b0f14) +
  Trading 212 招牌电光蓝 (#00a6ff) + 严谨金融语义色（涨/跌/警告/信息）+ 克制玻璃质感与克制发光。
  覆盖 9 段标准结构，并额外提供 z-index 层级表、分段控件（range-switcher）规范、
  Cockpit 双栏布局令牌、组件视觉规范速查。所有文案结构维持中/英双语 i18n 能力。
---

# 暗色交易终端 · 设计令牌文档（dsh-trading212）

> 本文档直接交付 `prototype-builder` 用于生成代码。所有令牌以 **CSS 变量** 形式给出，
> 与现有 `src/app/styles.css` 的变量命名 1:1 对齐；新增令牌以 `/* NEW */` 标注。

---

## 0. 设计方向决策与邻近参考语言

### 0.1 为什么选「自定义暗色交易终端」而非通用现成系统

需求摘要要求 **Tech Utility × Modern Minimal** 的暗色交易终端美学，并硬性约束「无 AI 感」
（拒绝渐变光斑 / 占位插画 / 荧光过载 / 通用浅色卡片）。在 71 套内置设计系统中：

- **不宜直接套用** Vercel / Linear / Stripe 的「现成成品系统」——它们各自有强烈的品牌性格
  （Vercel 的纯几何灰、Stripe 的渐变紫、Linear 的紫调），强行套用会丢失 Trading 212 的
  招牌电光蓝与「原生 App 级金融仪表盘」识别度，也容易滑向 AI-slop。
- **正确做法**：以项目**已有 CSS 变量基底**（`--primary:#00a6ff` 等）为种子，套用
  **Tech Utility（技术工具感）× Modern Minimal（现代极简）** 的混合学派做品牌化定制，
  输出一套**专属于 dsh-trading212 的设计令牌**。这是「品牌提取协议 + 设计系统结构」的融合，
  而非从零发明，也非生搬通用系统。

### 0.2 邻近可参考的设计语言（2–3 个，仅作气质校准，不照搬）

| 参考语言 | 借鉴点 | 差异（本系统不照搬） |
|---------|-------|-------------------|
| **Trading 212 官方暗色仪表盘**（直接品牌参考） | 电光蓝强调、高密度金融数字、原生 App 观感、胶囊徽标 | ——（本系统即其还原 + 工程化） |
| **Vercel（开发者工具暗色极简）** | 极简层级、克制留白、锐利 1px 分隔、无装饰、等宽元数据 | Vercel 偏纯灰无品牌色；本系统保留电光蓝与金融语义色 |
| **Stripe（金融科技数据密度）** | 严谨排版、tabular-nums 金额、语义化 money 色、精确微交互 | Stripe 偏渐变与亮色卡片；本系统坚持暗色 + 克制发光 |
| *（可选）Linear（原生 App 感）* | 弹簧动效、键盘可达性、状态指示器克制 | Linear 紫调；仅借鉴动效与可达性，不借鉴配色 |

**视觉学派定位**：`Tech Utility`（暗色、高信息密度、精确）× `Modern Minimal`（去装饰、严格栅格、单一强调色）。

---

## 1. Visual Theme

**Philosophy**: 像交易终端一样精确，像原生 App 一样克制——真实数据密度、严谨排版、克制的玻璃质感与发光。
**Direction**: dark, data-dense, utilitarian, minimal, native-app
**Personality**: precise, calm, trustworthy, refined, native
**Reference**: Trading 212 官方暗色仪表盘；校准参考 Vercel / Stripe
**Anti-pattern guard**: 无 AI-slop（见 §7 Cautions）

---

## 2. Color Palette（色彩令牌 · 含克制发光规范）

> 全部给出 HEX（实色）与 RGBA（透明变体）。对比度均满足 WCAG AA（正文 4.5:1，大字 3:1）。

### 2.1 背景层级（Background Elevation Ramp）
暗色系统靠**明度阶梯**而非阴影建立层级。从最底到最浮：

| Token | HEX | 用途 |
|-------|-----|------|
| `--canvas-app` | `#000000` | App 最底层画布（body / app-shell） |
| `--canvas-subtle` | `#05070a` | 侧栏 / 左栏 cockpit 底色 |
| `--panel` | `#0b0f14` | 面板 / 页面底色 |
| `--panel-subtle` | `#10151c` | 凹陷表面、输入框、分段控件轨道 |
| `--panel-hover` | `#161e27` | 行 / 卡片 hover 态 |
| `--panel-active` | `#1a232e` | 选中 / 按压态 |
| `--panel-elevated` | `#18222d` | 浮起卡片、分段控件滑块、popover 表面 |

### 2.2 表面 / Surface（组件实色背景）
| Token | HEX | 用途 |
|-------|-----|------|
| `--sidebar` | `#050709` | 左栏 cockpit 背景 |
| `--sidebar-hover` | `#0d1217` | 侧栏项 hover |
| `--sidebar-active` | `#131a22` | 侧栏项 active |

### 2.3 边框 / Borders（hairline 发丝线）
| Token | RGBA | 用途 |
|-------|------|------|
| `--rule` | `rgba(255,255,255,0.08)` | 默认分隔线 / 卡片描边 |
| `--rule-strong` | `rgba(255,255,255,0.14)` | hover / 强调描边 |
| `--rule-subtle` | `rgba(255,255,255,0.04)` | 极弱内部分隔 |

### 2.4 文字 / Ink
| Token | HEX | 用途 | 对比度(对 --panel) |
|-------|-----|------|-------------------|
| `--ink` | `#ffffff` | 主标题、英雄数字 | ~17:1 ✅ |
| `--ink-secondary` | `#cdd6df` | 次级正文 | ~11:1 ✅ |
| `--muted` | `#8291a0` | 元数据、caption | ~5.7:1 ✅ AA |
| `--muted-light` | `#52606e` | 占位符、免责声明 | ~3.4:1 ⚠️ 仅用于次要/禁用文本 |
| `--muted-faint` | `#343d46` | 极弱装饰文本 | 仅装饰，非必要信息 |

### 2.5 品牌强调 / Primary（电光蓝）
| Token | HEX / RGBA | 用途 |
|-------|-----------|------|
| `--primary` | `#00a6ff` | CTA、链接、激活态、价格曲线 |
| `--primary-bright` | `#33b8ff` | hover / active 提亮 |
| `--primary-deep` | `#0084cc` | 按下态、浅底上下文的安全实色 |
| `--primary-subtle` | `rgba(0,166,255,0.12)` | 浅蓝底纹（徽章/选中底） |
| `--primary-glow` | `rgba(0,166,255,0.35)` | 克制动效发光（仅 hover/active） |
| `--primary-glow-subtle` | `rgba(0,166,255,0.15)` | 更弱的发光 |

> **对比度提示**：`--primary` 作**文字/图标**置于暗底时对比度 ~7.3:1（AA ✅）；
> 作**按钮背景**时建议配 **深色文字** `#04121d`（≈6.8:1 ✅）——见 §4.1。

### 2.6 语义金融色 / Positive · Negative（涨跌）
| Token | HEX / RGBA | 用途 |
|-------|-----------|------|
| `--positive` | `#00b074` | 涨幅文字（对暗底 ~7.7:1 ✅） |
| `--positive-bright` | `#00d084` | 涨幅高亮、进度条 |
| `--positive-bg` | `rgba(0,208,132,0.12)` | 涨势底纹 |
| `--positive-surface` | `#0a1812` | 涨势表面 |
| `--positive-border` | `rgba(0,208,132,0.28)` | 涨势描边 |
| `--negative` | `#ff3b30` | 跌幅文字（对暗底 ~5:1 ✅ AA） |
| `--negative-bright` | `#ff4d4f` | 跌幅高亮 |
| `--negative-bg` | `rgba(255,59,48,0.12)` | 跌势底纹 |
| `--negative-surface` | `#1e0d0e` | 跌势表面 |
| `--negative-border` | `rgba(255,77,79,0.28)` | 跌势描边 |

### 2.7 信息 · 警告 · 危险 / Info · Warning · Danger
| Token | HEX / RGBA | 用途 |
|-------|-----------|------|
| `--info` | `#38bdf8` | 信息态（与 primary 区分的青蓝） |
| `--info-bg` | `rgba(56,189,248,0.12)` | 信息底纹 |
| `--warning` | `#ffb020` | 警告（DEMO 徽标、注意） |
| `--warning-bg` | `rgba(255,176,32,0.12)` | 警告底纹 |
| `--danger` | `#ff3b30` | 破坏性 / 错误（复用 negative 红） |
| `--danger-border` | `rgba(255,77,79,0.4)` | 错误描边 |

### 2.8 ⚠️ 克制发光（Restrained Glow）规范 —— 核心约束

发光**仅**在交互瞬间出现，绝不滥用、绝不作为背景光晕或循环动画。

| Token（NEW） | 值 | 触发 |
|------|----|------|
| `--glow-primary-sm` | `0 0 0 1px rgba(0,166,255,0.35), 0 0 12px rgba(0,166,255,0.18)` | 输入框 focus、分段控件 focus-visible |
| `--glow-primary-md` | `0 0 0 1px rgba(0,166,255,0.45), 0 0 20px rgba(0,166,255,0.22)` | Primary 按钮 hover |
| `--glow-positive-sm` | `0 0 6px rgba(0,208,132,0.25)` | 涨势进度条（极弱） |
| `--glow-negative-sm` | `0 0 6px rgba(255,77,79,0.25)` | 跌势进度条（极弱） |

**规则（硬约束）**：
1. 默认态（静止）**零发光**——面板、卡片、背景一律无 glow。
2. 发光只能源于 `:hover` / `:active` / `:focus-visible` / 数据刷新瞬间的 value-flash。
3. 金融语义色（positive/negative）**永不整体发光**，仅允许进度条 6px 极弱投影。
4. 禁止：全屏渐变光斑、卡片霓虹描边常亮、无限循环的 glow 动画、玻璃模糊大 halo。
5. `body` 现有的两处 `radial-gradient` 背景光（blue 6% / green 4%）**保留为唯一环境光**，
   不得再叠加任何背景光晕。

---

## 3. Typography（排版令牌）

### 3.1 字体栈（含中英双语 CJK fallback）
```
--font-sans: -apple-system, BlinkMacSystemFont, "SF Pro Display", "SF Pro Text",
             "Inter", "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei",
             "Noto Sans CJK SC", "Segoe UI", sans-serif;
--font-mono: "SF Mono", "Geist Mono", "JetBrains Mono", "Roboto Mono",
             ui-monospace, Menlo, Consolas, monospace;
```
> CJK fallback（PingFang SC / Microsoft YaHei / Noto Sans CJK SC）确保中英文双语均有原生渲染，
> 英文走 SF/Inter，中文走苹方/雅黑，观感统一无 fallback 抖动。

### 3.2 字号阶梯（base 13–14px，数据密度优先）
| Level | Size | Weight | Line-height | 用途 |
|-------|------|--------|-------------|------|
| Display-XXL | 34–40px | 800 | 1.05 | 账户英雄值、个股大价 |
| Display-XL | 30px | 700 | 1.1 | 页面大标题 |
| H1 | 22–26px | 800 | 1.15 | 内容页标题 |
| H2 | 15px | 750 | 1.3 | 区块标题 |
| H3/Label | 10.5–11px | 800 | 1.3 | 区块 eyebrow（大写 + 0.06–0.08em 字距） |
| Body | 13–13.5px | 400 | 1.5 | 正文 |
| Small | 12px | 600 | 1.4 | 元信息、按钮文字 |
| Micro | 10–11px | 700 | 1.35 | 徽章、caption |

### 3.3 字重 / 行高
字重轴：`400`(正文) → `600`(强调/按钮) → `650/700`(区块标题) → `750/800`(英雄数字/eyebrow)。
负字距用于大字号标题（`letter-spacing: -0.6px ~ -1.0px`）以收紧数字与英文。

### 3.4 数字等宽（tabular-nums）—— 金融核心
| 场景 | 字号 | 字体特性 |
|------|------|---------|
| 英雄账户值 / 个股大价 | 34–36px | `font-variant-numeric: tabular-nums`，weight 800 |
| 表格数字单元格 | 13px | `tabular-nums`，右对齐，weight 750 |
| 涨跌百分比 | 11–13px | `tabular-nums`，配 `tone-positive/negative` |
| 输入框金额 | 13.5px | `tabular-nums` |

> 所有金额、数量、百分比**必须** `font-variant-numeric: tabular-nums`，防止刷新时数字抖动。

---

## 4. Component Styles（组件样式）

### 4.1 按钮
**Primary（买 / Deposit / 主行动）**
```
background: var(--primary);            /* #00a6ff */
color: #04121d;                         /* 深色文字满足 AA */
font-weight: 800; font-size: 13.5px;
border-radius: var(--radius-full);      /* 胶囊 */
padding: 10px 28px;
box-shadow: 0 2px 12px var(--primary-glow);
transition: all var(--transition-fast);
```
hover: `background: var(--primary-bright); box-shadow: var(--glow-primary-md);`
> 注意：买/卖按钮为**情境展示（只读语义）**，不触发真实交易（见 §9.4）。

**Ghost / Secondary（卖出、次级）**
```
background: linear-gradient(180deg,#1c242e,#141a22);
color: var(--ink); border: 1px solid var(--rule-strong);
border-radius: var(--radius-full); padding: 10px 28px;
```
hover: 背景提亮一阶 + `border-color: rgba(255,255,255,0.25)`（无发光）。

**Tool（图标按钮，lucide）**
```
width: 34px; height: 34px; border-radius: 50%;
background: #0e1318; border: 1px solid var(--rule);
color: var(--muted);
```
hover: `color: var(--ink); background: #17202a; border-color: var(--rule-strong);`

### 4.2 卡片（Card）
```
background: linear-gradient(180deg,#0c1016,#070a0e);
border: 1px solid var(--rule-strong);
border-radius: var(--radius-xl);        /* 24px 大卡 / 12px 小组件 */
padding: 22px 28px;                      /* 大卡）；小组件 14–18px */
box-shadow: 0 4px 16px rgba(0,0,0,0.6), inset 0 1px 0 rgba(255,255,255,0.08);
```
hover（可交互卡）：`border-color: var(--rule-strong)` + 背景提亮一阶；**默认无 glow**。

### 4.3 标签 / 徽章
**INVEST 品牌胶囊**（保留产品身份）
```
background: linear-gradient(180deg,#121820,#0d1217);
border: 1px solid var(--rule-strong);
border-radius: var(--radius-full);
padding: 6px 14px; font-weight: 800; font-size: 12.5px; letter-spacing: 0.09em; color: #fff;
```
**LIVE / DEMO 环境徽标**（保留产品身份）
```
LIVE : background: var(--positive-bg);  color: var(--positive-bright); border: 1px solid var(--positive-border);
DEMO : background: var(--warning-bg);   color: var(--warning);         border: 1px solid rgba(255,176,32,0.3);
font-size: 9.5–10px; font-weight: 750; padding: 2px 6px; border-radius: 4px; letter-spacing: 0.04em;
```
**涨跌 side 徽章**（历史页 Buy/Sell）
```
buy : var(--positive-bg) + var(--positive-bright) + var(--positive-border);
sell: var(--negative-bg) + var(--negative-bright) + var(--negative-border);
border-radius: var(--radius-xs); font-size: 10.5px; font-weight: 750; padding: 3px 8px; text-transform: uppercase;
```

### 4.4 表格行
```
tr height: 48px; td padding: 14px 16px; border-bottom: 1px solid var(--rule-subtle);
th: font-size 11px; font-weight 750; uppercase; letter-spacing 0.06em; color: var(--muted);
tr:hover td { background: rgba(255,255,255,0.03); }
数字单元格：text-align right; font-variant-numeric: tabular-nums; font-weight 750; color: var(--ink);
涨跌单元格：tone-positive / tone-negative。
```

### 4.5 搜索框（Topbar）
```
height: 36px; width: 180px (focus 240px);
background: #0d1217; border: 1px solid var(--rule); border-radius: var(--radius-full);
padding: 6px 14px; color: var(--ink); font-size: 12.5px;
placeholder: var(--muted-light);
focus-within: border-color: var(--primary); background: #121820; box-shadow: var(--glow-primary-sm);
```

### 4.6 输入框（Setup / Settings）
```
height: 44px; background: #05080c; border: 1px solid var(--rule-strong);
border-radius: var(--radius-md); padding: 12px 16px; color: var(--ink); font-size: 13.5px;
focus: border-color: var(--primary); box-shadow: var(--glow-primary-sm);
```

### 4.7 导航标签（Topbar center nav）
```
容器：pill 轨道 (border-radius full; background rgba(18,24,32,0.5); padding 3px; border 1px var(--rule-subtle))
项：padding 7px 16px; border-radius full; font-size 13px; font-weight 600; color var(--muted);
hover: color #fff; background rgba(255,255,255,0.06);
active: color #fff; background #19222d; box-shadow inset 高光 + 0 0 0 1px rgba(255,255,255,0.08); 图标 var(--primary);
```

### 4.8 ⚠️ 分段控件（Segmented Control）—— range-switcher 规范

**目的**：将 `.range-switcher` 重做为**不遮挡图表**的分段控件。当前它是一组绝对/普通排列的按钮，
风险在于覆盖 ECharts 画布。新规范强制其在**正常文档流**内、图表工具栏行中渲染。

**结构（DOM）**
```html
<div class="range-switcher" role="radiogroup" aria-label="Price range">
  <span class="range-thumb" aria-hidden="true"></span>   <!-- 滑动选中指示 -->
  <button role="radio" aria-checked="false">1D</button>
  <button role="radio" aria-checked="true" class="active">1M</button>
  <!-- … 1D / 5D / 1M / 3M / 6M / 1Y / MAX … -->
</div>
```

**令牌（NEW）**
```
.range-switcher {
  display: inline-flex; align-items: center; gap: 2px;
  height: 32px; padding: 3px;
  background: var(--panel-subtle);            /* #10151c 轨道底 */
  border: 1px solid var(--rule);
  border-radius: var(--radius-sm);            /* 8px，锐利非胶囊 */
  position: relative; z-index: 10;            /* 见 §6.2 层级 */
}
.range-thumb {                                /* 滑块 */
  position: absolute; top: 3px; bottom: 3px;
  border-radius: 6px;
  background: var(--panel-elevated);          /* #18222d */
  border: 1px solid var(--rule-strong);
  transition: transform var(--transition-spring), width var(--transition-spring);
  z-index: 0;
}
.range-switcher button {
  position: relative; z-index: 1;
  flex: 0 0 auto; min-width: 40px; height: 26px;
  padding: 0 12px; border: 0; background: transparent;
  font-size: 12px; font-weight: 650; color: var(--muted);
  transition: color var(--transition-fast);
}
.range-switcher button:hover { color: var(--ink-secondary); background: rgba(255,255,255,0.04); }
.range-switcher button.active { color: var(--ink); }
.range-switcher:focus-within { border-color: var(--primary); box-shadow: var(--glow-primary-sm); }
```

**关键交互与可达性**
- 选中态：滑块经 `transform: translateX()` + 匹配宽度滑入（spring 缓动），文字变 `--ink`。
- 键盘：`role="radiogroup"` + `role="radio"` + roving `tabindex`；左右方向键切换，`aria-checked` 同步。
- **零常亮发光**；仅 `:focus-within` 出现 1px 主色描边 + `glow-primary-sm`。
- **绝不遮挡**：分段控件位于图表工具栏行的**正常流**内（`position: relative`），
  与 ECharts 画布分行排列；即便 `z-index:10 > 图表区:1`，因不在同一行、不 `absolute` 覆盖画布，
  物理上无法遮住 plot 区域（详见 §6.2 遮挡规避）。

### 4.9 组件视觉规范速查表

| 组件 | 背景 | 边框 | 圆角 | 文字/图标 | 交互态 |
|------|------|------|------|-----------|--------|
| Primary 按钮 | `--primary` | 无 | full | `#04121d` / 800 | hover `glow-primary-md` |
| Ghost 按钮 | 渐变深灰 | `--rule-strong` | full | `--ink` | hover 提亮 |
| Tool 图标按钮 | `#0e1318` | `--rule` | 50% | `--muted`→`--ink` | hover 提亮 |
| 卡片 | 渐变 `#0c1016→#070a0e` | `--rule-strong` | xl(24)/md(12) | `--ink` | hover 提亮边框 |
| INVEST 胶囊 | 渐变 `#121820→#0d1217` | `--rule-strong` | full | `#fff`/800 | hover 主色描边 |
| LIVE/DEMO 徽标 | positive/warning-bg | 语义 border | xs(4) | 语义 bright | 静态 |
| 表格行 | 透明 | `--rule-subtle` 底 | — | `--ink`/muted | hover `rgba(255,255,255,0.03)` |
| 搜索框 | `#0d1217` | `--rule` | full | `--ink` | focus 主色+`glow-sm` |
| 输入框 | `#05080c` | `--rule-strong` | md(12) | `--ink` | focus 主色+`glow-sm` |
| 导航标签 | 透明/激活 `#19222d` | 轨道 `--rule-subtle` | full | muted→`--ink` | 激活高光+主色图标 |
| 分段控件 | 轨道 `--panel-subtle` | `--rule` | sm(8) | muted→`--ink` | 滑块 spring+focus glow |

---

## 5. Layout（布局令牌）

### 5.1 间距与栅格（4px 基准）
| Token（NEW） | 值 | 用途 |
|------|-----|------|
| `--space-1` | 4px | 行内微距 |
| `--space-2` | 8px | 紧凑间距 |
| `--space-3` | 12px | 组件内距 |
| `--space-4` | 16px | 默认间距 / 卡片内距 |
| `--space-5` | 20px | 区块内距 |
| `--space-6` | 24px | 区块 padding |
| `--space-8` | 32px | 大区块间隔 |
| `--space-10` | 40px | 内容页外距 |

栅格：cockpit 用 **CSS Grid `380px 1fr`**（非 12 列）；内容页用 `max-width: 1120px` 居中单栏。

### 5.2 ⚠️ Cockpit 双栏布局令牌
```
--cockpit-left-width: 380px;     /* 左栏固定 */
--cockpit-right: 1fr;            /* 右栏弹性 */
--cockpit-column-gap: 0;         /* 以 1px 分隔线代替间距 */
--cockpit-topbar-height: 56px;   /* 顶栏高 */
--cockpit-height: calc(100vh - 56px);
--cockpit-left-padding: 20px 18px 96px;
--cockpit-right-padding: 28px 36px 96px;
```
```
.t212-cockpit-layout {
  display: grid;
  grid-template-columns: var(--cockpit-left-width) var(--cockpit-right);
  height: var(--cockpit-height);
  overflow: hidden;                 /* 各自内部滚动，不整体滚动 */
}
.cockpit-left-pane  { background: var(--sidebar); border-right: 1px solid var(--rule);
  overflow-y: auto; overflow-x: hidden; }   /* 独立滚动 */
.cockpit-main-pane  { background: var(--canvas-app); overflow-y: auto; overflow-x: hidden; } /* 独立滚动 */
```
**滚动行为**：左右两栏**各自独立滚动**（`overflow-y:auto`），外层 `overflow:hidden`，
保证顶栏 / workspace-head sticky 时图表与列表互不干扰。
**细分隔**：左右栏之间用 `border-right: 1px solid var(--rule)`（非 gap），强化终端分屏感。

### 5.3 内容页（全量页面 overview/holdings/instrument/history/settings/help/setup）
```
.content-page { max-width: 1120px; margin: 0 auto; padding: 32px 40px; }
区块间距：--space-8 (32px)；卡片内距：--space-6 (24px)；
表格容器：圆角 xl + 渐变表面 + inset 高光（见 §4.2/§4.4）。
```

---

## 6. Depth & Elevation（深度与层级）

### 6.1 阴影层级
| Level | Token | 值 |
|-------|-------|----|
| Flat | `--shadow-xs` | `0 1px 2px rgba(0,0,0,0.6)` |
| Raised | `--shadow-sm` | `0 2px 8px rgba(0,0,0,0.7), inset 0 1px 0 rgba(255,255,255,0.08)` |
| Floating | `--shadow-md` | `0 8px 24px rgba(0,0,0,0.85), inset 0 1px 0 rgba(255,255,255,0.1)` |
| Overlay | `--shadow-lg` | `0 16px 36px rgba(0,0,0,0.9), inset 0 1px 0 rgba(255,255,255,0.12)` |

所有阴影均带 `inset 0 1px 0 rgba(255,255,255,0.08)` 顶高光——这是本系统的「硬件双层 bezel」签名，
**替代** AI-slop 的模糊大投影。

### 6.2 ⚠️ Z-index 层级表（修复 switcher 遮挡）

| 层级 | 元素 | z-index | 定位方式 |
|------|------|---------|---------|
| 画布底 | `body` / `app-shell` | `0` | static |
| 图表区 | ECharts 画布 wrapper | `1` | relative |
| **分段控件** | `.range-switcher` | **`10`** | **relative（正常流，图表工具栏行内）** |
| workspace-head | 区块 sticky 头 | `30` | sticky |
| topbar | 顶部栏 | `100` | sticky |
| dialog | 弹窗 / 错误面板 | `200` | fixed + backdrop |
| dropdown / tooltip | 下拉 / 浮层提示 | `300` | fixed/absolute |

**遮挡规避策略（硬约束）**：
1. **每个区域建立独立层叠上下文**：topbar(100)、workspace-head(30)、dialog(200)、
   dropdown/tooltip(300) 各自为 `position` 容器，杜绝孤立的 `absolute` 元素漂在其父级之外。
2. **range-switcher 不得 `absolute` 覆盖画布**：它必须在图表工具栏行内以 `position: relative; z-index:10`
   **正常流渲染**。即便 z(10) > 图表(1)，因二者分行排列，物理上不会遮住 plot。
   （旧实现若用 `position:absolute` 贴在图表左上角，即遮挡根因——必须改为行内分段控件。）
3. **ECharts 自带 tooltip** 走库内部层（不冲突）；我们的 DOM tooltip 用 `z-index:300`，高于 dialog(200)，
   以支持「弹窗内的下拉/提示」浮于弹窗之上。
4. **dialog(200) > topbar(100)**：弹窗出现时完整覆盖顶栏（含 backdrop 遮罩），符合模态语义。
5. **禁用魔法数字**：不得出现 `z-index: 9999` 之类；所有层级严格取上表 0/1/10/30/100/200/300。
6. **核查清单**：重构后逐一核对 `sticky/fixed/absolute` 与既有 z-index 的关系——
   topbar(100) ⊆ workspace-head(30) ⊆ dialog(200) ⊆ dropdown/tooltip(300)，且 range-switcher(10) 仅作用于图表工具栏行内。

---

## 7. Cautions（注意事项 / 反模式）

### Never Do（AI-slop 与终端禁忌）
- ❌ 渐变光斑背景、占位插画、荧光过载、通用浅色卡片（「无 AI 感」硬约束）。
- ❌ 静止态给面板/卡片加常亮 glow 或霓虹描边。
- ❌ `range-switcher` 用 `position:absolute` 压在 ECharts 画布上（遮挡 bug 根因）。
- ❌ 金额/数量/百分比不用 `tabular-nums`（刷新抖动）。
- ❌ 在正文字色用 `--muted-light` / `--primary` 作按钮白字（对比度不足）。
- ❌ 圆角滥用成大圆角胶囊——金融终端以 **md(12)/xl(24)** 为主，工具类控件用 **sm(8)**。
- ❌ 用浅色卡片模拟「现代 SaaS」——本系统坚持 obsidian 暗底。
- ❌ 买卖按钮绑定真实交易逻辑（只读语义，见 §9.4）。

### Prefer（推荐）
- ✅ 靠**明度阶梯 + 1px 发丝线**建立层级，而非阴影堆叠。
- ✅ 发光仅出现在 `:hover/:active/:focus-visible` 与数据刷新 value-flash。
- ✅ 高密度真实数据 + 严谨排版 + 克制玻璃（顶栏 `backdrop-filter: blur(20px)` 已存在，保留）。
- ✅ 所有文案走 `tx('中文','English')` 双语结构（见 §9.3）。

---

## 8. Responsive Behavior（响应式）

| 断点 | 宽度 | 行为 |
|------|------|------|
| Desktop | ≥ 1200px | Cockpit 双栏 `380px 1fr` 完整呈现 |
| Tablet | 768–1199px | 左栏收窄至 `320px`（`--cockpit-left-width:320px`），右栏 padding 收至 `24px 24px` |
| Compact | 640–767px | Cockpit 退化为**单栏堆叠**：左栏列表置顶、右栏详情其下，各自 `position:static`，整体可滚动 |
| Mobile | < 640px | 单栏；顶栏搜索框收为图标；分段控件横向滚动；表格 `overflow-x:auto` |

**适配规则**
- Cockpit 在 < 768px **不再 grid 双栏**，改为 `flex-direction: column`，左右栏各占满宽、顺序堆叠。
- 分段控件在窄屏允许 `overflow-x: auto`（轨道行内滚动），不挤压选项。
- 顶栏 sticky 在所有断点保持；workspace-head sticky 仅在桌面/平板生效，移动端转为静态。

---

## 9. Agent Prompt Guide（Agent 生成指南）

### 9.1 关键指令
1. 严格消费本文档 CSS 变量，禁止硬编码颜色（除非变量未覆盖的极个别场景，需标注）。
2. 所有发光用 §2.8 的 `--glow-*` 令牌，**默认态零发光**。
3. `.range-switcher` 必须按 §4.8 实现为行内分段控件，`z-index:10`，**不可 absolute 覆盖图表**。
4. 数字一律 `font-variant-numeric: tabular-nums`。
5. 组件圆角取 §2/§4 令牌（xs4/sm8/md12/lg18/xl24/full），勿自创。
6. 动效只用 §9.2 的三档时长 + 两条缓动，禁止入场大动画 / 弹跳 / 无限 glow。

### 9.2 Quick CSS Snippet（可直接消费）
```css
:root {
  /* 字体 */
  --font-sans: -apple-system, BlinkMacSystemFont, "SF Pro Display", "SF Pro Text",
               "Inter", "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei",
               "Noto Sans CJK SC", "Segoe UI", sans-serif;
  --font-mono: "SF Mono", "Geist Mono", "JetBrains Mono", "Roboto Mono", ui-monospace, monospace;

  /* 品牌强调 */
  --primary: #00a6ff; --primary-bright: #33b8ff; --primary-deep: #0084cc;
  --primary-subtle: rgba(0,166,255,0.12); --primary-glow: rgba(0,166,255,0.35);
  --primary-glow-subtle: rgba(0,166,255,0.15);

  /* 语义金融色 */
  --positive: #00b074; --positive-bright: #00d084; --positive-bg: rgba(0,208,132,0.12);
  --positive-surface: #0a1812; --positive-border: rgba(0,208,132,0.28);
  --negative: #ff3b30; --negative-bright: #ff4d4f; --negative-bg: rgba(255,59,48,0.12);
  --negative-surface: #1e0d0e; --negative-border: rgba(255,77,79,0.28);
  --info: #38bdf8; --info-bg: rgba(56,189,248,0.12);
  --warning: #ffb020; --warning-bg: rgba(255,176,32,0.12);
  --danger: #ff3b30; --danger-border: rgba(255,77,79,0.4);

  /* 背景层级 */
  --canvas-app: #000000; --canvas-subtle: #05070a; --panel: #0b0f14;
  --panel-subtle: #10151c; --panel-hover: #161e27; --panel-active: #1a232e;
  --panel-elevated: #18222d; --sidebar: #050709; --sidebar-hover: #0d1217; --sidebar-active: #131a22;

  /* 文字 */
  --ink: #ffffff; --ink-secondary: #cdd6df; --muted: #8291a0;
  --muted-light: #52606e; --muted-faint: #343d46;

  /* 边框 / 发丝线 */
  --rule: rgba(255,255,255,0.08); --rule-strong: rgba(255,255,255,0.14);
  --rule-subtle: rgba(255,255,255,0.04);

  /* 圆角 */
  --radius-xs: 4px; --radius-sm: 8px; --radius-md: 12px;
  --radius-lg: 18px; --radius-xl: 24px; --radius-full: 9999px;

  /* 阴影（带顶高光 bezel） */
  --shadow-xs: 0 1px 2px rgba(0,0,0,0.6);
  --shadow-sm: 0 2px 8px rgba(0,0,0,0.7), inset 0 1px 0 rgba(255,255,255,0.08);
  --shadow-md: 0 8px 24px rgba(0,0,0,0.85), inset 0 1px 0 rgba(255,255,255,0.1);
  --shadow-lg: 0 16px 36px rgba(0,0,0,0.9), inset 0 1px 0 rgba(255,255,255,0.12);

  /* 克制发光（仅交互瞬间） */
  --glow-primary-sm: 0 0 0 1px rgba(0,166,255,0.35), 0 0 12px rgba(0,166,255,0.18);
  --glow-primary-md: 0 0 0 1px rgba(0,166,255,0.45), 0 0 20px rgba(0,166,255,0.22);
  --glow-positive-sm: 0 0 6px rgba(0,208,132,0.25);
  --glow-negative-sm: 0 0 6px rgba(255,77,79,0.25);

  /* 间距（4px 基准） */
  --space-1: 4px; --space-2: 8px; --space-3: 12px; --space-4: 16px;
  --space-5: 20px; --space-6: 24px; --space-8: 32px; --space-10: 40px;

  /* Cockpit 布局 */
  --cockpit-left-width: 380px; --cockpit-right: 1fr; --cockpit-column-gap: 0;
  --cockpit-topbar-height: 56px; --cockpit-height: calc(100vh - 56px);

  /* 动效 */
  --transition-fast: 0.15s cubic-bezier(0.16,1,0.3,1);
  --transition-normal: 0.22s cubic-bezier(0.16,1,0.3,1);
  --transition-spring: 0.35s cubic-bezier(0.32,0.72,0,1);
}
```

### 9.3 中英双语 i18n 约定（保留双语能力）
- 所有用户可见文案**必须**走 `tx('中文','English')` 双参数结构（见 `src/app/i18n.ts`），
  不得写死单语字符串。
- 字体栈已含 CJK fallback，中英文混排无 fallback 抖动；数字仍 `tabular-nums`。
- 文案长度变化（中↔英）不改变布局栅格——组件以弹性宽度 + `min-width:0` + `text-overflow:ellipsis` 自适应。

### 9.4 只读语义约定（保留产品身份）
- 买 / 卖按钮（`.pill-btn.buy/.sell`、`.t212-action-pill`、`button.primary`）**仅为情境展示**，
  不得绑定真实下单 / API 写入；hover/active 仅做视觉反馈。
- 保留既有身份元素：**INVEST 胶囊**、**LIVE/DEMO 徽标**、**lucide 图标体系**、**现有 CSS 变量**。
- 错误面板（`ErrorPanel`）沿用 `dialog` 层级（z-index 200）呈现，不阻断只读主流程。

---

> **交付说明**：本令牌文档与 `src/app/styles.css` 的变量命名 1:1 对齐，`prototype-builder` 可直接
> 以 `:root` 变量 + §4 组件规范 + §6.2 层级表生成/修正代码。重点核查项：
> (1) `.range-switcher` 改为 §4.8 行内分段控件；(2) z-index 严格取 0/1/10/30/100/200/300；
> (3) 全站默认态零发光；(4) 数字 `tabular-nums`；(5) 文案走 `tx()` 双语。
