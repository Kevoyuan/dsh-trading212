import { Children, useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState, useSyncExternalStore, type ReactNode } from 'react'
import { createChart, CrosshairMode, AreaSeries, LineStyle, type IChartApi, type LineData, type MouseEventParams, type Time, type UTCTimestamp } from 'lightweight-charts'
import {
  AlertTriangle, ArrowLeft, ArrowRight, BriefcaseBusiness, Check, ChevronDown, CircleHelp, Clipboard, Eye, EyeOff,
  History as HistoryIcon, LayoutDashboard, LoaderCircle, Moon, RefreshCw, Search, Settings, ShieldCheck, Sun, Unplug,
} from 'lucide-react'
import { ApiError, api, diagnosticText } from './api.ts'
import { createTradeDots } from './trade-dots.ts'
import { copyText } from './clipboard.ts'
import { languageStore, localeCode, tx } from './i18n.ts'
import { themeStore, type ThemePreference } from './theme.ts'
import type { ConnectionStatus } from '../portfolio-service.ts'
import type { MarketRange, MarketSeries } from '../market-data.ts'
import type { CashTransaction, Dividend, HistoricalOrder, HistoryItem, HistoryKind, PortfolioSnapshot, Position, TradingEnvironment } from '../trading212.ts'

type Page = 'overview' | 'holdings' | 'instrument' | 'history' | 'settings' | 'help' | 'setup'
type CopyStatus = 'idle' | 'copied' | 'failed'
type BootState = { kind: 'loading' } | { kind: 'error'; error: ApiError } | { kind: 'ready'; status: ConnectionStatus }

const money = (value: number | undefined, currency = 'EUR') => new Intl.NumberFormat(localeCode(), {
  style: 'currency', currency, maximumFractionDigits: 2,
}).format(value ?? 0)

const decimal = (value: number | undefined, maximumFractionDigits = 2) => new Intl.NumberFormat(localeCode(), {
  maximumFractionDigits,
}).format(value ?? 0)

const percent = (value: number | undefined, digits = 1) => value === undefined ? '-' : `${value >= 0 ? '+' : ''}${decimal(value, digits)}%`
const plainPercent = (value: number | undefined, digits = 1) => value === undefined ? '-' : `${decimal(value, digits)}%`
const displayTickerAliases: Record<string, string> = {
  SNDK1: 'SNDK',
  YNDX: 'NBIS',
}

export const tickerLabel = (ticker: string | undefined) => {
  const rawTicker = ticker?.replace(/_.*/, '')
  return rawTicker ? displayTickerAliases[rawTicker] ?? rawTicker : '-'
}
const signedMoney = (value: number | undefined, currency: string) => `${(value ?? 0) >= 0 ? '+' : ''}${money(value, currency)}`

function Brand() {
  return <div className="brand" aria-label="dsh"><span>dsh</span><i /></div>
}

function TopNavBar({
  connected,
  status,
  active,
  hideBalances,
  loading,
  searchQuery,
  onSearchChange,
  onToggleHideBalances,
  onRefresh,
  onNavigate,
}: {
  connected: boolean
  status?: ConnectionStatus
  active: Page
  hideBalances: boolean
  loading: boolean
  searchQuery: string
  onSearchChange: (query: string) => void
  onToggleHideBalances: () => void
  onRefresh: () => void
  onNavigate: (page: Page) => void
}) {
  const items = connected
    ? [
        [LayoutDashboard, 'overview', tx('概览', 'Overview')],
        [BriefcaseBusiness, 'holdings', tx('持仓', 'Holdings')],
        [HistoryIcon, 'history', tx('历史', 'History')],
        [Settings, 'settings', tx('设置', 'Settings')],
        [CircleHelp, 'help', tx('帮助', 'Help')],
      ] as const
    : [
        [BriefcaseBusiness, 'setup', tx('连接', 'Connect')],
        [CircleHelp, 'help', tx('帮助', 'Help')],
      ] as const

  const theme = useSyncExternalStore(themeStore.subscribe, themeStore.getSnapshot)

  return (
    <header className="t212-native-topbar">
      <div className="topbar-navigation-group">
        <div className="topbar-left-zone">
          <button
            type="button"
            className="t212-invest-brand-pill"
            onClick={() => onNavigate('settings')}
            title={tx('账户环境与连接设置', 'Account settings')}
          >
            <span className="invest-triangle-glyph">▲</span>
            <span className="invest-title-text">INVEST</span>
            {status && <span className="invest-env-badge">{status.environment === 'live' ? 'LIVE' : 'DEMO'}</span>}
            <ChevronDown strokeWidth={1.5} size={12} className="invest-chevron-icon" />
          </button>
        </div>

        <nav className="topbar-center-nav" aria-label={tx('Trading 212 导航', 'Trading 212 navigation')}>
          {items.map(([Icon, page, label]) => (
            <button
              key={page}
              type="button"
              className={`topbar-nav-tab ${active === page ? 'active' : ''}`}
              aria-current={active === page ? 'page' : undefined}
              onClick={() => onNavigate(page as Page)}
            >
              <Icon size={17} strokeWidth={1.4} />
              <span>{label}</span>
            </button>
          ))}
        </nav>
      </div>

      <div className="topbar-right-zone">
        {connected && (
          <div className="topbar-search-slot">
            <Search strokeWidth={1.5} size={14} className="search-glyph-icon" />
            <input
              type="text"
              className="topbar-search-field"
              aria-label={tx('搜索标的', 'Search holdings')}
              placeholder={tx('搜索标的…', 'Search…')}
              value={searchQuery}
              onChange={e => onSearchChange(e.target.value)}
            />
            {searchQuery && (
              <button type="button" className="clear-search-btn" onClick={() => onSearchChange('')}>×</button>
            )}
          </div>
        )}

        <button
          type="button"
          className="topbar-tool-btn"
          aria-label={hideBalances ? tx('显示金额', 'Show amounts') : tx('隐藏金额', 'Hide amounts')}
          title={hideBalances ? tx('显示金额', 'Show amounts') : tx('隐藏金额', 'Hide amounts')}
          onClick={onToggleHideBalances}
        >
          {hideBalances ? <EyeOff strokeWidth={1.5} size={16} /> : <Eye strokeWidth={1.5} size={16} />}
        </button>

        <button
          type="button"
          className="topbar-tool-btn"
          aria-label={tx('切换主题 (T)', 'Toggle theme (T)')}
          title={theme.active === 'dark' ? tx('切换为明亮主题 (T)', 'Switch to light theme (T)') : tx('切换为暗黑主题 (T)', 'Switch to dark theme (T)')}
          onClick={() => themeStore.toggle()}
        >
          {theme.active === 'dark' ? <Sun strokeWidth={1.5} size={16} /> : <Moon strokeWidth={1.5} size={16} />}
        </button>

        {connected && (
          <button
            type="button"
            className="topbar-tool-btn"
            aria-label={tx('刷新', 'Refresh')}
            title={tx('刷新', 'Refresh')}
            onClick={onRefresh}
            disabled={loading}
          >
            <RefreshCw strokeWidth={1.5} size={15} className={loading ? 'spin' : ''} />
          </button>
        )}
      </div>
    </header>
  )
}

function ErrorPanel({ error, status, onRetry, compact = false }: { error: ApiError; status?: ConnectionStatus; onRetry?: () => void; compact?: boolean }) {
  const [copyStatus, setCopyStatus] = useState<CopyStatus>('idle')
  const copy = async () => {
    try { await copyText(diagnosticText(error, status)); setCopyStatus('copied') }
    catch { setCopyStatus('failed') }
  }
  return <section className={compact ? 'error-panel compact' : 'error-panel'} role="alert" id={`help-${error.code.toLowerCase().replaceAll('_', '-')}`}>
    <strong>{error.message}</strong><p>{error.causeText}</p><p className="error-action">{tx('下一步：', 'Next: ')}{error.action}</p>
    {error.retryAt && <small>{tx('可重试时间：', 'Retry at: ')}{new Date(error.retryAt).toLocaleTimeString(localeCode())}</small>}
    <div className="error-actions">{onRetry && <button type="button" onClick={onRetry}>{tx('重试', 'Retry')}</button>}<button type="button" onClick={() => void copy()}><Clipboard strokeWidth={1.5} />{copyStatus === 'copied' ? tx('已复制诊断', 'Diagnostics copied') : copyStatus === 'failed' ? tx('复制失败', 'Copy failed') : tx('复制诊断', 'Copy diagnostics')}</button></div>
  </section>
}

function ConnectionForm({ onConnected, title }: { onConnected: (status: ConnectionStatus, snapshot: PortfolioSnapshot) => void; title?: string }) {
  const [environment, setEnvironment] = useState<TradingEnvironment>('demo')
  const [apiKey, setApiKey] = useState('')
  const [apiSecret, setApiSecret] = useState('')
  const [showSecret, setShowSecret] = useState(false)
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<ApiError>()
  const submit = async (event: React.FormEvent) => {
    event.preventDefault(); setPending(true); setError(undefined)
    try {
      const result = await api.connect({ apiKey, apiSecret, environment })
      setApiKey(''); setApiSecret(''); setShowSecret(false)
      onConnected(result.status, result.snapshot)
    } catch (cause) {
      setError(cause instanceof ApiError ? cause : new ApiError('INTERNAL_ERROR', '连接失败', '发生未知错误', '重试', '/trading212/#help-internal-error', 'connect'))
    } finally { setPending(false) }
  }
  return <section className="connection-card">
    <div className="eyebrow"><ShieldCheck strokeWidth={1.5} />{tx('只读访问', 'Read-only access')}</div><h1>{title ?? tx('连接你的 Trading 212', 'Connect your Trading 212')}</h1><p>{tx('选择密钥所属环境，粘贴 Key 和只显示一次的 Secret。保存前会验证账户、持仓和待处理订单。', 'Choose the environment for your key, then paste the Key and one-time Secret. We verify your account, holdings, and pending orders before saving.')}</p>
    <form onSubmit={submit}>
      <fieldset><legend>{tx('账户环境', 'Account environment')}</legend><div className="environment-options">
        <label className={environment === 'demo' ? 'selected' : ''}><input type="radio" name="environment" checked={environment === 'demo'} onChange={() => setEnvironment('demo')} /><span><b>Demo</b><small>{tx('模拟账户，推荐先测试', 'Practice account, recommended for testing')}</small></span></label>
        <label className={environment === 'live' ? 'selected live' : ''}><input type="radio" name="environment" checked={environment === 'live'} onChange={() => setEnvironment('live')} /><span><b>Live</b><small>{tx('真实账户的只读数据', 'Read-only data from your live account')}</small></span></label>
      </div></fieldset>
      <label className="field"><span>API Key</span><input autoComplete="off" value={apiKey} onChange={event => setApiKey(event.target.value)} required minLength={8} placeholder={tx('粘贴 API Key', 'Paste API Key')} /></label>
      <label className="field"><span>API Secret</span><div className="secret-wrap"><input type={showSecret ? 'text' : 'password'} autoComplete="new-password" value={apiSecret} onChange={event => setApiSecret(event.target.value)} required minLength={8} placeholder={tx('粘贴 API Secret', 'Paste API Secret')} /><button type="button" aria-label={showSecret ? tx('隐藏 Secret', 'Hide Secret') : tx('显示 Secret', 'Show Secret')} onClick={() => setShowSecret(value => !value)}>{showSecret ? <EyeOff strokeWidth={1.5} /> : <Eye strokeWidth={1.5} />}</button></div></label>
      <a className="help-link" href="https://helpcentre.trading212.com/hc/en-us/articles/14584770928157-How-can-I-generate-an-API-key" target="_blank" rel="noreferrer">{tx('查看 Trading 212 官方密钥说明', 'View Trading 212 key instructions')} <ArrowRight strokeWidth={1.5} /></a>
      {error && <ErrorPanel error={error} compact />}
      <button className="primary" type="submit" disabled={pending}>{pending ? <><LoaderCircle strokeWidth={1.5} className="spin" />{tx('正在验证完整快照…', 'Verifying full snapshot…')}</> : tx('测试并保存', 'Test and save')}</button>
    </form>
    <div className="trust-list"><span><Check strokeWidth={1.5} />{tx('凭据写入 dsh 凭据提供方', 'Credentials go to the dsh credential provider')}</span><span><Check strokeWidth={1.5} />{tx('浏览器不会保存 Key 或 Secret', 'The browser never stores your Key or Secret')}</span><span><Check strokeWidth={1.5} />{tx('插件不注册任何下单工具', 'The plugin registers no trading tools')}</span></div>
  </section>
}

function SetupPage({ onConnected }: { onConnected: (status: ConnectionStatus, snapshot: PortfolioSnapshot) => void }) {
  return <main className="setup-page"><ConnectionForm onConnected={onConnected} /><aside className="setup-guide"><h2>{tx('创建密钥时请选择', 'Select these key permissions')}</h2><ol><li>{tx('账户摘要读取权限', 'Read account summary')}</li><li>{tx('投资组合读取权限', 'Read portfolio')}</li><li>{tx('订单读取权限', 'Read orders')}</li><li>{tx('历史数据读取权限', 'Read history')}</li></ol><p>{tx('不要授予下单、修改或取消订单权限。如果启用了 IP 限制，请允许当前运行 dsh 的设备。', 'Do not grant permissions to place, modify, or cancel orders. If IP restrictions are enabled, allow the device running dsh.')}</p></aside></main>
}

function TickerRingLogo({ ticker, weightPercent }: { ticker: string; weightPercent?: number }) {
  const clean = tickerLabel(ticker)
  const initial = clean.slice(0, 2).toUpperCase()
  const [logoFailed, setLogoFailed] = useState(false)
  const r = 14
  const c = 2 * Math.PI * r
  const offset = weightPercent !== undefined ? c * (1 - Math.min(Math.max(weightPercent, 0), 100) / 100) : c
  useEffect(() => setLogoFailed(false), [ticker])


  return (
    <div className="ticker-ring-logo" title={`${clean}${weightPercent !== undefined ? ` · ${plainPercent(weightPercent)}` : ''}`}>
      <svg className="ring-svg" viewBox="0 0 34 34" aria-hidden="true">
        <circle cx="17" cy="17" r={r} className="ring-track" />
        {weightPercent !== undefined && weightPercent > 0 && (
          <circle
            cx="17"
            cy="17"
            r={r}
            className="ring-progress"
            style={{ strokeDasharray: c, strokeDashoffset: offset }}
          />
        )}
      </svg>
      <span className={`ticker-avatar ${logoFailed ? 'fallback' : ''}`}>
        {!logoFailed && <img src={`/api/trading212/logo?ticker=${encodeURIComponent(ticker)}`} alt="" onError={() => setLogoFailed(true)} />}
        {logoFailed && initial}
      </span>
    </div>
  )
}

interface TreemapRect {
  ticker: string
  name: string
  returnPercent?: number
  unrealizedProfitLoss: number
  currentValue: number
  weightPercent: number
  dailyChangePercent?: number
  dailyProfitLoss?: number
  x: number
  y: number
  w: number
  h: number
}

function computeTreemapLayout(
  items: Array<{
    ticker: string
    name: string
    returnPercent?: number
    unrealizedProfitLoss: number
    currentValue: number
    weightPercent: number
    dailyChangePercent?: number
    dailyProfitLoss?: number
  }>,
  x = 0,
  y = 0,
  w = 100,
  h = 100
): TreemapRect[] {
  if (items.length === 0) return []
  if (items.length === 1) {
    const item = items[0]!
    return [{ ...item, x, y, w, h }]
  }

  const totalWeight = items.reduce((sum, item) => sum + Math.max(item.weightPercent, 1), 0)
  if (totalWeight <= 0) return []

  let accumulated = 0
  let splitIndex = 1
  let minDiff = Infinity

  for (let i = 0; i < items.length - 1; i++) {
    accumulated += Math.max(items[i]!.weightPercent, 1)
    const ratio = accumulated / totalWeight
    const diff = Math.abs(ratio - 0.5)
    if (diff < minDiff) {
      minDiff = diff
      splitIndex = i + 1
    }
  }

  const groupA = items.slice(0, splitIndex)
  const groupB = items.slice(splitIndex)
  const weightA = groupA.reduce((sum, item) => sum + Math.max(item.weightPercent, 1), 0)
  const ratioA = weightA / totalWeight

  if (w >= h) {
    const wA = w * ratioA
    const wB = w - wA
    return [
      ...computeTreemapLayout(groupA, x, y, wA, h),
      ...computeTreemapLayout(groupB, x + wA, y, wB, h),
    ]
  } else {
    const hA = h * ratioA
    const hB = h - hA
    return [
      ...computeTreemapLayout(groupA, x, y, w, hA),
      ...computeTreemapLayout(groupB, x, y + hA, w, hB),
    ]
  }
}

export type TreemapMetricMode = 'daily' | 'total'

function DynamicTreemapGrid({
  allocation,
  activeTicker,
  metricMode = 'daily',
  positions,
  hideBalances,
  currency,
  onSelect,
}: {
  allocation: PortfolioSnapshot['analytics']['allocation']
  positions: Position[]
  hideBalances: boolean
  activeTicker?: string
  metricMode?: TreemapMetricMode
  currency?: string
  onSelect?: (ticker: string) => void
}) {
  const topItems = allocation.slice(0, 6)
  const rects = useMemo(() => computeTreemapLayout(topItems), [topItems])
  if (topItems.length === 0) return null

  return (
    <div className="dynamic-treemap-container">
      {rects.map(rect => {
        const val = metricMode === 'daily'
          ? rect.dailyChangePercent
          : rect.returnPercent

        const isPositive = val !== undefined && val > 0
        const isNegative = val !== undefined && val < 0
        const isSelected = rect.ticker === activeTicker
        const quantity = positions.find(position => position.instrument?.ticker === rect.ticker)?.quantity
        const displayVal = val === undefined ? (metricMode === 'daily' ? tx('同步中…', 'Syncing…') : '-') : percent(val)

        return (
          <div
            key={rect.ticker}
            className="treemap-rect-slot"
            style={{
              left: `${rect.x}%`,
              top: `${rect.y}%`,
              width: `${rect.w}%`,
              height: `${rect.h}%`,
            }}
          >
            <button
              type="button"
              className={`treemap-tile dynamic-tile ${isPositive ? 'gain' : isNegative ? 'loss' : 'neutral'} ${isSelected ? 'selected' : ''}`}
              onClick={() => onSelect?.(rect.ticker)}
              title={`${tickerLabel(rect.ticker)} · ${rect.name} · ${metricMode === 'daily' ? tx('今日变化', 'Today') : tx('累计收益', 'Total')} ${val !== undefined ? percent(val) : tx('数据同步中', 'Syncing...')} · ${tx('权重', 'Weight')} ${plainPercent(rect.weightPercent)}${!hideBalances && currency ? ` · ${money(rect.currentValue, currency)}` : ''}${!hideBalances && quantity !== undefined ? ` · ${decimal(quantity, 4)} ${tx('股', 'shares')}` : ''}`}
            >
              <div className="tile-top-row">
                <strong className="tile-ticker">{tickerLabel(rect.ticker)}</strong>
                {isSelected && <span className="tile-active-pip" aria-hidden="true" />}
              </div>
              <span className={`tile-percent ${isPositive ? 'tone-positive' : isNegative ? 'tone-negative' : 'tone-muted'}`}>
                {displayVal}
              </span>
              <div className="tile-subrow">
                <span className="tile-weight">{plainPercent(rect.weightPercent)}</span>
                {currency && <span className="tile-value">{hideBalances ? '••••' : money(rect.currentValue, currency)}</span>}
                {quantity !== undefined && <span className="tile-quantity">{hideBalances ? '••••' : decimal(quantity, 4)} {tx('股', 'shares')}</span>}
              </div>
            </button>
          </div>
        )
      })}
    </div>
  )
}

function BarList({ rows, currency, signed = false, ariaLabel }: { rows: Array<{ key: string; label: string; detail?: string; value: number }>; currency: string; signed?: boolean; ariaLabel: string }) {
  const max = Math.max(...rows.map(row => Math.abs(row.value)), 1)
  if (rows.length === 0) return <div className="empty-inline">{tx('暂无足够数据', 'Not enough data')}</div>
  return <div className="bar-list" aria-label={ariaLabel}>{rows.map(row => <div className="bar-row" key={row.key}>
    <div className="bar-label"><strong>{row.label}</strong>{row.detail && <small>{row.detail}</small>}</div>
    <div className="bar-measure"><i className={signed ? row.value < 0 ? 'bar-negative' : 'bar-positive' : 'bar-accent'} style={{ width: `${Math.max(Math.abs(row.value) / max * 100, 2)}%` }} /></div>
    <b className={signed ? row.value >= 0 ? 'tone-positive' : 'tone-negative' : ''}>{signed ? signedMoney(row.value, currency) : money(row.value, currency)}</b>
  </div>)}</div>
}

/* Both panels below list a *ranked* subset of a longer series, and both used to
   cut the list with `.slice(0, 6)` and print nothing about the cut. BarList sizes
   every bar against the largest row, not against the total, so a truncated list
   still looks complete - and in the exposure panel it printed a share column that
   silently stopped adding up to 100%. The tail is now its own row, the same way
   the allocation legend folds its tail into "其他 N 项". `allocation` and
   `currencyExposure` both arrive sorted by size, so the head is genuinely the top
   of the list and the tail is genuinely the rest. */
function ProfitDrivers({ portfolio }: { portfolio: PortfolioSnapshot }) {
  const ranked = [...portfolio.analytics.allocation].sort((a, b) => Math.abs(b.unrealizedProfitLoss) - Math.abs(a.unrealizedProfitLoss))
  const head = ranked.slice(0, 6)
  const tail = ranked.slice(6)
  const rows = [
    ...head.map(item => ({ key: item.ticker, label: item.name, detail: `${tickerLabel(item.ticker)} · ${percent(item.returnPercent)}`, value: item.unrealizedProfitLoss })),
    ...(tail.length ? [{
      key: '__tail',
      label: tx(`其他 ${tail.length} 项`, `${tail.length} others`),
      detail: tx('其余持仓合计', 'Remaining holdings'),
      value: tail.reduce((sum, item) => sum + item.unrealizedProfitLoss, 0),
    }] : []),
  ]
  return <BarList rows={rows} currency={portfolio.account.currency} signed ariaLabel={tx('未实现盈亏贡献排名', 'Unrealized return contributors')} />
}

function CurrencyExposureChart({ portfolio }: { portfolio: PortfolioSnapshot }) {
  const exposure = portfolio.analytics.currencyExposure
  /* Zero currencies fell through to the compact list below, which then rendered
     an empty div under a live heading. BarList already has the right words for
     this, so borrow them rather than inventing a second phrasing. */
  if (exposure.length === 0) return <div className="empty-inline">{tx('暂无足够数据', 'Not enough data')}</div>
  if (exposure.length < 4) return <div className="exposure-summary">{exposure.map(item => <div key={item.currency}><strong>{item.currency}</strong><span>{money(item.currentValue, portfolio.account.currency)}</span><small>{tx(`${item.positions} 个持仓`, `${item.positions} holdings`)} · {plainPercent(item.weightPercent)}</small></div>)}</div>
  const head = exposure.slice(0, 6)
  const tail = exposure.slice(6)
  const tailPositions = tail.reduce((sum, item) => sum + item.positions, 0)
  /* The `detail` below is a template literal, not JSX: it used to read
     `· {plainPercent(item.weightPercent)}` and would have printed that source
     verbatim as the row's subtitle. Nothing caught it because nothing rendered
     the component. */
  const rows = [
    ...head.map(item => ({
      key: item.currency, label: item.currency, detail: `${tx(`${item.positions} 个持仓`, `${item.positions} holdings`)} · ${plainPercent(item.weightPercent)}`, value: item.currentValue,
    })),
    ...(tail.length ? [{
      key: '__tail',
      label: tx(`其他 ${tail.length} 种`, `${tail.length} others`),
      detail: `${tx(`${tailPositions} 个持仓`, `${tailPositions} holdings`)} · ${plainPercent(tail.reduce((sum, item) => sum + item.weightPercent, 0))}`,
      value: tail.reduce((sum, item) => sum + item.currentValue, 0),
    }] : []),
  ]
  return <BarList rows={rows} currency={portfolio.account.currency} ariaLabel={tx('按标的交易币种划分的持仓市值', 'Holding value by instrument currency')} />
}

function HoldingTable({ positions, currency, limit, compact = false, selectedTicker, hideBalances = false, onSelect }: { positions: Position[]; currency: string; limit?: number; compact?: boolean; selectedTicker?: string; hideBalances?: boolean; onSelect?: (position: Position) => void }) {
  const rows = [...positions].sort((a, b) => (b.walletImpact?.currentValue ?? 0) - (a.walletImpact?.currentValue ?? 0)).slice(0, limit)
  if (rows.length === 0) return <div className="empty-state"><BriefcaseBusiness strokeWidth={1.5} /><strong>{tx('目前没有持仓', 'No holdings yet')}</strong><span>{tx('现金和账户总价值仍会显示在概览中。', 'Cash and total account value still appear in Overview.')}</span></div>
  const invested = positions.reduce((sum, item) => sum + (item.walletImpact?.currentValue ?? 0), 0)
  return <div className="table-scroll"><table className={`holdings-table ${compact ? 'holdings-table-compact' : ''}`}><thead><tr><th>{tx('资产', 'Asset')}</th><th>{tx('数量', 'Quantity')}</th><th>{tx('均价 / 现价', 'Average / current')}</th>{!compact && <th>{tx('成本', 'Cost')}</th>}<th>{tx('市值 / 权重', 'Value / weight')}</th><th>{tx('未实现收益', 'Unrealized return')}</th>{!compact && <th>{tx('外汇影响', 'FX impact')}</th>}</tr></thead><tbody>{rows.map((position, index) => {
    const value = position.walletImpact?.currentValue ?? 0
    const cost = position.walletImpact?.totalCost ?? 0
    const profit = position.walletImpact?.unrealizedProfitLoss ?? 0
    const fx = position.walletImpact?.fxImpact
    const label = position.instrument?.name ?? position.instrument?.ticker ?? tx('未知资产', 'Unknown asset')
    const ticker = position.instrument?.ticker ?? ''
    const weight = invested ? value / invested * 100 : 0
    return <tr key={ticker || index} className={ticker === selectedTicker ? 'is-selected' : ''}><td data-label={tx('资产', 'Asset')}><div className="asset-cell"><TickerRingLogo ticker={ticker} weightPercent={weight} />{onSelect && ticker ? <button className="asset-link" type="button" onClick={() => onSelect(position)}><strong>{label}</strong><small>{tickerLabel(ticker)} · {position.instrument?.currency ?? currency}</small></button> : <div className="asset-text"><strong>{label}</strong><small>{tickerLabel(ticker)} · {position.instrument?.currency ?? currency}</small></div>}</div><small>{(position.quantityInPies ?? 0) > 0 ? (hideBalances ? 'Pie ••••' : `Pie ${decimal(position.quantityInPies, 4)}`) : ''}</small></td><td data-label={tx('数量', 'Quantity')}>{hideBalances ? '••••' : decimal(position.quantity, 4)}<small>{tx('可交易', 'Tradable')} {hideBalances ? '••••' : decimal(position.quantityAvailableForTrading, 4)}</small></td><td data-label={tx('均价 / 现价', 'Average / current')}><strong>{hideBalances ? '••••' : (position.averagePricePaid === undefined ? '-' : money(position.averagePricePaid, position.instrument?.currency ?? currency))}</strong><small>{position.currentPrice === undefined ? '-' : money(position.currentPrice, position.instrument?.currency ?? currency)}</small></td>{!compact && <td data-label={tx('成本', 'Cost')}>{hideBalances ? '••••••' : money(cost, currency)}</td>}<td data-label={tx('市值 / 权重', 'Value / weight')}><strong>{hideBalances ? '••••••' : money(value, currency)}</strong><small>{plainPercent(weight)}</small></td><td data-label={tx('未实现收益', 'Unrealized return')} className={profit >= 0 ? 'tone-positive' : 'tone-negative'}><strong>{hideBalances ? '••••' : signedMoney(profit, currency)}</strong><small>{hideBalances ? '••••' : percent(cost ? profit / cost * 100 : undefined)}</small></td>{!compact && <td data-label={tx('外汇影响', 'FX impact')} className={(fx ?? 0) >= 0 ? 'tone-positive' : 'tone-negative'}>{hideBalances ? '••••' : (fx === undefined ? '-' : signedMoney(fx, currency))}</td>}</tr>
  })}</tbody></table></div>
}

/* The API returns status as a bare uppercase token. It was rendered raw, so the
   Chinese interface showed "FILLED" next to a localised 买入 / 卖出. Unknown
   values still fall through to the token rather than being blanked. */
const orderStatusLabel = (status: string) => ({
  NEW: tx('待成交', 'New'),
  FILLED: tx('已成交', 'Filled'),
  PARTIALLY_FILLED: tx('部分成交', 'Partially filled'),
  CANCELLED: tx('已取消', 'Cancelled'),
  REJECTED: tx('已拒绝', 'Rejected'),
  REPLACED: tx('已替换', 'Replaced'),
  LOCAL: tx('本地待提交', 'Local'),
  UNCONFIRMED: tx('待确认', 'Unconfirmed'),
} as Record<string, string>)[status] ?? status

const historyLabel = (kind: HistoryKind) => ({ orders: tx('历史订单', 'Orders'), transactions: tx('资金流水', 'Cash activity'), dividends: tx('分红', 'Dividends') })[kind]
const transactionLabel = (type: string) => ({
  WITHDRAW: tx('提现', 'Withdrawal'), DEPOSIT: tx('入金', 'Deposit'), FEE: tx('费用', 'Fee'), TRANSFER: tx('转账', 'Transfer'),
  INTEREST_ON_FREE_CASH: tx('闲置现金利息', 'Interest on cash'), LENDING_INTEREST: tx('证券出借利息', 'Share lending interest'),
} as Record<string, string>)[type] ?? type

function HistoryRows({ kind, items }: { kind: HistoryKind; items: HistoryItem[] }) {
  if (items.length === 0) return <div className="empty-state"><HistoryIcon strokeWidth={1.5} /><strong>{tx(`没有${historyLabel(kind)}`, `No ${historyLabel(kind).toLowerCase()}`)}</strong><span>{tx('Trading 212 暂未返回这一类历史记录。', 'Trading 212 has not returned any records in this category.')}</span></div>
  if (kind === 'orders') return <div className="table-scroll"><table><thead><tr><th>{tx('时间与资产', 'Time and asset')}</th><th>{tx('方向 / 状态', 'Side / status')}</th><th>{tx('数量', 'Quantity')}</th><th>{tx('成交价', 'Fill price')}</th><th>{tx('净额', 'Net value')}</th></tr></thead><tbody>{Children.toArray((items as HistoricalOrder[]).map((item, index) => {
    const date = item.fill?.filledAt ?? item.order.createdAt
    const currency = item.fill?.walletImpact?.currency ?? item.order.instrument?.currency ?? 'EUR'
    return <tr key={`order:${item.order.id}:fill:${item.fill?.id ?? index}`}><td data-label={tx('时间与资产', 'Time and asset')}><strong>{item.order.instrument?.name ?? item.order.ticker}</strong><small>{date ? new Date(date).toLocaleString(localeCode()) : tx('时间未知', 'Unknown time')} · {item.order.ticker.replace(/_.*/, '')}</small></td><td data-label={tx('方向 / 状态', 'Side / status')}><span className={`history-side ${item.order.side.toLowerCase()}`}>{item.order.side === 'BUY' ? tx('买入', 'Buy') : tx('卖出', 'Sell')}</span><small>{orderStatusLabel(item.order.status)}</small></td><td data-label={tx('数量', 'Quantity')}>{decimal(item.fill?.quantity ?? item.order.filledQuantity ?? item.order.quantity, 4)}</td><td data-label={tx('成交价', 'Fill price')}>{item.fill?.price === undefined ? '-' : money(item.fill.price, item.order.instrument?.currency ?? currency)}</td><td data-label={tx('净额', 'Net value')}>{item.fill?.walletImpact?.netValue === undefined ? '-' : money(item.fill.walletImpact.netValue, currency)}</td></tr>
  }))}</tbody></table></div>
  if (kind === 'dividends') return <div className="table-scroll"><table><thead><tr><th>{tx('日期与资产', 'Date and asset')}</th><th>{tx('数量', 'Quantity')}</th><th>{tx('每股', 'Per share')}</th><th>{tx('到账金额', 'Amount')}</th></tr></thead><tbody>{Children.toArray((items as Dividend[]).map(item => <tr key={item.reference}><td data-label={tx('日期与资产', 'Date and asset')}><strong>{item.instrument?.name ?? item.ticker}</strong><small>{new Date(item.paidOn).toLocaleDateString(localeCode())} · {item.ticker.replace(/_.*/, '')}</small></td><td data-label={tx('数量', 'Quantity')}>{decimal(item.quantity, 4)}</td><td data-label={tx('每股', 'Per share')}>{item.grossAmountPerShare === undefined ? '-' : decimal(item.grossAmountPerShare, 4)}</td><td data-label={tx('到账金额', 'Amount')} className="positive">+{money(item.amount, item.currency)}</td></tr>))}</tbody></table></div>
  return <div className="table-scroll"><table><thead><tr><th>{tx('时间与类型', 'Time and type')}</th><th>{tx('编号', 'Reference')}</th><th>{tx('金额', 'Amount')}</th></tr></thead><tbody>{Children.toArray((items as CashTransaction[]).map(item => <tr key={item.reference}><td data-label={tx('时间与类型', 'Time and type')}><strong>{transactionLabel(item.type)}</strong><small>{new Date(item.dateTime).toLocaleString(localeCode())}</small></td><td data-label={tx('编号', 'Reference')}><span className="history-reference">{item.reference}</span></td><td data-label={tx('金额', 'Amount')} className={item.amount >= 0 ? 'positive' : 'negative'}>{item.amount >= 0 ? '+' : ''}{money(item.amount, item.currency)}</td></tr>))}</tbody></table></div>
}

interface TradePoint {
  key: string
  ticker: string
  name: string
  side: 'BUY' | 'SELL'
  time: number
  filledAt: string
  price: number
  quantity: number
  currency: string
  netValue?: number
}

function TradeTimeline({ orders }: { orders: HistoricalOrder[] }) {
  const allPoints = useMemo(() => orders.flatMap((item, index): TradePoint[] => {
    const fill = item.fill
    if (fill?.filledAt === undefined || fill.price === undefined || !Number.isFinite(new Date(fill.filledAt).getTime())) return []
    return [{
      key: `${item.order.id}:${fill.id ?? index}`,
      ticker: item.order.ticker,
      name: item.order.instrument?.name ?? tickerLabel(item.order.ticker),
      side: item.order.side,
      time: new Date(fill.filledAt).getTime(),
      filledAt: fill.filledAt,
      price: fill.price,
      quantity: fill.quantity ?? item.order.filledQuantity ?? item.order.quantity ?? 0,
      currency: item.order.instrument?.currency ?? item.order.currency ?? fill.walletImpact?.currency ?? 'EUR',
      netValue: fill.walletImpact?.netValue,
    }]
  }).sort((a, b) => a.time - b.time), [orders])
  const options = useMemo(() => {
    const grouped = new Map<string, { ticker: string; name: string; count: number }>()
    for (const point of allPoints) {
      const current = grouped.get(point.ticker) ?? { ticker: point.ticker, name: point.name, count: 0 }
      grouped.set(point.ticker, { ...current, count: current.count + 1 })
    }
    return [...grouped.values()].sort((a, b) => b.count - a.count || a.name.localeCompare(b.name))
  }, [allPoints])
  const [ticker, setTicker] = useState('')
  const activeTicker = options.some(option => option.ticker === ticker) ? ticker : options[0]?.ticker ?? ''
  const points = allPoints.filter(point => point.ticker === activeTicker)
  if (allPoints.length === 0) return <section className="trade-timeline"><div className="section-heading"><div><h2>{tx('成交价格时间线', 'Fill price timeline')}</h2><p>{tx('当前已加载记录没有可绘制的成交时间与价格。', 'The loaded records contain no fill times and prices to chart.')}</p></div></div></section>

  const width = 820
  const height = 270
  const margin = { top: 22, right: 22, bottom: 42, left: 72 }
  const innerWidth = width - margin.left - margin.right
  const innerHeight = height - margin.top - margin.bottom
  const minTime = Math.min(...points.map(point => point.time))
  const maxTime = Math.max(...points.map(point => point.time))
  const minPrice = Math.min(...points.map(point => point.price))
  const maxPrice = Math.max(...points.map(point => point.price))
  const pricePad = maxPrice === minPrice ? Math.max(Math.abs(maxPrice) * .025, .01) : (maxPrice - minPrice) * .12
  const yMin = minPrice - pricePad
  const yMax = maxPrice + pricePad
  const x = (value: number) => margin.left + (maxTime === minTime ? innerWidth / 2 : (value - minTime) / (maxTime - minTime) * innerWidth)
  const y = (value: number) => margin.top + (yMax - value) / (yMax - yMin) * innerHeight
  const yTicks = Array.from({ length: 5 }, (_, index) => yMin + (yMax - yMin) * index / 4).reverse()
  const selected = options.find(option => option.ticker === activeTicker)
  const currency = points[0]?.currency ?? 'EUR'
  const latest = [...points].reverse().slice(0, 5)
  const formatPrice = (value: number) => money(value, currency)
  return <section className="trade-timeline" aria-labelledby="trade-timeline-title">
    <div className="timeline-header"><div className="section-heading"><h2 id="trade-timeline-title">{tx('成交价格时间线', 'Fill price timeline')}</h2><p>{tx(`${selected?.name ?? tickerLabel(activeTicker)} · 当前已加载 ${points.length} 个成交点 · 纵轴聚焦成交价格区间，不从零开始`, `${selected?.name ?? tickerLabel(activeTicker)} · ${points.length} loaded fills · Scaled price axis`)}</p></div><label><span>{tx('股票', 'Instrument')}</span><select value={activeTicker} onChange={event => setTicker(event.target.value)}>{options.map(option => <option key={option.ticker} value={option.ticker}>{option.name} · {tickerLabel(option.ticker)} ({option.count})</option>)}</select></label></div>
    <div className="timeline-legend"><span><i className="buy-marker" />{tx('买入', 'Buy')}</span><span><i className="sell-marker" />{tx('卖出', 'Sell')}</span><em>{tx('仅显示真实成交点，不是市场 K 线', 'Actual fills only, not market candles')}</em></div>
    {points.length === 1 ? <div className="single-trade"><strong>{formatPrice(points[0]!.price)}</strong><span>{points[0]!.side === 'BUY' ? tx('买入', 'Buy') : tx('卖出', 'Sell')} {decimal(points[0]!.quantity, 4)} {tx('股', 'shares')}</span><small>{new Date(points[0]!.filledAt).toLocaleString(localeCode())}</small></div> : <div className="timeline-chart-scroll"><svg className="timeline-chart" viewBox={`0 0 ${width} ${height}`} role="img" aria-label={tx(`${selected?.name ?? activeTicker} 的成交价格时间线，共 ${points.length} 个真实成交点`, `${selected?.name ?? activeTicker} fill price timeline with ${points.length} actual fills`)}>
      {yTicks.map((tick, index) => <g key={tick}><line x1={margin.left} x2={width - margin.right} y1={y(tick)} y2={y(tick)} className="timeline-grid" /><text x={margin.left - 10} y={y(tick) + 4} textAnchor="end" className="timeline-axis-label">{formatPrice(tick)}</text>{index === yTicks.length - 1 && <line x1={margin.left} x2={width - margin.right} y1={y(tick)} y2={y(tick)} className="timeline-axis" />}</g>)}
      <line x1={margin.left} x2={margin.left} y1={margin.top} y2={height - margin.bottom} className="timeline-axis" />
      <text x={margin.left} y={height - 15} textAnchor="start" className="timeline-axis-label">{new Date(minTime).toLocaleDateString(localeCode())}</text>
      <text x={width - margin.right} y={height - 15} textAnchor="end" className="timeline-axis-label">{new Date(maxTime).toLocaleDateString(localeCode())}</text>
      {points.map(point => <g key={point.key} className="timeline-point"><line x1={x(point.time)} x2={x(point.time)} y1={y(point.price)} y2={height - margin.bottom} className="timeline-stem" /><circle cx={x(point.time)} cy={y(point.price)} r="3.5" className={point.side === 'BUY' ? 'timeline-buy' : 'timeline-sell'}><title>{`${point.side === 'BUY' ? tx('买入', 'Buy') : tx('卖出', 'Sell')} · ${new Date(point.filledAt).toLocaleString(localeCode())} · ${formatPrice(point.price)} · ${decimal(point.quantity, 4)} ${tx('股', 'shares')}`}</title></circle></g>)}
    </svg></div>}
    <div className="timeline-events" aria-label={tx('最近成交点', 'Recent fills')}>{latest.map(point => <div key={point.key}><i className={point.side === 'BUY' ? 'buy-marker' : 'sell-marker'} /><span><strong>{point.side === 'BUY' ? tx('买入', 'Buy') : tx('卖出', 'Sell')} {decimal(point.quantity, 4)} {tx('股', 'shares')}</strong><small>{new Date(point.filledAt).toLocaleString(localeCode())}</small></span><b>{formatPrice(point.price)}</b></div>)}</div>
  </section>
}

const marketRanges: MarketRange[] = ['1d', '1w', '1m', '3m', '1y', '5y']
const rangeLabel = (range: MarketRange) => ({
  '1d': tx('1天', '1 day'),
  '1w': tx('1周', '1 week'),
  '1m': tx('1个月', '1 month'),
  '3m': tx('3个月', '3 months'),
  '1y': tx('1年', '1 year'),
  '5y': tx('5年', '5 years'),
})[range]

const rangeChangeLabel = (range: MarketRange) => range === '1d' ? tx('今日', 'Today') : rangeLabel(range)

const intervalLabel = (series: MarketSeries) => series.interval === '1d'
  ? tx('每日收盘价', 'Daily close')
  : tx(`${series.interval === '1m' ? '1分钟' : '5分钟'}价格 · 含盘前盘后`, `${series.interval === '1m' ? '1-minute' : '5-minute'} prices · Extended hours`)

/* RangeSwitcher - 行内分段控件（DESIGN.md §4.8）。
   滑块经 translateX + 匹配宽度滑入（spring 缓动），绝不 absolute 覆盖图表画布。
   labels 复用现有 rangeLabel（返回 tx() 双语字符串）。 */
function RangeSwitcher({ value, onChange, labels }: { value: MarketRange; onChange: (r: MarketRange) => void; labels: (r: MarketRange) => string }) {
  const ref = useRef<HTMLDivElement>(null)
  const [thumb, setThumb] = useState<{ x: number; w: number }>({ x: 0, w: 0 })
  useLayoutEffect(() => {
    const root = ref.current
    if (!root) return
    const active = root.querySelector<HTMLButtonElement>('button.active')
    if (active) setThumb({ x: active.offsetLeft, w: active.offsetWidth })
  }, [value])
  const move = (dir: 1 | -1) => {
    const idx = marketRanges.indexOf(value)
    const next = (idx + dir + marketRanges.length) % marketRanges.length
    onChange(marketRanges[next])
    requestAnimationFrame(() => ref.current?.querySelectorAll('button')[next]?.focus())
  }
  const onKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.key === 'ArrowRight' || e.key === 'ArrowDown') { e.preventDefault(); move(1) }
    else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') { e.preventDefault(); move(-1) }
  }
  return (
    <div className="range-switcher" role="radiogroup" aria-label={tx('价格时间范围', 'Price range')} ref={ref} onKeyDown={onKeyDown}>
      <span className="range-thumb" style={{ transform: `translateX(${thumb.x}px)`, width: thumb.w }} aria-hidden="true" />
      {marketRanges.map(r => (
        <button
          type="button"
          key={r}
          role="radio"
          aria-checked={value === r}
          tabIndex={value === r ? 0 : -1}
          className={value === r ? 'active' : ''}
          onClick={() => onChange(r)}
        >
          {labels(r)}
        </button>
      ))}
    </div>
  )
}

/* PriceHistoryChart — 由 TradingView Lightweight Charts（v5）渲染，取代旧 ECharts 实现。
   对外契约不变：props、.price-chart 容器、aria 标签、买卖成交点清单与双语图例。
   时间轴：日线用交易日字符串（避免跨时区偏一天）；日内把 UTC 秒整体平移本地时差，
   让坐标轴刻度等于交易所本地时间，tooltip 再平移回来显示真实成交时间。 */
interface ChartHover {
  key: string
  x: number
  y: number
  flipX: boolean
  flipY: boolean
  label: string
  close?: number
  trades: TradePoint[]
}

/* One legend, two placements. DESIGN.md's chart contract requires the series,
   the marker meanings and the fill count to stay readable next to the chart,
   so the compact cockpit chart gets the legend too - it is the only thing on
   that chart a reader cannot infer from the axis.
   The swatches are drawn by CSS (`.chart-legend span::before`) off --accent /
   --pos / --neg, so the legend and the series can never drift apart. Each span
   used to carry an inline <i> as well, which painted every swatch twice. */
function ChartLegend() {
  return <div className="chart-legend" aria-hidden="true">
    <span>{tx('收盘价', 'Close')}</span>
    <span>{tx('买入', 'Buy')}</span>
    <span>{tx('卖出', 'Sell')}</span>
  </div>
}

function PriceHistoryChart({ series, orders, name, compact = false }: { series: MarketSeries; orders: HistoricalOrder[]; name: string; compact?: boolean }) {
  const chartRef = useRef<HTMLDivElement>(null)
  const chartApiRef = useRef<IChartApi | null>(null)
  const theme = useSyncExternalStore(themeStore.subscribe, themeStore.getSnapshot)
  const isDark = theme.active === 'dark'
  const [hover, setHover] = useState<ChartHover | null>(null)
  const candles = useMemo(() => [...series.candles].sort((a, b) => Date.parse(a.time) - Date.parse(b.time)), [series])
  const start = Date.parse(candles[0]!.time)
  const end = Date.parse(candles[candles.length - 1]!.time)
  const trades = useMemo(() => orders.flatMap((item, index): TradePoint[] => {
    const filledAt = item.fill?.filledAt
    const price = item.fill?.price
    const time = filledAt === undefined ? Number.NaN : Date.parse(filledAt)
    if (filledAt === undefined || price === undefined || !Number.isFinite(time) || time < start || time > end) return []
    return [{ key: `${item.order.id}:${item.fill?.id ?? index}`, ticker: item.order.ticker, name, side: item.order.side, time, filledAt, price, quantity: item.fill?.quantity ?? item.order.filledQuantity ?? item.order.quantity ?? 0, currency: series.currency }]
  }), [name, orders, series.currency, start, end])
  const first = candles[0]!.close; const last = candles[candles.length - 1]!.close
  const change = first === 0 ? undefined : (last - first) / first * 100

  /* Chart colours are read from the design tokens, never from a parallel
     palette. The literals that used to sit here were TradingView's defaults -
     a #1677ff line with #18a957 / #d88a15 markers - which put a second blue and
     a second green on a product whose first rule is one accent for the whole
     surface, and left the legend swatch disagreeing with the line it labelled.
     Memoised on `isDark` because the crosshair re-renders on every mouse move. */
  const palette = useMemo(() => {
    const token = (name: string, fallback: string) => {
      if (typeof window === 'undefined') return fallback
      return getComputedStyle(document.documentElement).getPropertyValue(name).trim() || fallback
    }
    const withAlpha = (color: string, alpha: number) => {
      const hex = color.trim().replace('#', '')
      const full = hex.length === 3 ? hex.split('').map(part => part + part).join('') : hex
      const value = Number.parseInt(full, 16)
      return full.length === 6 && !Number.isNaN(value)
        ? `rgba(${(value >> 16) & 255}, ${(value >> 8) & 255}, ${value & 255}, ${alpha})`
        : color
    }
    const accent = token('--accent', isDark ? '#60A5FA' : '#2563EB')
    return {
      accent,
      buyColor: token('--pos', isDark ? '#10B981' : '#059669'),
      sellColor: token('--neg', isDark ? '#FB7185' : '#E11D48'),
      surface: token('--surface', isDark ? '#111620' : '#FFFFFF'),
      areaTop: withAlpha(accent, 0.22),
      areaBottom: withAlpha(accent, 0),
      priceLabelBackground: token('--chart-price-label-bg', '#2563EB'),
      axisColor: token('--ink-3', isDark ? '#8290A4' : '#64748B'),
      gridColor: withAlpha(token('--hair', isDark ? '#232C3B' : '#E2E8F0'), 0.55),
      crosshairColor: withAlpha(accent, 0.6),
      fontFamily: token('--font-mono', 'ui-monospace, "SF Mono", Menlo, monospace'),
    }
  }, [isDark])
  const { accent, buyColor, sellColor, surface, areaTop, areaBottom, priceLabelBackground, axisColor, gridColor, crosshairColor, fontFamily: chartFont } = palette

  /* 价格点与成交点统一转成图表时间基；日内另建时间桶索引，供 tooltip 命中同一根 K 线的成交。 */
  const model = useMemo(() => {
    const intraday = series.interval !== '1d'
    const bucketSeconds = series.interval === '1m' ? 60 : 300
    const shift = intraday ? -new Date(start).getTimezoneOffset() * 60 : 0
    const day = (ms: number) => new Date(ms).toISOString().slice(0, 10)
    const toChartTime = (ms: number): Time => intraday ? Math.floor(ms / 1000) + shift as UTCTimestamp : day(ms)
    const toRealMs = (time: Time): number => typeof time === 'number' ? (time - shift) * 1000 : Date.parse(String(time))
    const buckets = new Map<string | number, TradePoint[]>()
    for (const trade of trades) {
      const key = intraday ? Math.floor(Math.floor(trade.time / 1000) / bucketSeconds) : day(trade.time)
      const bucket = buckets.get(key)
      if (bucket === undefined) buckets.set(key, [trade]); else bucket.push(trade)
    }
    return {
      intraday, toRealMs, buckets,
      /* 十字光标吸附到 K 线后，用它的 time 反查同一时间桶的成交。 */
      hoverBucket: (time: Time) => intraday ? Math.floor(((time as number) - shift) / bucketSeconds) : String(time),
      points: candles.map(item => ({ time: toChartTime(Date.parse(item.time)), value: item.close })),
      markers: trades.map(trade => {
        // Place the fill in its actual candle bucket, including intraday intervals.
        const candle = candles.findLast(item => Date.parse(item.time) <= trade.time) ?? candles[0]!
        return { time: toChartTime(Date.parse(candle.time)), price: trade.price, color: trade.side === 'BUY' ? buyColor : sellColor }
      }),
    }
  }, [buyColor, candles, sellColor, series.interval, start, trades])

  useEffect(() => {
    const element = chartRef.current
    if (element === null) return
    /* jsdom（单测）没有 canvas：与旧 ECharts 版一致地短路，只留下静态容器与 aria 标签。 */
    if (/jsdom/i.test(navigator.userAgent)) return
    setHover(null)
    const chart = createChart(element, {
      autoSize: true,
      layout: {
        background: { color: 'transparent' },
        textColor: axisColor,
        fontFamily: chartFont,
        fontSize: 10.5,
        /* 保留 TradingView 归属标记：Lightweight Charts 的许可要求。 */
        attributionLogo: true,
      },
      grid: { vertLines: { visible: false }, horzLines: { color: gridColor, style: LineStyle.Dashed } },
      crosshair: {
        mode: CrosshairMode.Magnet,
        vertLine: { color: crosshairColor, width: 1, style: LineStyle.Dashed, labelBackgroundColor: isDark ? '#171E2B' : '#0F172A' },
        horzLine: { color: crosshairColor, width: 1, style: LineStyle.Dashed, labelBackgroundColor: isDark ? '#171E2B' : '#0F172A' },
      },
      rightPriceScale: { borderVisible: false, ticksVisible: false, entireTextOnly: true, scaleMargins: { top: 0.12, bottom: 0.14 } },
      timeScale: { borderVisible: false, ticksVisible: false, timeVisible: model.intraday, secondsVisible: false, rightOffset: 1, minBarSpacing: 0.4, lockVisibleTimeRangeOnResize: true, fixLeftEdge: true, fixRightEdge: true },
      localization: {
        locale: localeCode(),
        priceFormatter: (value: number) => money(value, series.currency),
        timeFormatter: (time: Time) => new Date(model.toRealMs(time)).toLocaleString(localeCode(), { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }),
      },
      handleScroll: { mouseWheel: true, pressedMouseMove: true, horzTouchDrag: true, vertTouchDrag: false },
      handleScale: { axisPressedMouseMove: false, mouseWheel: true, pinch: true },
    })
    const priceLine = chart.addSeries(AreaSeries, {
      lineColor: accent,
      topColor: areaTop,
      bottomColor: areaBottom,
      lineWidth: 2,
      /* 最新价：虚线 + 轴端价格牌，对应旧 ECharts 的 markLine 展示。 */
      priceLineVisible: false,
      lastValueVisible: false,
      crosshairMarkerVisible: true,
      crosshairMarkerRadius: 4,
      priceFormat: { type: 'price', precision: 2, minMove: 0.01 },
    })
    priceLine.setData(model.points)
    priceLine.createPriceLine({
      price: last, color: accent, lineWidth: 1, lineStyle: LineStyle.Dashed,
      axisLabelVisible: true, axisLabelColor: priceLabelBackground, axisLabelTextColor: '#FFFFFF',
    })
    const tradeDots = createTradeDots(model.markers, surface)
    priceLine.attachPrimitive(tradeDots)
    chart.timeScale().fitContent()
    chartApiRef.current = chart

    const onCrosshair = (param: MouseEventParams<Time>) => {
      const time = param.time
      const point = param.point
      if (time === undefined || point === undefined) { setHover(null); return }
      const data = param.seriesData.get(priceLine) as LineData<Time> | undefined
      const close = data?.value
      const bucket = model.hoverBucket(time)
      const x = chart.timeScale().timeToCoordinate(time) ?? point.x
      setHover(previous => previous !== null && previous.key === String(bucket) && previous.x === x && previous.close === close ? previous : {
        key: String(bucket), x, y: point.y, close,
        flipX: x > element.clientWidth * 0.62,
        flipY: point.y > element.clientHeight * 0.66,
        label: new Date(model.toRealMs(time)).toLocaleString(localeCode()),
        trades: model.buckets.get(bucket) ?? [],
      })
    }
    chart.subscribeCrosshairMove(onCrosshair)
    return () => { chartApiRef.current = null; chart.unsubscribeCrosshairMove(onCrosshair); priceLine.detachPrimitive(tradeDots); chart.remove() }
  }, [accent, areaTop, areaBottom, surface, axisColor, buyColor, chartFont, crosshairColor, gridColor, isDark, last, model, priceLabelBackground, series.currency, sellColor])

  return <section className="price-chart-panel" aria-labelledby="price-chart-title">
    {!compact && <div className="section-heading"><div><h2 id="price-chart-title">{tx('历史价格与买卖点', 'Price history and trade markers')}</h2><p>{series.symbol} · {intervalLabel(series)} · {new Date(start).toLocaleDateString(localeCode())} - {new Date(end).toLocaleDateString(localeCode())} · {tx('纵轴聚焦价格区间', 'Scaled price axis')}</p></div><strong className={(change ?? 0) >= 0 ? 'tone-positive' : 'tone-negative'}>{money(last, series.currency)} <small>{percent(change)}</small></strong></div>}
    {!compact && <div className="chart-meta"><p className="chart-count">{tx(`区间内 ${trades.length} 个 Trading 212 成交点 · 滚轮或双指缩放，拖动平移`, `${trades.length} Trading 212 trades in range · Scroll or pinch to zoom, drag to pan`)}</p><button type="button" className="chart-reset" onClick={() => chartApiRef.current?.timeScale().fitContent()}>{tx('重置缩放', 'Reset zoom')}</button></div>}
    {compact && <div className="chart-compact-meta">
      <ChartLegend />
      <p className="chart-count">{tx(`${intervalLabel(series)} · 区间内 ${trades.length} 个成交点`, `${intervalLabel(series)} · ${trades.length} trades in range`)}</p>
    </div>}
    {!compact && <ChartLegend />}
    <div className="price-chart-wrap">
      <div ref={chartRef} className="price-chart" role="img" aria-label={compact ? tx(`${name} ${rangeLabel(series.range)}历史价格曲线`, `${name} price chart`) : tx(`${name} ${rangeLabel(series.range)}历史价格曲线，包含 ${trades.length} 个买卖成交点`, `${name} ${rangeLabel(series.range)} price chart with ${trades.length} trade markers`)} />
      {hover !== null && <div className="chart-tooltip" style={{ left: hover.x, top: hover.y, transform: `${hover.flipX ? 'translateX(calc(-100% - 13px))' : 'translateX(13px)'} ${hover.flipY ? 'translateY(calc(-100% - 13px))' : 'translateY(13px)'}` }}>
        <span className="chart-tooltip-time">{hover.label}</span>
        {hover.close !== undefined && <span className="chart-tooltip-row"><i className="legend-line" style={{ background: accent }} />{tx('收盘价', 'Close')}<b>{money(hover.close, series.currency)}</b></span>}
        {hover.trades.map(trade => <span key={trade.key} className="chart-tooltip-row"><i className={trade.side === 'BUY' ? 'legend-marker' : 'legend-marker sell'} style={{ background: trade.side === 'BUY' ? buyColor : sellColor }} />{trade.side === 'BUY' ? tx('买入', 'Buy') : tx('卖出', 'Sell')} {decimal(trade.quantity, 4)}{tx(' 股', ' shares')}<b>{money(trade.price, series.currency)}</b><small className="chart-tooltip-time">{new Date(trade.filledAt).toLocaleTimeString(localeCode())}</small></span>)}
      </div>}
    </div>
    <div className="sr-only" aria-label="成交点明细">{trades.map(trade => <span key={trade.key}>{trade.side === 'BUY' ? '买入' : '卖出'}，{new Date(trade.filledAt).toLocaleString('zh-CN')}，成交价 {money(trade.price, series.currency)}，{decimal(trade.quantity, 4)} 股</span>)}</div>
  </section>
}
function Metric({ label, value, note, tone }: { label: string; value: string; note?: string; tone?: 'positive' | 'negative' }) {
  return <div className="metric-card"><span>{label}</span><strong className={tone === 'positive' ? 'tone-positive' : tone === 'negative' ? 'tone-negative' : ''}>{value}</strong>{note && <small>{note}</small>}</div>
}

function CockpitInstrumentView({ position, accountCurrency, portfolioTotal, hideBalances = false }: { position: Position; accountCurrency: string; portfolioTotal?: number; hideBalances?: boolean }) {
  const ticker = position.instrument?.ticker ?? ''
  const name = position.instrument?.name ?? tickerLabel(ticker)
  const currency = position.instrument?.currency ?? accountCurrency
  const [range, setRange] = useState<MarketRange>('1w')
  const [series, setSeries] = useState<MarketSeries>()
  const [marketLoading, setMarketLoading] = useState(true)
  const [orders, setOrders] = useState<HistoricalOrder[]>([])
  const marketSerial = useRef(0)

  useEffect(() => {
    const serial = ++marketSerial.current
    setMarketLoading(true)
    api.market(ticker, range)
      .then(value => { if (serial === marketSerial.current) setSeries(value) })
      .catch(() => { if (serial === marketSerial.current) setSeries(undefined) })
      .finally(() => { if (serial === marketSerial.current) setMarketLoading(false) })
  }, [range, ticker])

  useEffect(() => {
    api.history('orders', undefined, ticker)
      .then(res => setOrders(res.items as HistoricalOrder[]))
      .catch(() => setOrders([]))
  }, [ticker])

  const profit = position.walletImpact?.unrealizedProfitLoss ?? 0
  const cost = position.walletImpact?.totalCost ?? 0
  const returnPct = cost ? profit / cost * 100 : undefined

  const currentMarketPrice = series?.regularMarketPrice ?? position.currentPrice
  const prevClose = series?.previousClose ?? (series && series.candles.length > 1 ? (series.candles[0].open ?? series.candles[0].close) : undefined)
  const rangeChangePct = currentMarketPrice !== undefined && prevClose !== undefined && prevClose > 0
    ? ((currentMarketPrice - prevClose) / prevClose) * 100
    : (series?.range === '1d' || (!series && range === '1d') ? position.dailyChangePercent : undefined)
  const activeRange = series?.range ?? range

  return (
    <div className="cockpit-instrument-container">
      {/* 标的头部 */}
      <div className="cockpit-inst-head">
        <div className="inst-profile">
          <TickerRingLogo ticker={ticker} weightPercent={portfolioTotal ? ((position.walletImpact?.currentValue ?? 0) / portfolioTotal) * 100 : undefined} />
          <div>
            <div className="inst-tag-row">
              <span className="inst-ticker-tag">{tickerLabel(ticker)} · {position.instrument?.currency ?? 'USD'}</span>
            </div>
            <h2 className="inst-title">{name}</h2>
          </div>
        </div>
        <div className="inst-price-box">
          <strong className="inst-price-main">{money(position.currentPrice, currency)}</strong>
          <span className={`inst-price-sub ${profit >= 0 ? 'tone-positive' : 'tone-negative'}`}>
            {rangeChangePct !== undefined && (
              <strong className={rangeChangePct >= 0 ? 'tone-positive' : 'tone-negative'} style={{ marginRight: '6px' }}>
                {percent(rangeChangePct)} {rangeChangeLabel(activeRange)} ·
              </strong>
            )}
            {hideBalances ? '••••' : `${signedMoney(profit, accountCurrency)} (${percent(returnPct)} ${tx('累计', 'Total')})`}
          </span>
        </div>
        <div className="inst-actions">
          <span className="read-only-status"><ShieldCheck size={14} strokeWidth={1.5} />{tx('只读账户', 'Read-only account')}</span>
        </div>
      </div>

      {/* 时间范围切换器 */}
      <RangeSwitcher value={range} onChange={setRange} labels={rangeLabel} />

      {/* 价格曲线 */}
      <div className="cockpit-chart-wrap">
        {marketLoading ? (
          <div className="chart-loading-box">
            <LoaderCircle strokeWidth={1.5} className="spin" />
            <span>{tx('正在读取行情…', 'Loading chart…')}</span>
          </div>
        ) : series ? (
          <PriceHistoryChart series={series} orders={orders} name={name} compact />
        ) : (
          <div className="empty-inline">{tx('暂无走势行情', 'No price data')}</div>
        )}
      </div>

      {/* Your investment 5 行清单 */}
      <section className="your-investment-cockpit" aria-label="Your investment">
        <h3 className="cockpit-section-title">{tx('持仓明细', 'Your investment')}</h3>
        <div className="inv-metrics-list">
          <div className="inv-metric-row">
            <span>{tx('当前市值', 'VALUE')}</span>
            <strong className="js-balance">{hideBalances ? '••••••' : money(position.walletImpact?.currentValue, accountCurrency)}</strong>
          </div>
          <div className="inv-metric-row">
            <span>{tx('未实现收益', 'RETURN')}</span>
            <strong className={profit >= 0 ? 'tone-positive' : 'tone-negative'}>
              {hideBalances ? '••••' : `${signedMoney(profit, accountCurrency)} (${percent(returnPct)})`}
            </strong>
          </div>
          <div className="inv-metric-row">
            <span>{tx('持股数量', 'SHARES')}</span>
            <strong>{hideBalances ? '••••' : decimal(position.quantity, 4)}</strong>
          </div>
          <div className="inv-metric-row">
            <span>{tx('平均买入价', 'AVERAGE PRICE')}</span>
            <strong>{hideBalances ? '••••' : (position.averagePricePaid === undefined ? '-' : money(position.averagePricePaid, currency))}</strong>
          </div>
          <div className="inv-metric-row">
            <span>{tx('持仓成本', 'COST')}</span>
            <strong className="js-balance">{hideBalances ? '••••••' : money(cost, accountCurrency)}</strong>
          </div>
        </div>
      </section>

    </div>
  )
}

function InstrumentDetailPage({ position, accountCurrency, hideBalances = false, onBack }: { position: Position; accountCurrency: string; hideBalances?: boolean; onBack: () => void }) {
  const ticker = position.instrument?.ticker ?? ''
  const name = position.instrument?.name ?? tickerLabel(ticker)
  const currency = position.instrument?.currency ?? accountCurrency
  const [range, setRange] = useState<MarketRange>('1w')
  const [series, setSeries] = useState<MarketSeries>()
  const [marketLoading, setMarketLoading] = useState(true)
  const [marketError, setMarketError] = useState<ApiError>()
  const [orders, setOrders] = useState<HistoricalOrder[]>([])
  const [cursor, setCursor] = useState<string>()
  const [historyLoading, setHistoryLoading] = useState(true)
  const [historyError, setHistoryError] = useState<ApiError>()
  const marketSerial = useRef(0)

  const loadMarket = async (selected: MarketRange) => {
    const serial = ++marketSerial.current; setMarketLoading(true); setMarketError(undefined)
    try { const value = await api.market(ticker, selected); if (serial === marketSerial.current) setSeries(value) }
    catch (cause) { if (serial === marketSerial.current) { setSeries(undefined); setMarketError(cause instanceof ApiError ? cause : undefined) } }
    finally { if (serial === marketSerial.current) setMarketLoading(false) }
  }
  const loadHistory = async (next?: string, append = false) => {
    setHistoryLoading(true); setHistoryError(undefined)
    try { const value = await api.history('orders', next, ticker); setOrders(current => append ? [...current, ...(value.items as HistoricalOrder[])] : value.items as HistoricalOrder[]); setCursor(value.nextCursor) }
    catch (cause) { setHistoryError(cause instanceof ApiError ? cause : undefined) }
    finally { setHistoryLoading(false) }
  }
  useEffect(() => { void loadMarket(range) }, [range, ticker])
  useEffect(() => { setOrders([]); setCursor(undefined); void loadHistory() }, [ticker])
  const profit = position.walletImpact?.unrealizedProfitLoss ?? 0
  const cost = position.walletImpact?.totalCost ?? 0
  return <section className="content-page instrument-page">
    <button className="back-button" type="button" onClick={onBack}><ArrowLeft strokeWidth={1.5} />{tx('返回持仓', 'Back to holdings')}</button>
    <div className="instrument-heading">
      <div>
        <div className="instrument-meta-row">
          <TickerRingLogo ticker={ticker} />
          <span>{tickerLabel(ticker)} · {position.instrument?.isin ?? tx('ISIN 未提供', 'ISIN unavailable')}</span>
        </div>
        <h1>{name}</h1>
        <p>{hideBalances ? '••••' : decimal(position.quantity, 4)} {tx('股', 'shares')} · {tx('标的币种', 'Instrument currency')} {currency}</p>
      </div>
      <div className="instrument-price-action">
        <span>{tx('当前价格', 'Current price')}</span>
        <strong>{money(position.currentPrice, currency)}</strong>
        <small className={profit >= 0 ? 'tone-positive' : 'tone-negative'}>
          {hideBalances ? '••••' : `${signedMoney(profit, accountCurrency)} · ${percent(cost ? profit / cost * 100 : undefined)}`}
        </small>
        <div className="instrument-action-pills" title={tx('当前连接为只读模式', 'Read-only mode')}>
          <span className="pill-btn sell">{tx('卖出', 'Sell')}</span>
          <span className="pill-btn buy">{tx('买入', 'Buy')}</span>
        </div>
      </div>
    </div>
    <RangeSwitcher value={range} onChange={setRange} labels={rangeLabel} />
    {marketError && <ErrorPanel error={marketError} onRetry={() => void loadMarket(range)} compact />}
    {marketLoading ? <div className="chart-loading"><LoaderCircle strokeWidth={1.5} className="spin" />{tx('正在读取 Yahoo Finance 行情…', 'Loading Yahoo Finance prices…')}</div> : series && <PriceHistoryChart series={series} orders={orders} name={name} />}
    <p className="market-source">{tx('价格来源：Yahoo Finance（非官方接口，可能延迟或暂时不可用）；买卖点来源：Trading 212 真实成交记录。Yahoo 只接收公开的 ISIN/股票名称，不会收到你的 API 密钥、持仓数量或账户金额。', 'Prices: Yahoo Finance (unofficial endpoint; may be delayed or unavailable). Trade markers: actual Trading 212 fills. Yahoo receives only the public ISIN/name, never your API key, quantities, or account values.')}</p>
    <section className="your-investment-section">
      <div className="section-heading">
        <h2>{tx('持仓明细', 'Your investment')}</h2>
      </div>
      <div className="investment-grid">
        <div className="invest-row"><span>{tx('当前市值', 'VALUE')}</span><strong className="js-balance">{hideBalances ? '••••••' : money(position.walletImpact?.currentValue, accountCurrency)}</strong></div>
        <div className="invest-row"><span>{tx('未实现收益', 'RETURN')}</span><strong className={profit >= 0 ? 'tone-positive' : 'tone-negative'}>{hideBalances ? '••••' : signedMoney(profit, accountCurrency)} <small>({hideBalances ? '••••' : percent(cost ? profit / cost * 100 : undefined)})</small></strong></div>
        <div className="invest-row"><span>{tx('持股数量', 'SHARES')}</span><strong>{hideBalances ? '••••' : decimal(position.quantity, 4)} <small>({tx('可交易', 'Tradable')} {hideBalances ? '••••' : decimal(position.quantityAvailableForTrading, 4)})</small></strong></div>
        <div className="invest-row"><span>{tx('平均买入价', 'AVERAGE PRICE')}</span><strong>{hideBalances ? '••••' : (position.averagePricePaid === undefined ? '-' : money(position.averagePricePaid, currency))}</strong></div>
        <div className="invest-row"><span>{tx('持仓成本', 'COST')}</span><strong className="js-balance">{hideBalances ? '••••••' : money(cost, accountCurrency)}</strong></div>
      </div>
    </section>
    <section className="instrument-history"><div className="section-heading"><div><h2>{tx('这只股票的买卖历史', 'Trade history for this instrument')}</h2><p>{tx(`Trading 212 返回的真实成交记录 · 已加载 ${orders.length} 笔`, `Actual Trading 212 fills · ${orders.length} loaded`)}</p></div></div>{historyError && <ErrorPanel error={historyError} onRetry={() => void loadHistory()} compact />}{historyLoading && orders.length === 0 ? <div className="history-loading"><LoaderCircle strokeWidth={1.5} className="spin" />{tx('正在读取买卖历史…', 'Loading trade history…')}</div> : <HistoryRows kind="orders" items={orders} />}{cursor && <button className="load-more" type="button" disabled={historyLoading} onClick={() => void loadHistory(cursor, true)}>{historyLoading ? tx('正在加载…', 'Loading…') : tx('加载更多', 'Load more')}</button>}</section>
  </section>
}

function HistorySummary({ kind, items }: { kind: HistoryKind; items: HistoryItem[] }) {
  if (items.length === 0) return null
  if (kind === 'orders') {
    const rows = items as HistoricalOrder[]
    const currency = rows.find(item => item.fill?.walletImpact?.currency)?.fill?.walletImpact?.currency ?? 'EUR'
    const buys = rows.filter(item => item.order.side === 'BUY').reduce((sum, item) => sum + Math.abs(item.fill?.walletImpact?.netValue ?? 0), 0)
    const sells = rows.filter(item => item.order.side === 'SELL').reduce((sum, item) => sum + Math.abs(item.fill?.walletImpact?.netValue ?? 0), 0)
    const realized = rows.reduce((sum, item) => sum + (item.fill?.walletImpact?.realisedProfitLoss ?? 0), 0)
    const fees = rows.reduce((sum, item) => sum + (item.fill?.walletImpact?.taxes?.reduce((taxSum, tax) => taxSum + (tax.quantity ?? 0), 0) ?? 0), 0)
    const byAsset = new Map<string, { label: string; value: number; count: number }>()
    for (const item of rows) {
      const key = item.order.ticker
      const current = byAsset.get(key) ?? { label: item.order.instrument?.name ?? tickerLabel(key), value: 0, count: 0 }
      byAsset.set(key, { ...current, value: current.value + Math.abs(item.fill?.walletImpact?.netValue ?? 0), count: current.count + 1 })
    }
    const chartRows = [...byAsset].map(([key, item]) => ({ key, label: item.label, detail: tx(`${item.count} 笔`, `${item.count} fills`), value: item.value })).sort((a, b) => b.value - a.value).slice(0, 6)
    return <><section className="history-metrics"><Metric label={tx('已加载记录', 'Loaded records')} value={tx(`${rows.length} 笔`, `${rows.length}`)} note={tx('当前分页样本', 'Current loaded sample')} /><Metric label={tx('买入成交额', 'Buy value')} value={money(buys, currency)} /><Metric label={tx('卖出成交额', 'Sell value')} value={money(sells, currency)} /><Metric label={tx('已实现盈亏', 'Realized P/L')} value={signedMoney(realized, currency)} tone={realized >= 0 ? 'positive' : 'negative'} note={fees ? `${tx('税费', 'Fees')} ${money(fees, currency)}` : undefined} /></section><TradeTimeline orders={rows} />{chartRows.length >= 4 && <section className="history-chart"><div className="section-heading"><div><h2>{tx('交易活跃资产', 'Most-traded assets')}</h2><p>{tx('当前已加载记录 · 按成交净额绝对值排名', 'Loaded records · Ranked by absolute net fill value')}</p></div></div><BarList rows={chartRows} currency={currency} ariaLabel={tx('当前已加载历史订单的交易活跃资产', 'Most-traded assets in loaded order history')} /></section>}</>
  }
  if (kind === 'transactions') {
    const rows = items as CashTransaction[]
    const currency = rows[0]?.currency ?? 'EUR'
    const inflow = rows.filter(item => item.amount > 0).reduce((sum, item) => sum + item.amount, 0)
    const outflow = rows.filter(item => item.amount < 0).reduce((sum, item) => sum + Math.abs(item.amount), 0)
    const net = rows.reduce((sum, item) => sum + item.amount, 0)
    const interest = rows.filter(item => item.type.includes('INTEREST')).reduce((sum, item) => sum + item.amount, 0)
    const byType = new Map<string, number>()
    for (const item of rows) byType.set(item.type, (byType.get(item.type) ?? 0) + item.amount)
    const chartRows = [...byType].map(([key, value]) => ({ key, label: transactionLabel(key), value })).sort((a, b) => Math.abs(b.value) - Math.abs(a.value))
    return <><section className="history-metrics"><Metric label={tx('已加载记录', 'Loaded records')} value={tx(`${rows.length} 笔`, `${rows.length}`)} note={tx('当前分页样本', 'Current loaded sample')} /><Metric label={tx('流入', 'Inflow')} value={money(inflow, currency)} /><Metric label={tx('流出', 'Outflow')} value={money(outflow, currency)} /><Metric label={tx('净现金流', 'Net cash flow')} value={signedMoney(net, currency)} tone={net >= 0 ? 'positive' : 'negative'} note={interest ? `${tx('其中利息', 'Interest')} ${signedMoney(interest, currency)}` : undefined} /></section>{chartRows.length >= 4 && <section className="history-chart"><div className="section-heading"><div><h2>{tx('资金流水构成', 'Cash activity breakdown')}</h2><p>{tx('当前已加载记录 · 按类型汇总', 'Loaded records · Grouped by type')}</p></div></div><BarList rows={chartRows} currency={currency} signed ariaLabel={tx('当前已加载资金流水按类型汇总', 'Loaded cash activity grouped by type')} /></section>}</>
  }
  const rows = items as Dividend[]
  const currency = rows[0]?.currency ?? 'EUR'
  const tickers = new Set(rows.map(item => item.ticker)).size
  const byAsset = new Map<string, { label: string; value: number; count: number }>()
  for (const item of rows) {
    const current = byAsset.get(item.ticker) ?? { label: item.instrument?.name ?? tickerLabel(item.ticker), value: 0, count: 0 }
    byAsset.set(item.ticker, { ...current, value: current.value + item.amount, count: current.count + 1 })
  }
  const chartRows = [...byAsset].map(([key, item]) => ({ key, label: item.label, detail: tx(`${item.count} 笔`, `${item.count} payments`), value: item.value })).sort((a, b) => b.value - a.value).slice(0, 6)
  const dates = rows.map(item => new Date(item.paidOn).getTime()).filter(Number.isFinite)
  const range = dates.length ? `${new Date(Math.min(...dates)).toLocaleDateString(localeCode())} - ${new Date(Math.max(...dates)).toLocaleDateString(localeCode())}` : undefined
  return <><section className="history-metrics"><Metric label={tx('已加载记录', 'Loaded records')} value={tx(`${rows.length} 笔`, `${rows.length}`)} note={tx('当前分页样本', 'Current loaded sample')} /><Metric label={tx('派息资产', 'Paying assets')} value={tx(`${tickers} 个`, `${tickers}`)} /><Metric label={tx('覆盖区间', 'Date range')} value={range ?? '-'} /></section>{chartRows.length >= 4 && <section className="history-chart"><div className="section-heading"><div><h2>{tx('分红来源', 'Dividend sources')}</h2><p>{tx('当前已加载记录 · 按到账金额排名', 'Loaded records · Ranked by amount received')}</p></div></div><BarList rows={chartRows} currency={currency} ariaLabel={tx('当前已加载分红记录按资产汇总', 'Loaded dividends grouped by asset')} /></section>}</>
}

function HistoryPage() {
  const [kind, setKind] = useState<HistoryKind>('orders')
  const [loadedKind, setLoadedKind] = useState<HistoryKind>()
  const [items, setItems] = useState<HistoryItem[]>([])
  const [cursor, setCursor] = useState<string>()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<ApiError>()
  const requestSerial = useRef(0)

  const load = async (selected: HistoryKind, next?: string, append = false) => {
    const serial = ++requestSerial.current
    setLoading(true); setError(undefined)
    try {
      const result = await api.history(selected, next)
      if (serial !== requestSerial.current) return
      setItems(current => append ? [...current, ...result.items] : result.items)
      setLoadedKind(selected)
      setCursor(result.nextCursor)
    } catch (cause) {
      if (serial !== requestSerial.current) return
      setError(cause instanceof ApiError ? cause : new ApiError('INTERNAL_ERROR', '无法读取历史记录', '发生未知错误', '重试', '/trading212/#help-internal-error', 'history'))
    } finally { if (serial === requestSerial.current) setLoading(false) }
  }

  useEffect(() => { setItems([]); setCursor(undefined); setLoadedKind(undefined); void load(kind) }, [kind])
  return <section className="content-page history-page"><h1>{tx('交易历史', 'Transaction history')}</h1><p>{tx('来自 Trading 212 的只读历史数据。汇总仅覆盖下方已经加载的记录，不代表账户全历史。', 'Read-only history from Trading 212. Summaries cover only the loaded records below, not your full account history.')}</p>
    <div className="history-tabs" role="tablist" aria-label={tx('历史记录类型', 'History type')}>{(['orders', 'transactions', 'dividends'] as const).map(value => <button type="button" role="tab" aria-selected={kind === value} className={kind === value ? 'active' : ''} key={value} onClick={() => setKind(value)}>{historyLabel(value)}</button>)}</div>
    {error && <ErrorPanel error={error} onRetry={() => void load(kind)} compact />}
    {loading && loadedKind !== kind ? <div className="history-loading"><LoaderCircle strokeWidth={1.5} className="spin" />{tx('正在读取', 'Loading ')}{historyLabel(kind)}…</div> : loadedKind === kind && <><HistorySummary kind={kind} items={items} /><HistoryRows kind={kind} items={items} /></>}
    {cursor && <button className="load-more" type="button" disabled={loading} onClick={() => void load(kind, cursor, true)}>{loading ? tx('正在加载…', 'Loading…') : tx('加载更多', 'Load more')}</button>}
  </section>
}

function OverviewPage({
  portfolio,
  hideBalances,
  searchQuery,
  selectedTicker: externalSelectedTicker,
  onHoldings,
  onInstrument,
  onNavigate,
  onSelectTicker,
}: {
  portfolio: PortfolioSnapshot
  hideBalances: boolean
  searchQuery: string
  selectedTicker?: string
  onHoldings: () => void
  onInstrument: (position: Position) => void
  onNavigate: (page: Page) => void
  onSelectTicker?: (ticker: string) => void
}) {
  const currency = portfolio.account.currency
  const analytics = portfolio.analytics
  const [internalSelectedTicker, setInternalSelectedTicker] = useState<string>(() => portfolio.positions[0]?.instrument?.ticker ?? '')
  const selectedTicker = externalSelectedTicker ?? internalSelectedTicker
  const setSelectedTicker = (ticker: string) => {
    setInternalSelectedTicker(ticker)
    onSelectTicker?.(ticker)
  }
  const [treemapMode, setTreemapMode] = useState<TreemapMetricMode>('daily')
  const [dailyQuotes, setDailyQuotes] = useState<Record<string, {
    currentPrice?: number
    previousClose?: number
    dailyChangePercent?: number
    dailyProfitLoss?: number
  }>>({})
  const [dailyQuotesLoading, setDailyQuotesLoading] = useState(false)

  useEffect(() => {
    let active = true
    setDailyQuotesLoading(true)
    const tickers = portfolio.positions.map(p => p.instrument?.ticker).filter(Boolean) as string[]
    api.quotes(tickers)
      .then(res => {
        if (active) setDailyQuotes(res)
      })
      .catch(() => {
        if (active) setDailyQuotes({})
      })
      .finally(() => {
        if (active) setDailyQuotesLoading(false)
      })
    return () => { active = false }
  }, [portfolio.fetchedAt, portfolio.positions])

  const enrichedAllocation = useMemo(() => {
    return portfolio.analytics.allocation.map(item => {
      const quote = dailyQuotes[item.ticker]
      if (!quote) return item
      const dailyChangePercent = quote.dailyChangePercent ?? item.dailyChangePercent
      const dailyProfitLoss = quote.dailyProfitLoss ?? (dailyChangePercent !== undefined ? item.currentValue * (dailyChangePercent / 100) : undefined)
      return {
        ...item,
        dailyChangePercent,
        dailyProfitLoss,
      }
    })
  }, [portfolio.analytics.allocation, dailyQuotes])

  const { todayProfitLoss, todayReturnPercent } = useMemo(() => {
    const quotedPositions = portfolio.positions.filter(p => p.instrument?.ticker && dailyQuotes[p.instrument.ticker]?.dailyProfitLoss !== undefined)
    if (quotedPositions.length === 0) return { todayProfitLoss: undefined, todayReturnPercent: undefined }
    const totalDailyPl = quotedPositions.reduce((sum, p) => sum + (dailyQuotes[p.instrument!.ticker!]?.dailyProfitLoss ?? 0), 0)
    const totalCurrentVal = quotedPositions.reduce((sum, p) => sum + (p.walletImpact?.currentValue ?? 0), 0)
    const prevVal = totalCurrentVal - totalDailyPl
    const returnPct = prevVal > 0 ? (totalDailyPl / prevVal) * 100 : undefined
    return { todayProfitLoss: totalDailyPl, todayReturnPercent: returnPct }
  }, [portfolio.positions, dailyQuotes])

  const filteredPositions = useMemo(() => {
    if (!searchQuery.trim()) return portfolio.positions
    const q = searchQuery.toLowerCase()
    return portfolio.positions.filter(p =>
      p.instrument?.name?.toLowerCase().includes(q) ||
      p.instrument?.ticker?.toLowerCase().includes(q)
    )
  }, [portfolio.positions, searchQuery])

  const activePosition = portfolio.positions.find(p => p.instrument?.ticker === selectedTicker) ?? portfolio.positions[0]

  return (
    <div className="t212-cockpit-layout">
      {/* 左侧控制台面板 Left Column (Stream) */}
      <aside className="cockpit-left-pane">
        {/* 1. ACCOUNT VALUE 卡片 */}
        <div className="cockpit-account-card">
          <div className="account-card-header">
            <span className="account-label">{tx('账户总价值', 'ACCOUNT VALUE')} · {currency}</span>
            <button className="icon-btn-ghost" type="button" aria-label={tx('账户设置', 'Account settings')} title={tx('账户设置', 'Account settings')} onClick={() => onNavigate('settings')}>
              <Settings strokeWidth={1.5} size={14} />
            </button>
          </div>
          <strong className="account-hero-val">{hideBalances ? '••••••••' : money(analytics.totalValue, currency)}</strong>
          <div className="account-sub-metrics-grid">
            <div className="sub-metric-block">
              <span>{tx('今日盈亏', 'TODAY P/L')}</span>
              {todayProfitLoss !== undefined ? (
                <strong className={todayProfitLoss >= 0 ? 'tone-positive' : 'tone-negative'}>
                  {hideBalances ? '••••' : signedMoney(todayProfitLoss, currency)}
                  {todayReturnPercent !== undefined && <small className="sub-metric-pct"> ({percent(todayReturnPercent)})</small>}
                </strong>
              ) : (
                <strong className="tone-muted">{dailyQuotesLoading ? tx('同步中…', 'Syncing…') : '--'}</strong>
              )}
            </div>
            <div className="sub-metric-block">
              <span>{tx('累计未实现', 'TOTAL UNREALIZED')}</span>
              <strong className={analytics.unrealizedProfitLoss >= 0 ? 'tone-positive' : 'tone-negative'}>
                {hideBalances ? '••••' : signedMoney(analytics.unrealizedProfitLoss, currency)}
                <small className="sub-metric-pct"> ({percent(analytics.unrealizedReturnPercent)})</small>
              </strong>
            </div>
          </div>

        </div>

        <div className="cockpit-cash-summary">
          {/* 2. MAIN POT (可用现金) */}
          <div className="cockpit-main-pot-card">
            <div className="pot-info">
              <span className="pot-label">{tx('主账户资金', 'Main pot')}</span>
              <strong className="pot-val">{hideBalances ? '••••••' : money(analytics.availableCash, currency)}</strong>
              {analytics.cashInPies > 0 && <small className="pot-sub">{tx('Pie 内现金', 'In Pies')} {money(analytics.cashInPies, currency)}</small>}
            </div>
            <button className="t212-deposit-pill-btn" type="button" onClick={() => onNavigate('settings')}>
              {tx('账户', 'Account')}
            </button>
          </div>

          {/* 账户快照：直接展示 Trading 212 API 返回的关键资金指标 */}
          <div className="portfolio-stat-grid" aria-label={tx('账户快照', 'Portfolio snapshot')}>
            <Metric
              label={tx('投资市值', 'Invested value')}
              value={hideBalances ? '••••••' : money(analytics.positionMarketValue, currency)}
              note={analytics.investedWeightPercent === undefined ? undefined : plainPercent(analytics.investedWeightPercent)}
            />
            <Metric
              label={tx('持仓成本', 'Cost basis')}
              value={hideBalances ? '••••••' : money(analytics.totalCost, currency)}
            />
            <Metric
              label={tx('已实现盈亏', 'Realized P/L')}
              value={hideBalances ? '••••' : signedMoney(analytics.realizedProfitLoss, currency)}
              tone={analytics.realizedProfitLoss >= 0 ? 'positive' : 'negative'}
            />
            <Metric
              label={tx('汇兑影响', 'FX impact')}
              value={hideBalances ? '••••' : signedMoney(analytics.fxImpact, currency)}
              tone={analytics.fxImpact >= 0 ? 'positive' : 'negative'}
            />
          </div>
        </div>

        <div className="portfolio-context-strip" aria-label={tx('组合上下文', 'Portfolio context')}>
          <span><b>{analytics.positionCount}</b><small>{tx('个持仓', 'Holdings')}</small></span>
          <span><b>{analytics.piePositionCount}</b><small>{tx('个 Pie 持仓', 'Pie holdings')}</small></span>
          <span><b>{plainPercent(analytics.availableCashWeightPercent)}</b><small>{tx('现金占比', 'Cash allocation')}</small></span>
          <span><b>{plainPercent(analytics.top3WeightPercent)}</b><small>{tx('前三大集中度', 'Top 3 concentration')}</small></span>
          {analytics.reservedForOrders > 0 && <span className="context-reserved"><b>{hideBalances ? '••••' : money(analytics.reservedForOrders, currency)}</b><small>{tx('订单预留', 'Reserved for orders')}</small></span>}
        </div>

        {/* 待处理挂单 */}
        {portfolio.pendingOrders.length > 0 && (
          <section className="cockpit-pending-section">
            <div className="pane-section-header">
              <h3>{tx('待处理订单', 'Pending orders')}</h3>
              <span className="count-tag">{portfolio.pendingOrders.length}</span>
            </div>
            <div className="cockpit-orders-list">
              {portfolio.pendingOrders.map(order => (
                <div key={order.id} className="cockpit-order-row">
                  <TickerRingLogo ticker={order.ticker} />
                  <div className="order-row-info">
                    <div className="order-row-title"><span className={`order-side ${order.side === 'BUY' ? 'buy' : 'sell'}`}>{order.side === 'BUY' ? tx('买入', 'Buy') : tx('卖出', 'Sell')}</span><strong>{order.instrument?.name ?? tickerLabel(order.ticker)}</strong></div>
                    <small>{hideBalances ? '••••' : order.quantity === undefined ? '-' : decimal(order.quantity, 4)} {tx('股', 'shares')} · {order.type === 'LIMIT' ? tx('限价单', 'Limit') : order.type === 'STOP' ? tx('止损单', 'Stop') : order.type === 'STOP_LIMIT' ? tx('止损限价单', 'Stop limit') : order.type === 'MARKET' ? tx('市价单', 'Market') : order.type}{order.type === 'MARKET' || order.type === 'STOP' ? ` · ${tx('市价', 'Market')}` : ''}</small>
                  </div>
                  {(order.type === 'LIMIT' || order.type === 'STOP_LIMIT') && order.limitPrice !== undefined && <strong className="order-limit-price">{hideBalances ? '••••' : money(order.limitPrice, order.currency ?? order.instrument?.currency ?? currency)}</strong>}
                </div>
              ))}
            </div>
          </section>
        )}

        {/* 资产配置：按市值面积显示，颜色与数值优先表达今日变化 */}
        <section className="cockpit-treemap-section">
          <div className="pane-section-header">
            <div>
              <h3>{tx('资产配置', 'Asset allocation')}</h3>
              <p className="pane-section-sub">{tx('面积代表持仓市值，数值与颜色代表今日涨跌', 'Area reflects market value, value & tone reflect today’s movement')}</p>
            </div>
            <div className="treemap-mode-toggles" role="group" aria-label={tx('拼盘维度切换', 'Treemap view mode')}>
              <button
                type="button"
                className={`treemap-mode-pill ${treemapMode === 'daily' ? 'is-active' : ''}`}
                onClick={() => setTreemapMode('daily')}
              >
                {tx('今日变化', 'Today')}
              </button>
              <button
                type="button"
                className={`treemap-mode-pill ${treemapMode === 'total' ? 'is-active' : ''}`}
                onClick={() => setTreemapMode('total')}
              >
                {tx('累计收益', 'Total')}
              </button>
            </div>
          </div>
          <DynamicTreemapGrid
            allocation={enrichedAllocation}
            positions={portfolio.positions}
            hideBalances={hideBalances}
            activeTicker={activePosition?.instrument?.ticker}
            metricMode={treemapMode}
            currency={currency}
            onSelect={setSelectedTicker}
          />
          <button className="cockpit-see-all-btn" type="button" onClick={onHoldings}>
            <span>{tx('查看全部持仓', 'View all holdings')}</span>
            <span className="btn-action-chevron" aria-hidden="true">›</span>
          </button>
        </section>

        {/* 7. 底部操作胶囊与监管合规声明 */}
        <div className="cockpit-pane-footer">
          <div className="footer-action-pills-row">
            <button className="t212-pill-action" type="button" onClick={() => onNavigate('history')}>
              <HistoryIcon strokeWidth={1.5} size={13} /> {tx('历史', 'History')}
            </button>
          </div>
          <p className="t212-legal-disclaimer">
            {tx('投资服务由受 BaFin 监管的 Trading 212 EU GmbH 提供。', 'Investment services are provided by Trading 212 EU GmbH, authorised and regulated by BaFin.')}
          </p>
        </div>
      </aside>

      {/* 右侧深度 Cockpit 详情主屏 Right Main */}
      <main className="cockpit-main-pane">
        {activePosition ? (
          <CockpitInstrumentView position={activePosition} accountCurrency={currency} portfolioTotal={analytics.totalValue} hideBalances={hideBalances} />
        ) : (
          <div className="empty-inline">{tx('目前没有持仓', 'No holdings yet')}</div>
        )}

        {/* Portfolio-level analytics, between the instrument cockpit above and the
            holdings ledger below: the reader has just read one asset's numbers and
            now needs the portfolio's. Two read-only panels, one hairline divider,
            no card chrome - the plate below is the only boxed thing in the strip. */}
        <section className="cockpit-analytics-strip">
          <div className="cockpit-sub-analytics-grid">
            <section className="sub-panel">
              <div className="section-heading">
                <div>
                  <h2>{tx('未实现盈亏贡献', 'Unrealized return contributors')}</h2>
                  <p>{tx('按绝对影响排序 · 账户币种', 'Ranked by absolute impact · account currency')}</p>
                </div>
              </div>
              <ProfitDrivers portfolio={portfolio} />
            </section>
            <section className="sub-panel">
              <div className="section-heading">
                <div>
                  <h2>{tx('标的交易币种暴露', 'Exposure by instrument currency')}</h2>
                  <p>{tx('逐仓快照 · 标的币种分布', 'Per-position snapshot · by instrument currency')}</p>
                </div>
              </div>
              <CurrencyExposureChart portfolio={portfolio} />
            </section>
          </div>

          <section className="cockpit-holdings-preview">
            <div className="section-heading">
              <h2>{tx('主要持仓', 'Top holdings')}</h2>
              <p>{tx('点击资产查看真实价格曲线、买卖点和交易历史', 'Select an asset to view its price chart, trade markers, and history')}</p>
            </div>
            <HoldingTable positions={filteredPositions} currency={currency} limit={6} compact selectedTicker={activePosition?.instrument?.ticker} hideBalances={hideBalances} onSelect={onInstrument} />
          </section>
        </section>
      </main>
    </div>
  )
}

function HelpPage() {
  const entries = [
    ['invalid-credentials', tx('凭据被拒绝', 'Credentials rejected'), tx('确认 Demo/Live 环境与密钥创建环境一致。Secret 丢失后必须重新创建密钥。', 'Make sure Demo/Live matches where the key was created. A lost Secret requires a new key.')],
    ['missing-scope', tx('权限不足', 'Missing permissions'), tx('启用账户、投资组合和订单读取权限；不需要任何交易权限。', 'Enable read access for account, portfolio, and orders; no trading permission is needed.')],
    ['history-permission', tx('历史记录不可用', 'History unavailable'), tx('在 Trading 212 密钥中启用历史订单、分红和交易记录读取权限，然后在设置中重新连接。', 'Enable order, dividend, and transaction history on the Trading 212 key, then reconnect in Settings.')],
    ['rate-limited', tx('请求频率受限', 'Rate limited'), tx('等待错误中显示的时间后刷新。插件会保留同一连接的旧快照。', 'Wait until the time shown in the error, then refresh. The previous snapshot remains available.')],
    ['status-unavailable', tx('插件状态不可用', 'Plugin status unavailable'), tx('重启 dsh，确认插件安装在 web profile，然后重新打开。', 'Restart dsh, confirm the plugin is installed in the web profile, then reopen it.')],
    ['connection-read-only', tx('连接为只读来源', 'Read-only credential source'), tx('在提供凭据的环境变量或外部配置中修改，插件不会覆盖遮蔽值。', 'Change the environment or external source that provides the credentials; the plugin will not overwrite it.')],
    ['client-load-failed', tx('侧栏入口未加载', 'Sidebar entry did not load'), tx('重新安装准确版本的插件并完全重启 dsh。', 'Reinstall the exact plugin version and fully restart dsh.')],
  ]
  return <section className="content-page help-page"><h1>{tx('帮助', 'Help')}</h1><p>{tx('Trading 212 连接是只读的。模型会看到工具返回的投资组合快照，但诊断信息不会包含凭据、持仓或金额。', 'The Trading 212 connection is read-only. The model can use portfolio snapshots returned by tools, while diagnostics exclude credentials, holdings, and values.')}</p><div className="help-list">{entries.map(([id, title, body]) => <article id={`help-${id}`} key={id}><h2>{title}</h2><p>{body}</p></article>)}</div><h2>{tx('键盘快捷键', 'Keyboard shortcuts')}</h2><ul><li><kbd>1</kbd>-<kbd>5</kbd> {tx('切换页面', 'Switch page')}</li><li><kbd>J</kbd> / <kbd>K</kbd> {tx('上下漫游持仓', 'Roam holdings')}</li><li><kbd>/</kbd> {tx('聚焦搜索', 'Focus search')}</li><li><kbd>P</kbd> {tx('隐藏金额', 'Hide balances')}</li><li><kbd>T</kbd> {tx('切换主题', 'Switch theme')}</li><li><kbd>?</kbd> {tx('打开完整快捷键指南', 'Open the full shortcuts guide')}</li></ul><h2>{tx('在 dsh 中提问', 'Ask in dsh')}</h2><ul><li>{tx('总结我最大的三个持仓', 'Summarize my three largest holdings')}</li><li>{tx('我的组合有哪些货币敞口？', 'What currency exposure does my portfolio have?')}</li><li>{tx('哪些仓位正在拖累未实现收益？', 'Which positions are dragging down unrealized returns?')}</li></ul></section>
}

function DisconnectDialog({ pending, error, onCancel, onConfirm }: { pending: boolean; error?: ApiError; onCancel: () => void; onConfirm: () => void }) {
  return <div className="dialog-backdrop"><section className="confirm-dialog" role="dialog" aria-modal="true" aria-labelledby="disconnect-title"><Unplug strokeWidth={1.5} /><h2 id="disconnect-title">{tx('断开 Trading 212？', 'Disconnect Trading 212?')}</h2><p>{tx('这会停用当前连接并清除本次运行中的投资组合缓存。插件不会删除 Trading 212 网站上的密钥。', 'This disables the current connection and clears the in-memory portfolio cache. It does not delete the key on Trading 212.')}</p>{error && <ErrorPanel error={error} compact />}<div><button type="button" onClick={onCancel} disabled={pending}>{tx('取消', 'Cancel')}</button><button className="danger" type="button" onClick={onConfirm} disabled={pending}>{pending ? tx('正在断开…', 'Disconnecting…') : tx('确认断开', 'Disconnect')}</button></div></section></div>
}

function ThemeSetting() {
  const theme = useSyncExternalStore(themeStore.subscribe, themeStore.getSnapshot)
  const choices = [
    ['auto', tx('自动（跟随系统）', 'Auto (follow system)')],
    ['light', tx('蓝白私行', 'Haute-Banque (Light)')],
    ['dark', tx('黑曜石终端', 'Obsidian (Dark)')],
  ] as const
  return <section className="language-setting" aria-labelledby="theme-title">
    <div><span>{tx('界面', 'Interface')}</span><h2 id="theme-title">{tx('主题', 'Theme')}</h2><p>{theme.preference === 'auto' ? tx(`当前跟随系统：${theme.active === 'dark' ? '黑曜石终端（暗黑）' : '苏黎世私行（明亮）'}`, `Following system: ${theme.active === 'dark' ? 'Obsidian terminal (Dark)' : 'Zurich Haute-Banque (Light)'}`) : theme.preference === 'dark' ? tx('固定模式：黑曜石暗黑量化终端', 'Fixed mode: Obsidian quantitative terminal') : tx('固定模式：苏黎世私行蓝白典雅', 'Fixed mode: Zurich Haute-Banque')}</p></div>
    <div className="language-options" role="radiogroup" aria-label={tx('界面主题', 'Interface theme')}>{choices.map(([value, label]) => <button key={value} type="button" role="radio" aria-checked={theme.preference === value} className={theme.preference === value ? 'active' : ''} onClick={() => themeStore.setPreference(value as ThemePreference)}>{label}</button>)}</div>
  </section>
}

function LanguageSetting() {
  const language = useSyncExternalStore(languageStore.subscribe, languageStore.getSnapshot)
  const choices = [
    ['auto', tx('自动（跟随 dsh）', 'Auto (follow dsh)')],
    ['zh', '中文'],
    ['en', 'English'],
  ] as const
  return <section className="language-setting" aria-labelledby="language-title">
    <div><span>{tx('界面', 'Interface')}</span><h2 id="language-title">{tx('语言', 'Language')}</h2><p>{tx(`当前跟随 dsh：${language.host === 'zh' ? '中文' : 'English'}`, `dsh is currently using ${language.host === 'zh' ? 'Chinese' : 'English'}`)}</p></div>
    <div className="language-options" role="radiogroup" aria-label={tx('界面语言', 'Interface language')}>{choices.map(([value, label]) => <button key={value} type="button" role="radio" aria-checked={language.preference === value} className={language.preference === value ? 'active' : ''} onClick={() => languageStore.setPreference(value)}>{label}</button>)}</div>
  </section>
}

function SettingsPage({ status, onConnected, onDisconnected }: { status: ConnectionStatus; onConnected: (status: ConnectionStatus, snapshot: PortfolioSnapshot) => void; onDisconnected: () => void }) {
  const [reconnect, setReconnect] = useState(false)
  const [confirm, setConfirm] = useState(false)
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<ApiError>()
  const disconnect = async () => {
    setPending(true); setError(undefined)
    try { await api.disconnect(); onDisconnected() }
    catch (cause) { setError(cause instanceof ApiError ? cause : undefined) }
    finally { setPending(false) }
  }
  if (reconnect) return <section className="content-page"><button className="back-button" type="button" onClick={() => setReconnect(false)}>← {tx('返回设置', 'Back to settings')}</button><ConnectionForm title={tx('重新连接 Trading 212', 'Reconnect Trading 212')} onConnected={onConnected} /></section>
  return <section className="content-page settings-page"><h1>{tx('设置', 'Settings')}</h1><ThemeSetting /><LanguageSetting /><div className="settings-row"><div><span>{tx('连接状态', 'Connection')}</span><strong><i className="status-dot" />{tx('已连接', 'Connected')}</strong></div><div><span>{tx('环境', 'Environment')}</span><strong>{status.environment === 'live' ? 'Live' : 'Demo'}</strong></div><div><span>{tx('凭据来源', 'Credential source')}</span><strong>{status.source === 'record' ? tx('dsh 凭据记录', 'dsh credential record') : status.source === 'reference' ? tx('兼容凭据引用', 'Credential reference') : status.source}</strong></div></div>{status.writable ? <div className="settings-actions"><button type="button" onClick={() => setReconnect(true)}>{tx('更换密钥或环境', 'Change key or environment')}</button><button className="danger-outline" type="button" onClick={() => setConfirm(true)}>{tx('断开连接', 'Disconnect')}</button></div> : <div className="read-only-note"><ShieldCheck strokeWidth={1.5} /><span><strong>{tx('此连接由只读来源管理', 'This connection is managed by a read-only source')}</strong><br />{tx('请在环境变量或外部凭据配置中修改；插件不会覆盖它。', 'Change it in the environment or external credential configuration; the plugin will not overwrite it.')}</span></div>}{confirm && <DisconnectDialog pending={pending} error={error} onCancel={() => { if (!pending) { setConfirm(false); setError(undefined) } }} onConfirm={() => void disconnect()} />}</section>
}

function Workspace({
  status,
  page,
  selectedTicker,
  portfolio,
  loading,
  error,
  hideBalances,
  searchQuery,
  onNavigate,
  onInstrument,
  onSelectTicker,
  onRefresh,
  onConnected,
  onDisconnected,
}: {
  status: ConnectionStatus
  page: Page
  selectedTicker?: string
  portfolio?: PortfolioSnapshot
  loading: boolean
  error?: ApiError
  hideBalances: boolean
  searchQuery: string
  onNavigate: (page: Page) => void
  onInstrument: (position: Position) => void
  onSelectTicker?: (ticker: string) => void
  onRefresh: () => void
  onConnected: (status: ConnectionStatus, snapshot: PortfolioSnapshot) => void
  onDisconnected: () => void
}) {
  let content: ReactNode
  if (page === 'help') content = <HelpPage />
  else if (page === 'settings') content = <SettingsPage status={status} onConnected={onConnected} onDisconnected={onDisconnected} />
  else if (page === 'history') content = <HistoryPage />
  else if (loading && portfolio === undefined) content = <div className="page-loading"><LoaderCircle strokeWidth={1.5} className="spin" /><span>{tx('正在读取真实投资组合…', 'Loading your portfolio…')}</span></div>
  else if (portfolio === undefined && error !== undefined) content = <ErrorPanel error={error} status={status} onRetry={onRefresh} />
  else if (portfolio === undefined) content = null
  else if (page === 'instrument') {
    const position = portfolio.positions.find(item => item.instrument?.ticker === selectedTicker)
    content = position ? <InstrumentDetailPage position={position} accountCurrency={portfolio.account.currency} hideBalances={hideBalances} onBack={() => onNavigate('holdings')} /> : <section className="content-page"><button className="back-button" type="button" onClick={() => onNavigate('holdings')}><ArrowLeft strokeWidth={1.5} />{tx('返回持仓', 'Back to holdings')}</button><div className="empty-state"><AlertTriangle strokeWidth={1.5} /><strong>{tx('找不到这项持仓', 'Holding not found')}</strong><span>{tx('刷新后该持仓可能已经变化。', 'It may have changed since the last refresh.')}</span></div></section>
  }
  else if (page === 'holdings') content = <section className="content-page"><h1>{tx('持仓', 'Holdings')}</h1><p>{tx(`${portfolio.positions.length} 个持仓 · 点击任意资产查看价格曲线和买卖历史`, `${portfolio.positions.length} holdings · Select an asset to view its price chart and trade history`)}</p>{error && <ErrorPanel error={error} status={status} onRetry={onRefresh} compact />}<HoldingTable positions={portfolio.positions} currency={portfolio.account.currency} hideBalances={hideBalances} onSelect={onInstrument} /></section>
  else content = <>{error && <ErrorPanel error={error} status={status} onRetry={onRefresh} compact />}<OverviewPage portfolio={portfolio} hideBalances={hideBalances} searchQuery={searchQuery} selectedTicker={selectedTicker} onHoldings={() => onNavigate('holdings')} onInstrument={onInstrument} onNavigate={onNavigate} onSelectTicker={onSelectTicker} /></>
  
  return <main className="workspace">{content}<footer className="legal">{tx('持仓和成交来自 Trading 212；个股历史价格来自 Yahoo Finance。仅供参考，不构成投资建议。', 'Holdings and trades come from Trading 212; historical prices come from Yahoo Finance. For information only, not investment advice.')}</footer></main>
}

export function App() {
  useSyncExternalStore(languageStore.subscribe, languageStore.getSnapshot)
  useSyncExternalStore(themeStore.subscribe, themeStore.getSnapshot)
  const [boot, setBoot] = useState<BootState>({ kind: 'loading' })
  const [page, setPage] = useState<Page>('overview')
  const [selectedTicker, setSelectedTicker] = useState<string>()
  const [portfolio, setPortfolio] = useState<PortfolioSnapshot>()
  const [portfolioError, setPortfolioError] = useState<ApiError>()
  const [loadingPortfolio, setLoadingPortfolio] = useState(false)
  const [hideBalances, setHideBalances] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [showShortcutsHelp, setShowShortcutsHelp] = useState(false)

  const loadPortfolio = async (refresh = false) => {
    setLoadingPortfolio(true); setPortfolioError(undefined)
    try { setPortfolio(await api.portfolio(refresh)) }
    catch (cause) { setPortfolioError(cause instanceof ApiError ? cause : undefined) }
    finally { setLoadingPortfolio(false) }
  }
  const bootstrap = async () => {
    setBoot({ kind: 'loading' })
    try {
      const status = await api.status()
      setBoot({ kind: 'ready', status }); setPage(status.connected ? 'overview' : 'setup')
      if (status.connected) void loadPortfolio()
    } catch (cause) {
      setBoot({ kind: 'error', error: cause instanceof ApiError ? cause : new ApiError('STATUS_UNAVAILABLE', '无法读取插件状态', '未知错误', '重试', '/trading212/#help-status-unavailable', 'boot') })
    }
  }
  useEffect(() => { void bootstrap() }, [])

  const connected = boot.kind === 'ready' && boot.status.connected
  const activePage = useMemo<Page>(() => connected ? page : page === 'help' ? 'help' : 'setup', [connected, page])

  const navigate = useCallback((next: Page) => {
    if (next !== 'instrument') setSelectedTicker(undefined)
    setPage(next)
  }, [])

  const openInstrument = useCallback((position: Position) => {
    setSelectedTicker(position.instrument?.ticker)
    setPage('instrument')
  }, [])

  // Pro Institutional Keyboard Navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null
      const tagName = target?.tagName?.toUpperCase()
      if (tagName === 'INPUT' || tagName === 'TEXTAREA' || tagName === 'SELECT' || target?.isContentEditable) {
        if (e.key === 'Escape') {
          target?.blur()
        }
        return
      }

      // ⌘K or '/' -> Focus search input
      if (((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') || e.key === '/') {
        e.preventDefault()
        const searchInput = document.querySelector<HTMLInputElement>('.topbar-search-field, input[type="text"]')
        searchInput?.focus()
        return
      }

      // 'p' or 'h' -> toggle privacy hide balances
      if (e.key.toLowerCase() === 'p' || e.key.toLowerCase() === 'h') {
        e.preventDefault()
        setHideBalances(v => !v)
        return
      }

      // 't' -> toggle theme
      if (e.key.toLowerCase() === 't') {
        e.preventDefault()
        themeStore.toggle()
        return
      }

      // '?' -> toggle shortcut HUD help
      if (e.key === '?' || (e.shiftKey && e.key === '/')) {
        e.preventDefault()
        setShowShortcutsHelp(v => !v)
        return
      }

      // 'Escape' -> close shortcut help or reset selection
      if (e.key === 'Escape') {
        setShowShortcutsHelp(false)
        return
      }

      // 1-5 -> switch primary tabs
      if (connected) {
        if (e.key === '1') { e.preventDefault(); navigate('overview') }
        else if (e.key === '2') { e.preventDefault(); navigate('holdings') }
        else if (e.key === '3') { e.preventDefault(); navigate('history') }
        else if (e.key === '4') { e.preventDefault(); navigate('settings') }
        else if (e.key === '5') { e.preventDefault(); navigate('help') }
      }

      // j / k / ArrowDown / ArrowUp -> roam positions
      if (portfolio && portfolio.positions.length > 0) {
        const positions = portfolio.positions
        if (e.key === 'j' || e.key === 'ArrowDown') {
          e.preventDefault()
          const currentIndex = positions.findIndex(p => p.instrument?.ticker === selectedTicker)
          const nextIndex = currentIndex < 0 ? 0 : (currentIndex + 1) % positions.length
          const nextPos = positions[nextIndex]
          if (nextPos?.instrument?.ticker) {
            setSelectedTicker(nextPos.instrument.ticker)
          }
        } else if (e.key === 'k' || e.key === 'ArrowUp') {
          e.preventDefault()
          const currentIndex = positions.findIndex(p => p.instrument?.ticker === selectedTicker)
          const prevIndex = currentIndex <= 0 ? positions.length - 1 : currentIndex - 1
          const prevPos = positions[prevIndex]
          if (prevPos?.instrument?.ticker) {
            setSelectedTicker(prevPos.instrument.ticker)
          }
        }
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [connected, navigate, portfolio, selectedTicker])

  if (boot.kind === 'loading') return <div className="loading-screen"><Brand /><LoaderCircle strokeWidth={1.5} className="spin" /><span>{tx('正在读取连接状态…', 'Checking connection…')}</span></div>
  if (boot.kind === 'error') return <div className="fatal-screen"><Brand /><ErrorPanel error={boot.error} onRetry={() => void bootstrap()} /></div>

  const onConnected = (status: ConnectionStatus, snapshot: PortfolioSnapshot) => { setBoot({ kind: 'ready', status }); setPortfolio(snapshot); setPortfolioError(undefined); setPage('overview') }
  const onDisconnected = () => { setBoot({ kind: 'ready', status: { connected: false, environment: 'demo', writable: true, source: 'none' } }); setPortfolio(undefined); setPortfolioError(undefined); setPage('setup') }

  return (
    <div className={`t212-native-app-root ${hideBalances ? 'hide-balances' : ''}`}>
      <TopNavBar
        connected={boot.status.connected}
        status={boot.status}
        active={activePage === 'instrument' ? 'holdings' : activePage}
        hideBalances={hideBalances}
        loading={loadingPortfolio}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        onToggleHideBalances={() => setHideBalances(v => !v)}
        onRefresh={() => void loadPortfolio(true)}
        onNavigate={navigate}
      />
      <div className="app-shell">
        {boot.status.connected ? (
          <Workspace
            status={boot.status}
            page={activePage}
            selectedTicker={selectedTicker}
            portfolio={portfolio}
            loading={loadingPortfolio}
            error={portfolioError}
            hideBalances={hideBalances}
            searchQuery={searchQuery}
            onNavigate={navigate}
            onInstrument={openInstrument}
            onSelectTicker={setSelectedTicker}
            onRefresh={() => void loadPortfolio(true)}
            onConnected={onConnected}
            onDisconnected={onDisconnected}
          />
        ) : activePage === 'help' ? (
          <main className="workspace"><HelpPage /></main>
        ) : (
          <SetupPage onConnected={onConnected} />
        )}
      </div>

      {/* Shortcuts Guide Modal */}
      {showShortcutsHelp && (
        <div className="shortcuts-modal-backdrop" onClick={() => setShowShortcutsHelp(false)}>
          <div className="shortcuts-modal-card" onClick={e => e.stopPropagation()}>
            <div className="shortcuts-modal-header">
              <h3>{tx('瑞士私行终端 · 快捷键指南', 'Swiss Private Terminal · Shortcuts')}</h3>
              <button type="button" className="close-modal-btn" onClick={() => setShowShortcutsHelp(false)}>×</button>
            </div>
            <div className="shortcuts-modal-grid">
              <div className="shortcut-group">
                <h4>{tx('导航与视图', 'Navigation')}</h4>
                <div className="shortcut-row"><span><kbd>1</kbd></span><label>{tx('总览控制台', 'Overview cockpit')}</label></div>
                <div className="shortcut-row"><span><kbd>2</kbd></span><label>{tx('全部持仓', 'Holdings list')}</label></div>
                <div className="shortcut-row"><span><kbd>3</kbd></span><label>{tx('成交与派息历史', 'History')}</label></div>
                <div className="shortcut-row"><span><kbd>4</kbd></span><label>{tx('设置与环境', 'Settings')}</label></div>
                <div className="shortcut-row"><span><kbd>5</kbd></span><label>{tx('帮助指南', 'Help')}</label></div>
              </div>
              <div className="shortcut-group">
                <h4>{tx('交易与漫游', 'Trading & Roaming')}</h4>
                <div className="shortcut-row"><span><kbd>J</kbd> / <kbd>↓</kbd></span><label>{tx('下一项持仓资产', 'Next position')}</label></div>
                <div className="shortcut-row"><span><kbd>K</kbd> / <kbd>↑</kbd></span><label>{tx('上一项持仓资产', 'Previous position')}</label></div>
                <div className="shortcut-row"><span><kbd>/</kbd> 或 <kbd>⌘K</kbd></span><label>{tx('聚焦搜索标的', 'Focus search')}</label></div>
                <div className="shortcut-row"><span><kbd>P</kbd> 或 <kbd>H</kbd></span><label>{tx('遮罩/显示资产金额', 'Toggle privacy mask')}</label></div>
                <div className="shortcut-row"><span><kbd>T</kbd></span><label>{tx('一键切换深浅主题', 'Toggle dark/light theme')}</label></div>
                <div className="shortcut-row"><span><kbd>Esc</kbd></span><label>{tx('关闭弹窗 / 取消聚焦', 'Dismiss / Blur')}</label></div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
