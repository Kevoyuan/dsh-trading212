# 界面现状评审 · 2026-09-25

> **状态：已修复。** 这份评审列出的缺陷已全部处理，变更记录见 `REDESIGN-REPORT.md` 的
> **Pass 14**，改后截图见 `.design-work/pass14/`。
>
> **后续（Pass 15，2026-09-26）：** 评审里「预览有三段产品不存在的界面」这一项已按用户选择
> 处理完毕 —— 挂载 `ProfitDrivers` 与 `CurrencyExposureChart` 到概览画布（`.cockpit-analytics-strip`
> → `.cockpit-sub-analytics-grid`），删除「组合问答 / 询问 dsh」整条线（10 个选择器、两个预览文件）。
> 挂载过程中又发现并修掉 7 处缺陷，详见 `REDESIGN-REPORT.md` 的 **Pass 15**，证据截图在
> `.design-work/pass15/`。
>
> 仍然未处理、且都不是本轮引入的：手机端持仓表横向滚动、详情页 `持仓明细` 通栏排布，以及
> **981–1090px 区间概览持仓表需要最多 86px 横向滚动**（`.table-scroll` 滚动容器，溢出闸门看不见它）。

一次独立复核，不是新的一轮设计。方法：跑起仓库自带的 mock harness（`.design-work/mock-server.mjs`
+ `lib/ui`，14:10 构建）渲染**真实应用**，同时用当前 `src/app/styles.css` 重新生成 standalone 预览做对照。
证据截图在 `.design-work/review-2026-09-25/`。

---

## 结论

**产品本身比文档描述的干净，但有 4 处用户一眼能看到的缺陷，和 3 处 390px 下的挤压。**
**更值得先处理的是：仓库根目录那份 standalone 预览已经不等于产品了，而对外截图都出自它。**

实测基线（1440×900，默认 fixture，光）：

| 指标 | 实测 | DESIGN.md 要求 | |
| --- | --- | --- | --- |
| 字号层级 | 6（12 / 14.5 / 17.5 / 21 / 25.5 / 40） | 6 | 守住了 |
| 圆角种类 | 4（8 / 14 / 20 / 999） | 4 | 守住了 |
| 阴影种类 | 2 | 2 | 守住了 |
| 整页高度 | 1339px | — | 首屏（900px）已含图表主体 |
| 图表 | 990×384，y 213–597 | — | 桌面占比健康 |
| 拼盘面积忠实度 | 权重 24.4/22.3/26.3/12/15 → 面积 27.2/22.4/25.1/10.6/14.7 | 面积 = 权重 | 基本成立 |

---

## 一、产品缺陷（真实应用）

### P1 · 概览页的图表没有任何说明文字

`.price-chart-panel` 的子节点实测只有 `price-chart-wrap` 和 `sr-only`；
`#price-chart-title`、`.chart-legend`、`.chart-meta` 在概览页**都不存在**。

原因：`App.tsx:840–842` 用 `{!compact && …}` 门控标题、图例、成交点数与重置按钮，
而概览页第 933 行固定传 `compact`。只有下钻的详情页才拿到完整说明。

后果，在默认落点上：

- 图里那颗绿方块和琥珀三角**没有图例**，用户不知道那是买/卖成交点；
- 不写周期（日内 / 日线）、不写数据源、不写区间内成交点数量；
- 纵轴只有 `US$470.39` 这类数字，没有币种标注，而上面 100px 处的持仓盈亏是 €。

DESIGN.md 的 Chart contract 原文要求「Keep date range, interval, currency, source, and fill
count visible near the chart」。概览页违反了自己定的契约。
证据：`detail-chart-no-title.png`

### P2 · 资产配置的模式切换器文字折行

`.treemap-mode-pill` 实测 **55×36px**，`今日变化` / `累计收益` 各折成两行
（`今日`／`变化`、`累计`／`收益`），文字顶满控件高度。1440 下就是这样，不是窄屏特例。
证据：`detail-treemap-toggle-wrap.png`

### P3 · 账户卡两个副指标参差

同一行两个指标：`今日盈亏 +€302.30 (+1.4%)` 占一行；
`累计未实现 +€2,336.33` 后 `(+11.7%)` 掉到第二行。
实测 `strong` 高度 **26px vs 53px**，卡片右下留空。
证据：`app-1440-light.png`

### P4 · 唯一的亏损拼盘块把数字藏起来了

TSLA 权重 12%（最小），`computeTreemapLayout` 给它 `h = 24.33`，触发
`isCompact = rect.w < 30 || rect.h < 28`，于是 `{!isCompact && …}` 把
**权重和当日盈亏整块丢掉**——它只显示 `TSLA` 和 `▼ -2.2%`。

同一屏另外四块都带 `24.4% +€100.42` 这样的子行。也就是说：**唯一亏损的那块，是唯一不告诉用户亏了多少的那块**，
而这恰好是最需要看到金额的一块。DESIGN.md 第 7 条明说密度只能用面积买、不能用信息换。

顺带一个真 bug：`rect.w` / `rect.h` 是**百分比**（0–100，来自 `height: ${rect.h}%`），
却拿去和 `30` / `28` 这种像像素的阈值比较。现在只是碰巧结果可接受；
容器一变高，一个 24% × 800px = 195px 高的块仍然会被判成 compact。
证据：`detail-treemap-tsla-compact.png`

### P5 · 390px 下「主要持仓」标题被挤成 3+1 折行

实测 h2 盒子 **73px 宽 × 63px 高** → `主要持` / `仓`。

原因：`.section-heading` 是 flex 行，长副标题先吃掉 max-content，h2 被压到 73px。
**这和 Pass 13 修掉的 `.cockpit-inst-head` 是同一类 bug**——`auto`/max-content 兄弟把
`1fr` 挤到 min-content 以下——只是换了个位置，所以上一轮的宽度扫描没覆盖到。
证据：`detail-mobile-heading-wrap.png`

### P6 · 390px 下持仓表首列不收敛，价格被推到屏外

`.table-scroll` 里 `table { width: max-content }`，而 资产 列宽到让
`NVIDIA Corp.` 和 `NVDA · USD` 各折两行；可见区域的 均价 列只露出 `US$`，
数字在屏幕外。手机上要横滑才能看到价格，而横滑的第一屏全是换行的公司名。
建议首列限宽 + 名称单行省略。
证据：`detail-mobile-heading-wrap.png`

### P7 · 390px 的信息顺序：主角在 1.5 屏之后

页面 2661px（3.15 屏）。顺序是：账户卡 132–329 → 资金卡 → 上下文条 →
资产配置 675–1147 → 查看全部持仓 → 历史 → 法律声明 → **标的容器 1265** → 图表 1503–1755。

DESIGN.md 里写的是「below 980px … rail first, then canvas」，是有意选择；
代价就是手机上这个页面没有主角，要看价格曲线得先划过一屏半的账户信息。
证据：`app-390-light.png`

---

## 二、更严重：预览已经不是产品了

`preview-redesign.html` / `preview-redesign-en.html` 在仓库根目录，是
`scripts/capture-screenshots.py` 生成 `docs/images/*` 的来源，README 头图从这来。
用当前 `src/app/styles.css` 重新生成后再渲染，实测：

**1. 顶部偏移丢了。** `App.tsx` 把 cockpit 包在 `<main className="workspace">` 里
（`padding: 104px 36px 40px`），`preview-body.html` 里 `.t212-cockpit-layout` 直接挂在
`.t212-native-app-root` 下，没有这层包裹。实测：有包裹时首个内容 top=104、顶栏 bottom=72；
预览里 **top=0**——账户卡、标的头、区间切换器全部压在固定顶栏底下。
本次所有截图都是我临时补上包裹层才拍到的。
证据：`preview-broken-topbar-collision.png`

**2. 预览渲染了三段产品里不存在的界面。**
`cockpit-ai-prompt-strip`（左栏「询问 dsh」）、`cockpit-ai-analysis-card`（「组合问答」）、
`cockpit-sub-analytics-grid`（「未实现盈亏贡献」+「标的交易币种暴露」）——
这三个类名只出现在 `styles.css` 和两个 preview-body 里，在**任何** `.tsx` 中都不存在。
反过来，预览**漏掉了产品有的**待处理订单块。

**3. 四个死类名。** `pro-shortcuts-hud` / `hud-pill` / `hud-help-btn` / `shortcuts-hud-pills`
仍在预览 markup 里，样式已随 Pass 12 删干净——没有任何 CSS 匹配它们。

**4. fixture 数字自相矛盾**（预览是手写死的）：

| 说法 | 值 |
| --- | --- |
| 上下文条「前三大集中度」 | 55.2% |
| 表格权重算出的前三大 | 26.3 + 24.4 + 22.3 = **73.0%** |
| 拼盘权重算出的前三大 | 28.5 + 26.2 + 18.1 = **72.8%** |
| 拼盘权重 vs 表格权重 | AAPL 28.5 vs 24.4；MSFT 18.1 vs 22.3；VOO 11.8 vs 15.0（两套） |
| 币种暴露 | USD 4 + EUR 1 + GBP 1 = 6 个持仓，组合只有 5 个，且表里五行全是 USD |

对金融产品来说，同一个屏幕上「前三大集中度」有三个答案，是最伤信任的一类问题。

**所以：** `REDESIGN-REPORT.md` 里「两个 standalone 预览都由同一份 styles.css 生成」
只对 CSS 成立；markup 早已脱节。文档里 22/22 green 的验证跑的是另一套 harness（`.design-work/`），
不是预览。现在任何从预览出的截图都是错的，README 头图还是 9 月 9 日的旧设计（全宽深色顶栏）。

---

## 三、文档与代码脱节

DESIGN.md 自称 Locked rules，`design-qa.md` 称它是 "Authoritative product direction"，
但它和代码、和 REDESIGN-REPORT 三者不一致：

| DESIGN.md | 代码 |
| --- | --- |
| `--canvas: #eaedf5` | `#F4F6FC`（Pass 11 对比表里的 A 方案，不是报告说「已应用」的 B 方案） |
| `--well: #e0e6f1` | `#EBEFF8` |
| `--hair: #d3dae6` | `#DCE3F0` |
| `--fs-price: 31px` | `--fs-hero-sm: 31px`，已退出桌面内容层级 |
| rail 固定 **380px**（1180px 处 340px） | `grid-template-columns: 336px`（1180px 处 306px） |

---

## 四、建议的修复顺序

1. **修预览**：补 `.workspace` 包裹、删三段多余 markup 与四个死类名、把 fixture 数字对齐成一套。
   在这之前所有对外截图都不可信。
2. **概览页图表补回说明**（至少图例 + 周期/区间 + 成交点数）——这是 DESIGN.md 自己的契约。
3. **三处 390px 挤压**：模式切换器折行、`主要持仓` 标题折行、持仓表首列限宽。
   其中标题那条和 Pass 13 已修的 bug 同源，值得顺手把宽度扫描补上 `.section-heading`。
4. **信息一致性**：账户卡副指标换行；拼盘 compact 阈值改成按像素或在最小块上保留金额。
5. **把 DESIGN.md 的 token 与 rail 宽度同步到代码**，否则「唯一事实来源」是空的。

## 五、没有发现问题的部分

- 令牌系统（字号 / 圆角 / 阴影 / 缓动）确实守住了，实测与声明一致；
- 拼盘面积对权重是忠实的（`computeTreemapLayout` 的二分切分结果 = 权重）；
- 暗色模式是真暗色，绿/红语义保留，对比度目视无问题；
- 数字尾零已裁剪（`27.4` 而不是 `27.4000`），货币前缀明确（`US$`）；
- 读图标的（logo service）在默认 profile 下正常工作，VOO 回落到首字母是预期的 404 行为。
