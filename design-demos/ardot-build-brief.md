# Cartographer → Ardot 画布 · 施工说明书

> 本文件是 **Ardot 画布施工的唯一入口**。重启应用后从这里开始，不要重新做设计探索。
> 生成日期：2026-09-26 · 对应原型 `design-demos/cartographer.html`

---

## 0. 前置状态

| 项 | 状态 |
|---|---|
| Ardot 六个插件在 `~/.workbuddy-ai/settings.json → enabledPlugins` | ✅ 已启用（15 条） |
| `ardot-design-core` skill | ✅ 会话内可加载 |
| `mcp__ardot__*` 工具 | ❌ **未注册，必须重启应用** |

重启后第一件事：确认 `mcp__ardot__*` 工具出现，再执行本说明书。

---

## 1. 分工边界（重要，别搞混）

| | 代码原型 `cartographer.html` | Ardot 画布 |
|---|---|---|
| 定位 | **可交互高保真原型**，验证行为 | **设计稿**，交付/评审/导出 |
| 图表 | 真实 `lightweight-charts` v5.2.1 | **SVG 节点**（画布无运行时） |
| 响应式 | CSS 断点，真实重排 | **多画板**（1440 / 390） |
| 字体 | 系统栈 + `tnum` | 画布字体，见 §7 坑 2 |
| 状态 | 真实数据、真实交互 | 静态呈现 |

⚠️ **上一轮的教训要反向应用**：原型里手绘 SVG 是错的（掩盖坐标计算问题），
但**画布上 SVG 是对的**——画布本来就没有运行时。两者不要互相照搬。

---

## 2. 工作流裁剪

`ardot-design-core` 标准流程 **Step 4 / Step 5 必须跳过**。

理由：核心技能有一条硬规则 ——

> **HARD RULE — User guidance wins on conflict.** 当用户提供的显式风格指引
> （自由文本风格约束、`DESIGN.md`、设计 token）与内置 guideline 或
> `<ardot_design_style>` 冲突时，**永远听用户的**。

本项目**已有完整的显式风格系统**：`DESIGN.md`（Lumen 契约）+
`design-demos/cartographer-direction.md`（Cartographer 6 条原则 + 完整 token 块）。
所以：

- ❌ 不调 `search_style_guide`
- ❌ 不调 `build_style_guide`
- ✅ 直接把 §4 的变量集建出来

实际流程：`Step 0`（开文件）→ `Step 1`（读状态）→ **跳过 4/5** → `Step 6`（定位 + 检查）→ `Step 7`（施工）→ `Step 8`（验证）

---

## 3. 待办决策点

重启后需要先确认的 3 件事：

1. **文件**：新建一个 Ardot 文件（`create_design`），还是接到已有文件？
   —— 跟随宿主的 `<ardot_file_directive>`；无 directive 且要新建 → `create_design` 一次。
2. **字体**：先 `get_available_fonts`，确认可用的 grotesque 字体族（§7 坑 2）。
3. **图表数据**：复用原型里那 22 个交易日收盘价（2026-08-17 → 2026-09-15，收在 $198.17），
   折算成 SVG 坐标（§7 坑 3 给了公式）。

---

## 4. 变量集：`Cartographer`

已生成完整 JSON：**`design-demos/ardot-variables.json`**（40 个变量 = 19 COLOR + 21 FLOAT）

- 变量集名：`Cartographer`
- 模式：`["Light", "Dark"]`
- 用法：`apply_variables` 直接吃这个 JSON（merge 模式，不会动别的集合）

### 命名与作用域

| 组 | 变量 | 类型 | scopes |
|---|---|---|---|
| 表面 | `paper` `card` `well` `well2` | COLOR | `FRAME_FILL` |
| 墨色 | `ink1` `ink2` `ink3` `ink4` | COLOR | `TEXT_FILL` |
| 细线 | `hair` `hair2` | COLOR | `STROKE` |
| 焦点 | `focus` `focus2` `focusSoft` | COLOR | `ALL_FILLS` |
| 涨 | `pos` `posSoft` | COLOR | `TEXT_FILL` / `ALL_FILLS` |
| 跌 | `neg` `negSoft` | COLOR | `TEXT_FILL` / `ALL_FILLS` |
| 警示 | `warn` `warnSoft` | COLOR | `TEXT_FILL` / `ALL_FILLS` |
| 圆角 | `r1`=6 `r2`=12 `r3`=20 `rPill`=999 | FLOAT | `CORNER_RADIUS` |
| 间距 | `s1`=4 … `s8`=64 | FLOAT | `GAP` |
| 字号 | `t12`…`t36` | FLOAT | `FONT_SIZE` |

绑定写法：`fill: "$:Cartographer:card"` / `cornerRadius: "$:Cartographer:r3"`

### 注意：变量名不能带 `$` 或 `:`

这是硬约束。所以变量名用 `ink1` / `focusSoft` 这类无符号 camelCase，
**不要**写成 `ink-1` 之外的 `--ink-1` 形式。

### 明暗切换

`fetch_variables({nodeId})` 读 `availableVariableModes` → 拿 `variableSetId` 和
`modes[].id` → `U(pageOrFrameId, {variableModes:[{variableSetId, modeId}]})`。
**在顶层 frame 切一次**即可，靠继承往下传，不要每个叶子都设。

---

## 5. 组件清单（先建组件，再拼页面）

按 `design-rules.md` 的要求：**图标必须先做成 component，再用 `I(parent, {type:"ref", ref:id})` 插实例**。

| # | 组件名 | 说明 | 变体 |
|---|---|---|---|
| C1 | `NavTab` | 顶部导航页签 | `default` / `active` / `hover` |
| C2 | `BtnGhost` | 次级按钮（描边） | `default` / `hover` |
| C3 | `BtnSolid` | 主按钮（focus 实心） | `default` / `hover` |
| C4 | `ViewToggle` | 市值/市场价 二选一 | `on` / `off` |
| C5 | `KpiCell` | KPI 单元格（标签 + 大数 + 涨跌） | `pos` / `neg` / `flat` |
| C6 | `PosRow` | 持仓行（logo + 代码 + 数量 + 均价 + 市值 + 收益） | `pos` / `neg` |
| C7 | `AllocTile` | 配置瓦片 | `pos` / `neg` |
| C8 | `LogoCircle` | 股票 logo 圆底（**SVG 节点，不是字母**） | 每个标的一个 |
| C9 | `SectionCard` | 通用卡片容器（card 底 + hair 描边 + r3 + sh-1） | — |

### 图标硬规则（反复踩的坑）

- 图标**必须**是 `type:"frame"` + `svg` 属性，且 `layout:"none"`
- ❌ 禁止 emoji / Unicode 几何符号塞进 `type:"text"` 的 `content`
  （`✓` `▶` `☀️` `↑` `↓` 全部禁止，含前缀/后缀形式）
- ❌ 禁止 `icon_font` / `iconFontName`
- ❌ 禁止用「圆圈里放一个字母」冒充图标

⚠️ **本项目特别注意**：涨跌箭头 `↑` `↓` 是**典型的违规写法**。
必须做成两个 SVG 组件（`ArrowUp` / `ArrowDown`），再用实例。

---

## 6. 画板清单（3 块）

Ardot 是固定尺寸画板，"桌面优先兼容移动" 翻译成 **多画板**：

| # | 画板 | 尺寸 | 内容 |
|---|---|---|---|
| A1 | `Overview / Desktop` | 1440 × 自动 | 主仪表盘（左栏 5 卡 + 右画布） |
| A2 | `Holdings Detail / Desktop` | 1440 × 自动 | 持仓详情页（HP 头 + 工具栏 + 列表 + 图表） |
| A3 | `Overview / Mobile` | 390 × 自动 | 单列，左栏在前 |

可选加分：`A1-Dark`（同 A1，顶层 frame 切 Dark 模式）——**成本极低**，
因为所有颜色都绑了变量，切模式即可，不用重画。这是变量集最大的价值兑现点。

### A1 结构树

```
Page 0:1
└─ Frame  "A1 · Overview 1440"  layout:vertical  width:1440  fill:$:Cartographer:paper
   ├─ Frame "Topbar"            height:64  layout:horizontal  padding:[0,24]  SPACE_BETWEEN
   │  ├─ Frame "Brand"          [LogoMark(SVG), Text "Portfolio"]
   │  ├─ Frame "Nav"            layout:horizontal  gap:s5   → 5 × NavTab 实例
   │  └─ Frame "Actions"        [SearchField, ThemeToggle, Avatar]
   └─ Frame "Body"              layout:horizontal  gap:s5  padding:s5
      ├─ Frame "LeftCol"        width:473  layout:vertical  gap:s4
      │  ├─ AccountCard         [账户名/编号, 总值 €24,382.61, mini-chart(SVG), 2×2 mini-stats]
      │  ├─ KpiGrid             2 列 × 3 行 = 6 × KpiCell
      │  ├─ SectionCard "Positions"    表头 + 5 × PosRow
      │  ├─ SectionCard "PendingOrders"  2 行
      │  └─ SectionCard "Allocation"   比例树图（见下）
      └─ Frame "Canvas"         width:895  layout:vertical  gap:s5
         ├─ SectionCard "PriceChart"   头部(标的+区间) + 图表区 820×300
         └─ ...其余画布模块
```

### 比例树图（Allocation）的几何

原型用 CSS `flex: var(--w)` / `flex: var(--h)` 实现**面积 = 权重**。
Ardot 里没有 flex-grow 权重，改用**固定像素**（画布固定宽度，反而更直接）。

⚠️ **关键：`.section-card` 没有 padding（`overflow:hidden`，全出血）**，
所以树图宽度 = **左栏宽 473**，不是 `473 − 2×24`。别按卡片内宽算。

几何：`473 × 210`，缝 1px；行高比 `50.7 : 49.3`；行内瓦片比即权重比。

| 行 | 行高 | 标的 | 权重 | 瓦片像素 | 实际面积 | 偏差 |
|---|---|---|---|---|---|---|
| 1 | 106 | NVDA | 26.3% | **245 × 106** | 26.15% | 0.15 |
| 1 | 106 | AAPL | 24.4% | **227 × 106** | 24.22% | 0.18 |
| 2 | 103 | MSFT | 22.3% | **213 × 103** | 22.09% | 0.21 |
| 2 | 103 | VOO  | 15.0% | **143 × 103** | 14.83% | 0.17 |
| 2 | 103 | TSLA | 12.0% | **115 × 103** | 11.92% | 0.08 |

> 已验算：行宽 245+1+227 = 473 ✓ ；213+1+143+1+115 = 473 ✓ ；
> 行高 106+1+103 = 210 ✓ ；面积偏差全部 ≤ 0.21pp（整数像素取整所致）。
>
> **面积即权重，不是 2×2 均分**——这是用户明确纠正过的要求。
> 换算公式：`瓦片宽 = (行宽 − 缝) × 权重 / 该行权重和`，
> **不是** `总宽 × 权重`（后者会算错，因为权重是行内相对值）。

### A2 结构树

```
Frame "A2 · Holdings Detail 1440"
├─ Frame "BackBar"        [← 返回(SVG), 面包屑]
├─ Frame "HpHead"         [LogoCircle, 名称, 代码] + [总值 大号] + [涨跌胶囊]
├─ Frame "HpMetaRow"      [持仓数 · 成本 · 今日盈亏 · 数据时间]
├─ Frame "HpToolbar"      [ViewToggle 市值/市场价, 区间选择, 排序]
├─ Frame "HpDesc"         公司简介段落
├─ Frame "PriceChart"     图表区（SVG 折线 + 3 个成交标记）
└─ Frame "HpList"         表头 + N × HpRow
```

### A3 结构树

```
Frame "A3 · Overview 390"
└─ Frame "Stack"  layout:vertical  width:390  gap:s4  padding:s4
   ├─ Topbar（窄版：品牌 + 头像，隐藏 nav/搜索）
   ├─ AccountCard
   ├─ KpiGrid（2 列）
   ├─ SectionCard "Positions"   PosRow 收成 3 列（logo 32 / 1fr / 收益 72）
   ├─ SectionCard "PendingOrders"
   └─ SectionCard "Allocation"
```

---

## 7. 已知坑（5 条，逐条对应原型里踩过的）

### 坑 1 — 数字必须等宽对齐，但画布可能没有 `tnum`

原型用 `font-feature-settings:"tnum"` 让 €24,382.61 这类数字列对齐。
**Ardot 文本节点大概率没有 font-feature-settings**。

对策：
- 数值列用**固定宽度 + 右对齐**（`textAlignHorizontal:"RIGHT"` + 固定 `width`）
- 小数位统一（全部 2 位），避免宽度跳动
- 如果 `get_available_fonts` 里能拿到本身等宽的数字字体，优先用

### 坑 2 — 字体

画布默认 `Inter`。原型用系统栈 + `--font-mono`。
重启后先 `get_available_fonts`，优先选**中性 grotesque**（Inter / SF 系）。
品牌规范禁止 webfont 是针对**发布出去的插件**，画布设计稿不受此约束。

### 坑 3 — SVG 折线要算对坐标

22 个收盘价 → SVG 坐标。公式：

```
x_i = i / (n-1) × W
y_i = H − (p_i − pMin) / (pMax − pMin) × H
```

数据：`2026-08-17 → 2026-09-15`，22 点，收在 `$198.17`；
价格轴范围 `$177.50 – $205.00`（与原型截图一致）。
3 个成交标记：`08-24 买 @188.75` / `09-07 卖 @196.35` / `09-11 买 @198.90`。

⚠️ **标记必须落在正确的时间位置**——这正是上一轮手绘 SVG 掩盖掉的问题，
画布上要显式验算，别靠眼睛。

### 坑 4 — 文本节点默认没有颜色

`type:"text"` **必须显式给 `fill`**，否则不可见。
本项目所有文字都应绑 `$:Cartographer:ink1/ink2/ink3/ink4`。

### 坑 5 — 文本换行

默认 `width:"hug_contents"` 会横向撑开。段落文字必须设
`width:"fill_container"`（父容器是 flex）或固定宽度。

---

## 8. 施工顺序

1. `create_design`（或按 directive）→ **等 ready**，不要和读操作同一条消息
2. `fetch_variables` + `fetch_editor_state`（并行一条消息）
3. `apply_variables` 吃 `ardot-variables.json` → 建 `Cartographer` 集合
4. 建 §5 组件（图标组件先建）
5. `locate_available_space(1440, 3000)` → 开始拼 A1
6. `batch_edit` ≤ 25 ops/次，顺序：**结构 → 内容 → 样式 → 验证**
7. 验证分级：T1 结构用 `capture_layout`；T3 视觉 / T4 整段用 `capture_screenshot`
   **不要每批都截图**，每段最多 2 次修正
8. A1 完成 → 复制成 A1-Dark（切模式）→ 再拼 A2 / A3

---

## 9. 语言

画布内容用**中文**（用户全程中文）。
按核心技能要求，开工前必须先发一条声明：
**「本次设计稿内容将使用中文生成」**

品牌名 / 股票代码 / 单位（Trading 212、NVDA、EUR、USD）保留原文，不翻译。
