import { Children, useEffect, useLayoutEffect, useMemo, useRef, useState, useSyncExternalStore, type ReactNode } from 'react'
import * as echarts from 'echarts/core'
import { LineChart, ScatterChart } from 'echarts/charts'
import { AriaComponent, DataZoomComponent, GridComponent, LegendComponent, TooltipComponent } from 'echarts/components'
import { CanvasRenderer } from 'echarts/renderers'
import type { EChartsCoreOption } from 'echarts/core'
import {
  AlertTriangle, ArrowLeft, ArrowRight, BarChart3, Bell, BriefcaseBusiness, Check, ChevronDown, CircleDollarSign, CircleHelp, Clipboard, Eye, EyeOff,
  History as HistoryIcon, Layers3, LayoutDashboard, LoaderCircle, Menu, Plus, RefreshCw, Search, Settings, ShieldCheck, SlidersHorizontal, Sparkles, Unplug, X,
} from 'lucide-react'
import { ApiError, api, diagnosticText } from './api.ts'
import { copyText } from './clipboard.ts'
import { languageStore, localeCode, tx } from './i18n.ts'
import type { ConnectionStatus } from '../portfolio-service.ts'
import type { MarketRange, MarketSeries } from '../market-data.ts'
import type { CashTransaction, Dividend, HistoricalOrder, HistoryItem, HistoryKind, PortfolioSnapshot, Position, TradingEnvironment } from '../trading212.ts'

echarts.use([LineChart, ScatterChart, AriaComponent, DataZoomComponent, GridComponent, LegendComponent, TooltipComponent, CanvasRenderer])

type Page = 'overview' | 'holdings' | 'instrument' | 'history' | 'settings' | 'help' | 'setup'
type CopyStatus = 'idle' | 'copied' | 'failed'
type BootState = { kind: 'loading' } | { kind: 'error'; error: ApiError } | { kind: 'ready'; status: ConnectionStatus }

const money = (value: number | undefined, currency = 'EUR') => new Intl.NumberFormat(localeCode(), {
  style: 'currency', currency, maximumFractionDigits: 2,
}).format(value ?? 0)

const decimal = (value: number | undefined, maximumFractionDigits = 2) => new Intl.NumberFormat(localeCode(), {
  maximumFractionDigits,
}).format(value ?? 0)

const percent = (value: number | undefined, digits = 1) => value === undefined ? '—' : `${value >= 0 ? '+' : ''}${decimal(value, digits)}%`
const plainPercent = (value: number | undefined, digits = 1) => value === undefined ? '—' : `${decimal(value, digits)}%`
const displayTickerAliases: Record<string, string> = {
  SNDK1: 'SNDK',
  YNDX: 'NBIS',
}

export const tickerLabel = (ticker: string | undefined) => {
  const rawTicker = ticker?.replace(/_.*/, '')
  return rawTicker ? displayTickerAliases[rawTicker] ?? rawTicker : '—'
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

  return (
    <header className="t212-native-topbar">
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

      <div className="topbar-right-zone">
        {connected && (
          <div className="topbar-search-slot">
            <Search strokeWidth={1.5} size={14} className="search-glyph-icon" />
            <input
              type="text"
              className="topbar-search-field"
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

const palette = ['#1677ff', '#18a957', '#7e5bef', '#e78b28', '#e0524d', '#56b4c3', '#9aa8b8']

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
  weightPercent: number
  x: number
  y: number
  w: number
  h: number
}

function computeTreemapLayout(
  items: Array<{ ticker: string; name: string; returnPercent?: number; unrealizedProfitLoss: number; weightPercent: number }>,
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

function DynamicTreemapGrid({
  allocation,
  activeTicker,
  onSelect,
}: {
  allocation: PortfolioSnapshot['analytics']['allocation']
  activeTicker?: string
  onSelect?: (ticker: string) => void
}) {
  const topItems = allocation.slice(0, 6)
  if (topItems.length === 0) return null

  const rects = useMemo(() => computeTreemapLayout(topItems), [topItems])

  return (
    <div className="dynamic-treemap-container">
      {rects.map(rect => {
        const isPositive = rect.unrealizedProfitLoss > 0
        const isNegative = rect.unrealizedProfitLoss < 0
        const isSelected = rect.ticker === activeTicker
        const isCompact = rect.w < 30 || rect.h < 28

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
              className={`treemap-tile dynamic-tile ${isPositive ? 'gain' : isNegative ? 'loss' : 'neutral'} ${isSelected ? 'selected' : ''} ${isCompact ? 'compact' : ''}`}
              onClick={() => onSelect?.(rect.ticker)}
              title={`${tickerLabel(rect.ticker)} · ${rect.name} · ${plainPercent(rect.weightPercent)}`}
            >
              <strong className="tile-ticker">{tickerLabel(rect.ticker)}</strong>
              <span className={`tile-percent ${isPositive ? 'tone-positive' : isNegative ? 'tone-negative' : ''}`}>
                {percent(rect.returnPercent)}
              </span>
            </button>
          </div>
        )
      })}
    </div>
  )
}

function AllocationTreemap({ portfolio, onHoldings, onSelect }: { portfolio: PortfolioSnapshot; onHoldings?: () => void; onSelect?: (position: Position) => void }) {
  const source = portfolio.analytics.allocation
  if (source.length === 0) return null
  return (
    <div className="treemap-wrapper">
      <DynamicTreemapGrid
        allocation={source}
        onSelect={ticker => {
          const pos = portfolio.positions.find(p => p.instrument?.ticker === ticker)
          if (pos && onSelect) onSelect(pos)
        }}
      />
      {onHoldings && (
        <button className="treemap-see-all" type="button" onClick={onHoldings}>
          {tx('查看全部持仓', 'See all')}
          <span className="btn-orb" aria-hidden="true"><ArrowRight size={13} strokeWidth={2} /></span>
        </button>
      )}
    </div>
  )
}

function AllocationList({
  portfolio,
  activeTicker,
  hideBalances,
  onHoldings,
  onSelect,
}: {
  portfolio: PortfolioSnapshot
  activeTicker?: string
  hideBalances: boolean
  onHoldings: () => void
  onSelect: (ticker: string) => void
}) {
  const currency = portfolio.account.currency
  const rows = portfolio.analytics.allocation.slice(0, 6)
  if (rows.length === 0) return <div className="empty-inline">{tx('目前没有持仓', 'No holdings yet')}</div>

  return <div className="allocation-list">
    <div
      className="allocation-list-track"
      role="img"
      aria-label={rows.map(item => `${item.name} ${plainPercent(item.weightPercent)}`).join('，')}
    >
      {rows.map((item, index) => <i key={item.ticker} style={{ width: `${Math.max(item.weightPercent, .5)}%`, background: palette[index] }} />)}
    </div>
    <div className="allocation-list-head" aria-hidden="true">
      <span>{tx('资产', 'Asset')}</span><span>{tx('占比', 'Weight')}</span><span>{tx('价值', 'Value')}</span>
    </div>
    <div className="allocation-list-rows">
      {rows.map((item, index) => <button
        key={item.ticker}
        type="button"
        className={item.ticker === activeTicker ? 'selected' : ''}
        onClick={() => onSelect(item.ticker)}
      >
        <span className="allocation-list-asset"><i style={{ background: palette[index] }} /><b>{tickerLabel(item.ticker)}</b><small>{item.name}</small></span>
        <strong>{plainPercent(item.weightPercent)}</strong>
        <em>{hideBalances ? '••••' : money(item.currentValue, currency)}</em>
      </button>)}
    </div>
    <button className="allocation-list-all" type="button" onClick={onHoldings}>{tx('查看全部持仓', 'View all holdings')}</button>
  </div>
}

function Allocation({ portfolio, onHoldings, onSelect }: { portfolio: PortfolioSnapshot; onHoldings?: () => void; onSelect?: (position: Position) => void }) {
  const currency = portfolio.account.currency
  const source = portfolio.analytics.allocation
  if (source.length === 0) return <div className="empty-inline">{tx('目前没有持仓', 'No holdings yet')}</div>
  const leading = source.slice(0, 5)
  const other = source.slice(5)
  const rows = other.length === 0 ? leading : [...leading, {
    ticker: 'other', name: tx(`其他 ${other.length} 项`, `${other.length} others`), instrumentCurrency: currency,
    currentValue: other.reduce((sum, item) => sum + item.currentValue, 0), totalCost: 0,
    unrealizedProfitLoss: 0, fxImpact: 0, weightPercent: other.reduce((sum, item) => sum + item.weightPercent, 0),
  }]
  return <div className="allocation" aria-label={tx('持仓市值构成', 'Holding value allocation')}>
    <AllocationTreemap portfolio={portfolio} onHoldings={onHoldings} onSelect={onSelect} />
    <div className="allocation-track" role="img" aria-label={rows.map(item => `${item.name} ${plainPercent(item.weightPercent)}`).join('，')}>{rows.map((item, index) => <i key={item.ticker} style={{ width: `${Math.max(item.weightPercent, .4)}%`, background: palette[index] }} />)}</div>
    <div className="allocation-legend">{rows.map((item, index) => <span key={item.ticker}><i style={{ background: palette[index] }} /><b>{item.name}</b><em>{money(item.currentValue, currency)} · {plainPercent(item.weightPercent)}</em></span>)}</div>
  </div>
}

function BarList({ rows, currency, signed = false, ariaLabel }: { rows: Array<{ key: string; label: string; detail?: string; value: number }>; currency: string; signed?: boolean; ariaLabel: string }) {
  const max = Math.max(...rows.map(row => Math.abs(row.value)), 1)
  if (rows.length === 0) return <div className="empty-inline">{tx('暂无足够数据', 'Not enough data')}</div>
  return <div className={`bar-list ${signed ? 'signed-bars' : ''}`} aria-label={ariaLabel}>{rows.map(row => <div className="bar-row" key={row.key}>
    <div className="bar-label"><strong>{row.label}</strong>{row.detail && <small>{row.detail}</small>}</div>
    <div className="bar-measure"><i className={row.value < 0 ? 'bar-negative' : 'bar-positive'} style={{ width: `${Math.max(Math.abs(row.value) / max * 100, 2)}%` }} /></div>
    <b className={signed ? row.value >= 0 ? 'tone-positive' : 'tone-negative' : ''}>{signed ? signedMoney(row.value, currency) : money(row.value, currency)}</b>
  </div>)}</div>
}

function ProfitDrivers({ portfolio }: { portfolio: PortfolioSnapshot }) {
  const rows = [...portfolio.analytics.allocation]
    .sort((a, b) => Math.abs(b.unrealizedProfitLoss) - Math.abs(a.unrealizedProfitLoss))
    .slice(0, 6)
    .map(item => ({ key: item.ticker, label: item.name, detail: `${tickerLabel(item.ticker)} · ${percent(item.returnPercent)}`, value: item.unrealizedProfitLoss }))
  return <BarList rows={rows} currency={portfolio.account.currency} signed ariaLabel={tx('未实现盈亏贡献排名', 'Unrealized return contributors')} />
}

function CurrencyExposureChart({ portfolio }: { portfolio: PortfolioSnapshot }) {
  const exposure = portfolio.analytics.currencyExposure.slice(0, 6)
  if (exposure.length < 4) return <div className="exposure-summary">{exposure.map(item => <div key={item.currency}><strong>{item.currency}</strong><span>{money(item.currentValue, portfolio.account.currency)}</span><small>{tx(`${item.positions} 个持仓`, `${item.positions} holdings`)} · {plainPercent(item.weightPercent)}</small></div>)}</div>
  const rows = exposure.map(item => ({
    key: item.currency, label: item.currency, detail: `${tx(`${item.positions} 个持仓`, `${item.positions} holdings`)} · {plainPercent(item.weightPercent)}`, value: item.currentValue,
  }))
  return <BarList rows={rows} currency={portfolio.account.currency} ariaLabel={tx('按标的交易币种划分的持仓市值', 'Holding value by instrument currency')} />
}

function HoldingTable({ positions, currency, limit, compact = false, selectedTicker, onSelect }: { positions: Position[]; currency: string; limit?: number; compact?: boolean; selectedTicker?: string; onSelect?: (position: Position) => void }) {
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
    return <tr key={ticker || index} className={ticker === selectedTicker ? 'is-selected' : ''}><td data-label={tx('资产', 'Asset')}><div className="asset-cell"><TickerRingLogo ticker={ticker} weightPercent={weight} />{onSelect && ticker ? <button className="asset-link" type="button" onClick={() => onSelect(position)}><strong>{label}</strong><small>{tickerLabel(ticker)} · {position.instrument?.currency ?? currency}</small></button> : <div className="asset-text"><strong>{label}</strong><small>{tickerLabel(ticker)} · {position.instrument?.currency ?? currency}</small></div>}</div><small>{(position.quantityInPies ?? 0) > 0 ? `Pie ${decimal(position.quantityInPies, 4)}` : ''}</small></td><td data-label={tx('数量', 'Quantity')}>{decimal(position.quantity, 4)}<small>{tx('可交易', 'Tradable')} {decimal(position.quantityAvailableForTrading, 4)}</small></td><td data-label={tx('均价 / 现价', 'Average / current')}><strong>{position.averagePricePaid === undefined ? '—' : money(position.averagePricePaid, position.instrument?.currency ?? currency)}</strong><small>{position.currentPrice === undefined ? '—' : money(position.currentPrice, position.instrument?.currency ?? currency)}</small></td>{!compact && <td data-label={tx('成本', 'Cost')}>{money(cost, currency)}</td>}<td data-label={tx('市值 / 权重', 'Value / weight')}><strong>{money(value, currency)}</strong><small>{plainPercent(weight)}</small></td><td data-label={tx('未实现收益', 'Unrealized return')} className={profit >= 0 ? 'tone-positive' : 'tone-negative'}><strong>{signedMoney(profit, currency)}</strong><small>{percent(cost ? profit / cost * 100 : undefined)}</small></td>{!compact && <td data-label={tx('外汇影响', 'FX impact')} className={(fx ?? 0) >= 0 ? 'tone-positive' : 'tone-negative'}>{fx === undefined ? '—' : signedMoney(fx, currency)}</td>}</tr>
  })}</tbody></table></div>
}

function PendingOrders({ orders, currency }: { orders: PortfolioSnapshot['pendingOrders']; currency: string }) {
  if (orders.length === 0) return <div className="empty-inline order-empty">{tx('没有待处理订单', 'No pending orders')}</div>
  return <div className="table-scroll"><table><thead><tr><th>{tx('资产与时间', 'Asset and time')}</th><th>{tx('方向 / 类型', 'Side / type')}</th><th>{tx('数量', 'Quantity')}</th><th>{tx('限价 / 止损', 'Limit / stop')}</th><th>{tx('状态', 'Status')}</th></tr></thead><tbody>{orders.map(order => <tr key={order.id}>
    <td data-label={tx('资产与时间', 'Asset and time')}><div className="asset-cell"><TickerRingLogo ticker={order.ticker} /><div className="asset-text"><strong>{order.instrument?.name ?? order.ticker}</strong><small>{order.createdAt ? new Date(order.createdAt).toLocaleString(localeCode()) : tickerLabel(order.ticker)} · {order.initiatedFrom ?? tx('来源未知', 'Unknown source')}</small></div></div></td>
    <td data-label={tx('方向 / 类型', 'Side / type')}><span className={`history-side ${order.side.toLowerCase()}`}>{order.side === 'BUY' ? tx('买入', 'Buy') : tx('卖出', 'Sell')}</span><small>{order.type}{order.extendedHours ? tx(' · 含延长交易时段', ' · Extended hours') : ''}</small></td>
    <td data-label={tx('数量', 'Quantity')}>{decimal(order.quantity, 4)}<small>{tx('已成交', 'Filled')} {decimal(order.filledQuantity, 4)}</small></td>
    <td data-label="限价 / 止损"><strong>{order.limitPrice === undefined ? '—' : money(order.limitPrice, order.instrument?.currency ?? order.currency ?? currency)}</strong><small>{order.stopPrice === undefined ? '—' : money(order.stopPrice, order.instrument?.currency ?? order.currency ?? currency)}</small></td>
    <td data-label="状态"><strong>{order.status}</strong><small>{order.timeInForce ?? order.strategy ?? '—'}</small></td>
  </tr>)}</tbody></table></div>
}

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
    return <tr key={`order:${item.order.id}:fill:${item.fill?.id ?? index}`}><td data-label={tx('时间与资产', 'Time and asset')}><strong>{item.order.instrument?.name ?? item.order.ticker}</strong><small>{date ? new Date(date).toLocaleString(localeCode()) : tx('时间未知', 'Unknown time')} · {item.order.ticker.replace(/_.*/, '')}</small></td><td data-label={tx('方向 / 状态', 'Side / status')}><span className={`history-side ${item.order.side.toLowerCase()}`}>{item.order.side === 'BUY' ? tx('买入', 'Buy') : tx('卖出', 'Sell')}</span><small>{item.order.status}</small></td><td data-label={tx('数量', 'Quantity')}>{decimal(item.fill?.quantity ?? item.order.filledQuantity ?? item.order.quantity, 4)}</td><td data-label={tx('成交价', 'Fill price')}>{item.fill?.price === undefined ? '—' : money(item.fill.price, item.order.instrument?.currency ?? currency)}</td><td data-label={tx('净额', 'Net value')}>{item.fill?.walletImpact?.netValue === undefined ? '—' : money(item.fill.walletImpact.netValue, currency)}</td></tr>
  }))}</tbody></table></div>
  if (kind === 'dividends') return <div className="table-scroll"><table><thead><tr><th>{tx('日期与资产', 'Date and asset')}</th><th>{tx('数量', 'Quantity')}</th><th>{tx('每股', 'Per share')}</th><th>{tx('到账金额', 'Amount')}</th></tr></thead><tbody>{Children.toArray((items as Dividend[]).map(item => <tr key={item.reference}><td data-label={tx('日期与资产', 'Date and asset')}><strong>{item.instrument?.name ?? item.ticker}</strong><small>{new Date(item.paidOn).toLocaleDateString(localeCode())} · {item.ticker.replace(/_.*/, '')}</small></td><td data-label={tx('数量', 'Quantity')}>{decimal(item.quantity, 4)}</td><td data-label={tx('每股', 'Per share')}>{item.grossAmountPerShare === undefined ? '—' : decimal(item.grossAmountPerShare, 4)}</td><td data-label={tx('到账金额', 'Amount')} className="positive">+{money(item.amount, item.currency)}</td></tr>))}</tbody></table></div>
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
      {points.map(point => <g key={point.key} className="timeline-point"><line x1={x(point.time)} x2={x(point.time)} y1={y(point.price)} y2={height - margin.bottom} className="timeline-stem" />{point.side === 'BUY' ? <circle cx={x(point.time)} cy={y(point.price)} r="6" className="timeline-buy"><title>{`买入 · ${new Date(point.filledAt).toLocaleString('zh-CN')} · ${formatPrice(point.price)} · ${decimal(point.quantity, 4)} 股`}</title></circle> : <polygon points={`${x(point.time)},${y(point.price) - 7} ${x(point.time) + 7},${y(point.price)} ${x(point.time)},${y(point.price) + 7} ${x(point.time) - 7},${y(point.price)}`} className="timeline-sell"><title>{`卖出 · ${new Date(point.filledAt).toLocaleString('zh-CN')} · ${formatPrice(point.price)} · ${decimal(point.quantity, 4)} 股`}</title></polygon>}</g>)}
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

const intervalLabel = (series: MarketSeries) => series.interval === '1d'
  ? tx('每日收盘价', 'Daily close')
  : tx(`${series.interval === '1m' ? '1分钟' : '5分钟'}价格 · 含盘前盘后`, `${series.interval === '1m' ? '1-minute' : '5-minute'} prices · Extended hours`)

/* RangeSwitcher — 行内分段控件（DESIGN.md §4.8）。
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

function PriceHistoryChart({ series, orders, name, compact = false }: { series: MarketSeries; orders: HistoricalOrder[]; name: string; compact?: boolean }) {
  const chartRef = useRef<HTMLDivElement>(null)
  const candles = [...series.candles].sort((a, b) => Date.parse(a.time) - Date.parse(b.time))
  const start = Date.parse(candles[0]!.time)
  const end = Date.parse(candles[candles.length - 1]!.time)
  const trades = orders.flatMap((item, index): TradePoint[] => {
    const filledAt = item.fill?.filledAt
    const price = item.fill?.price
    const time = filledAt === undefined ? Number.NaN : Date.parse(filledAt)
    if (filledAt === undefined || price === undefined || !Number.isFinite(time) || time < start || time > end) return []
    return [{ key: `${item.order.id}:${item.fill?.id ?? index}`, ticker: item.order.ticker, name, side: item.order.side, time, filledAt, price, quantity: item.fill?.quantity ?? item.order.filledQuantity ?? item.order.quantity ?? 0, currency: series.currency }]
  })
  const first = candles[0]!.close; const last = candles[candles.length - 1]!.close
  const change = first === 0 ? undefined : (last - first) / first * 100
  useEffect(() => {
    const element = chartRef.current
    if (element === null) return
    if (/jsdom/i.test(navigator.userAgent)) return
    const chart = echarts.init(element, undefined, { renderer: 'canvas' })
    const formatPrice = (value: number) => money(value, series.currency)
    const buyData = trades.filter(item => item.side === 'BUY').map(item => ({
      value: [item.time, item.price], quantity: item.quantity, filledAt: item.filledAt,
    }))
    const sellData = trades.filter(item => item.side === 'SELL').map(item => ({
      value: [item.time, item.price], quantity: item.quantity, filledAt: item.filledAt,
    }))
    const closeName = tx('收盘价', 'Close')
    const buyName = tx('买入', 'Buy')
    const sellName = tx('卖出', 'Sell')
    const option: EChartsCoreOption = {
      animation: typeof window.matchMedia !== 'function' || !window.matchMedia('(prefers-reduced-motion: reduce)').matches,
      aria: { enabled: true, decal: { show: false }, description: tx(`${name} 走势图`, `${name} price chart`) },
      color: ['#1677ff', '#18a957', '#d88a15'],
      grid: { left: 10, right: 60, top: 20, bottom: compact ? 26 : 56, containLabel: true },
      legend: { show: !compact, top: 0, left: 0, itemWidth: 14, itemHeight: 6, textStyle: { color: '#708196', fontSize: 11, fontFamily: 'SF Mono, IBM Plex Mono, Menlo, monospace' }, data: [closeName, buyName, sellName] },
      tooltip: {
        trigger: 'axis', renderMode: 'richText', confine: true, axisPointer: { type: 'cross', snap: false, lineStyle: { color: 'rgba(112, 129, 150, 0.45)', type: 'dashed' } },
        backgroundColor: 'rgba(255, 255, 255, 0.98)', borderColor: '#dce3eb', borderWidth: 1, padding: [10, 14],
        textStyle: { color: '#15263a', fontSize: 11.5 },
        extraCssText: 'box-shadow: 0 5px 16px rgba(20, 45, 72, 0.14); border-radius: 8px;',
        formatter: (params: unknown) => {
          const rows = Array.isArray(params) ? params as Array<Record<string, unknown>> : []
          const firstRow = rows[0]
          const axisValue = typeof firstRow?.axisValue === 'number' ? firstRow.axisValue : Number(firstRow?.axisValue)
          const lines = Number.isFinite(axisValue) ? [new Date(axisValue).toLocaleString(localeCode())] : []
          for (const row of rows) {
            const data = row.data as { value?: unknown[]; quantity?: number; filledAt?: string } | undefined
            const value = Array.isArray(data?.value) ? Number(data.value[1]) : Number(row.value)
            if (!Number.isFinite(value)) continue
            const seriesName = String(row.seriesName ?? '')
            lines.push(`${String(row.marker ?? '')}${seriesName}  ${formatPrice(value)}`)
            if (data?.quantity !== undefined) lines.push(`${tx('数量', 'Quantity')}  ${decimal(data.quantity, 4)}${tx(' 股', ' shares')}${data.filledAt ? ` · ${new Date(data.filledAt).toLocaleTimeString(localeCode())}` : ''}`)
          }
          return lines.join('\n')
        },
      },
      xAxis: { type: 'time', min: start, max: end, boundaryGap: false, axisLine: { show: false }, axisTick: { show: false }, axisLabel: { color: '#8b9aab', fontSize: 10.5, hideOverlap: true }, splitLine: { show: false } },
      yAxis: { position: 'right', type: 'value', scale: true, axisLine: { show: false }, axisTick: { show: false }, axisLabel: { color: '#8b9aab', fontSize: 10.5, formatter: (value: number) => formatPrice(value) }, splitLine: { show: true, lineStyle: { color: 'rgba(21, 38, 58, 0.08)' } } },
      dataZoom: compact ? [] : [{ type: 'inside', filterMode: 'none', minSpan: 8 }, { type: 'slider', height: 18, bottom: 10, borderColor: '#dce3eb', fillerColor: 'rgba(22, 119, 255, 0.14)', handleStyle: { color: '#1677ff', borderColor: '#ffffff', borderWidth: 1.5, shadowBlur: 0 }, textStyle: { color: '#708196', fontSize: 9.5 }, brushSelect: false }],
      series: [
        {
          name: closeName,
          type: 'line',
          data: candles.map(item => [Date.parse(item.time), item.close]),
          showSymbol: false,
          sampling: 'lttb',
          smooth: false,
          lineStyle: { color: '#1677ff', width: 2 },
          markLine: {
            symbol: ['none', 'none'],
            data: [{ yAxis: last, lineStyle: { color: 'rgba(22, 119, 255, 0.55)', type: 'dashed' }, label: { show: true, position: 'end', formatter: () => formatPrice(last), color: '#ffffff', backgroundColor: '#1677ff', padding: [3, 6], borderRadius: 5, borderWidth: 0 } }],
          },
          z: 2,
        },
        { name: buyName, type: 'scatter', data: buyData, symbol: 'rect', symbolSize: 9, itemStyle: { color: '#18a957', borderColor: '#ffffff', borderWidth: 1.5 }, z: 5 },
        { name: sellName, type: 'scatter', data: sellData, symbol: 'triangle', symbolSize: 11, itemStyle: { color: '#d88a15', borderColor: '#ffffff', borderWidth: 1.5 }, z: 5 },
      ],
    }
    chart.setOption(option)
    const resize = typeof ResizeObserver === 'undefined' ? undefined : new ResizeObserver(() => chart.resize())
    resize?.observe(element)
    return () => { resize?.disconnect(); chart.dispose() }
  }, [candles, compact, end, name, series.currency, series.range, start, trades])
  return <section className="price-chart-panel" aria-labelledby="price-chart-title">
    {!compact && <div className="section-heading"><div><h2 id="price-chart-title">{tx('历史价格与买卖点', 'Price history and trade markers')}</h2><p>{series.symbol} · {intervalLabel(series)} · {new Date(start).toLocaleDateString(localeCode())} – {new Date(end).toLocaleDateString(localeCode())} · {tx('纵轴聚焦价格区间', 'Scaled price axis')}</p></div><strong className={(change ?? 0) >= 0 ? 'tone-positive' : 'tone-negative'}>{money(last, series.currency)} <small>{percent(change)}</small></strong></div>}
    {!compact && <p className="chart-count">{tx(`区间内 ${trades.length} 个 Trading 212 成交点 · 可拖动底部滑块或双指缩放`, `${trades.length} Trading 212 trades in range · Drag the slider or pinch to zoom`)}</p>}
    <div ref={chartRef} className="price-chart" role="img" aria-label={compact ? tx(`${name} ${rangeLabel(series.range)}历史价格曲线`, `${name} price chart`) : tx(`${name} ${rangeLabel(series.range)}历史价格曲线，包含 ${trades.length} 个买卖成交点`, `${name} ${rangeLabel(series.range)} price chart with ${trades.length} trade markers`)} />
    <div className="sr-only" aria-label="成交点明细">{trades.map(trade => <span key={trade.key}>{trade.side === 'BUY' ? '买入' : '卖出'}，{new Date(trade.filledAt).toLocaleString('zh-CN')}，成交价 {money(trade.price, series.currency)}，{decimal(trade.quantity, 4)} 股</span>)}</div>
  </section>
}

function Metric({ label, value, note, tone }: { label: string; value: string; note?: string; tone?: 'positive' | 'negative' }) {
  return <div className="metric-card"><span>{label}</span><strong className={tone === 'positive' ? 'tone-positive' : tone === 'negative' ? 'tone-negative' : ''}>{value}</strong>{note && <small>{note}</small>}</div>
}

function CockpitInstrumentView({ position, accountCurrency, portfolioTotal, onSelect }: { position: Position; accountCurrency: string; portfolioTotal?: number; onSelect?: (position: Position) => void }) {
  const ticker = position.instrument?.ticker ?? ''
  const name = position.instrument?.name ?? tickerLabel(ticker)
  const currency = position.instrument?.currency ?? accountCurrency
  const [range, setRange] = useState<MarketRange>('1y')
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
            {signedMoney(profit, accountCurrency)} ({percent(returnPct)})
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
            <strong>{money(position.walletImpact?.currentValue, accountCurrency)}</strong>
          </div>
          <div className="inv-metric-row">
            <span>{tx('未实现收益', 'RETURN')}</span>
            <strong className={profit >= 0 ? 'tone-positive' : 'tone-negative'}>
              {signedMoney(profit, accountCurrency)} ({percent(returnPct)})
            </strong>
          </div>
          <div className="inv-metric-row">
            <span>{tx('持股数量', 'SHARES')}</span>
            <strong>{decimal(position.quantity, 4)}</strong>
          </div>
          <div className="inv-metric-row">
            <span>{tx('平均买入价', 'AVERAGE PRICE')}</span>
            <strong>{position.averagePricePaid === undefined ? '—' : money(position.averagePricePaid, currency)}</strong>
          </div>
          <div className="inv-metric-row">
            <span>{tx('持仓成本', 'COST')}</span>
            <strong>{money(cost, accountCurrency)}</strong>
          </div>
        </div>
      </section>

    </div>
  )
}

function InstrumentDetailPage({ position, accountCurrency, onBack }: { position: Position; accountCurrency: string; onBack: () => void }) {
  const ticker = position.instrument?.ticker ?? ''
  const name = position.instrument?.name ?? tickerLabel(ticker)
  const currency = position.instrument?.currency ?? accountCurrency
  const [range, setRange] = useState<MarketRange>('1y')
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
        <p>{decimal(position.quantity, 4)} {tx('股', 'shares')} · {tx('标的币种', 'Instrument currency')} {currency}</p>
      </div>
      <div className="instrument-price-action">
        <span>{tx('当前价格', 'Current price')}</span>
        <strong>{money(position.currentPrice, currency)}</strong>
        <small className={profit >= 0 ? 'tone-positive' : 'tone-negative'}>
          {signedMoney(profit, accountCurrency)} · {percent(cost ? profit / cost * 100 : undefined)}
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
        <div className="invest-row"><span>{tx('当前市值', 'VALUE')}</span><strong>{money(position.walletImpact?.currentValue, accountCurrency)}</strong></div>
        <div className="invest-row"><span>{tx('未实现收益', 'RETURN')}</span><strong className={profit >= 0 ? 'tone-positive' : 'tone-negative'}>{signedMoney(profit, accountCurrency)} <small>({percent(cost ? profit / cost * 100 : undefined)})</small></strong></div>
        <div className="invest-row"><span>{tx('持股数量', 'SHARES')}</span><strong>{decimal(position.quantity, 4)} <small>({tx('可交易', 'Tradable')} {decimal(position.quantityAvailableForTrading, 4)})</small></strong></div>
        <div className="invest-row"><span>{tx('平均买入价', 'AVERAGE PRICE')}</span><strong>{position.averagePricePaid === undefined ? '—' : money(position.averagePricePaid, currency)}</strong></div>
        <div className="invest-row"><span>{tx('持仓成本', 'COST')}</span><strong>{money(cost, accountCurrency)}</strong></div>
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
  const total = rows.reduce((sum, item) => sum + item.amount, 0)
  const tickers = new Set(rows.map(item => item.ticker)).size
  const byAsset = new Map<string, { label: string; value: number; count: number }>()
  for (const item of rows) {
    const current = byAsset.get(item.ticker) ?? { label: item.instrument?.name ?? tickerLabel(item.ticker), value: 0, count: 0 }
    byAsset.set(item.ticker, { ...current, value: current.value + item.amount, count: current.count + 1 })
  }
  const chartRows = [...byAsset].map(([key, item]) => ({ key, label: item.label, detail: tx(`${item.count} 笔`, `${item.count} payments`), value: item.value })).sort((a, b) => b.value - a.value).slice(0, 6)
  const dates = rows.map(item => new Date(item.paidOn).getTime()).filter(Number.isFinite)
  const range = dates.length ? `${new Date(Math.min(...dates)).toLocaleDateString(localeCode())} – ${new Date(Math.max(...dates)).toLocaleDateString(localeCode())}` : undefined
  return <><section className="history-metrics"><Metric label={tx('已加载记录', 'Loaded records')} value={tx(`${rows.length} 笔`, `${rows.length}`)} note={tx('当前分页样本', 'Current loaded sample')} /><Metric label={tx('派息资产', 'Paying assets')} value={tx(`${tickers} 个`, `${tickers}`)} /><Metric label={tx('覆盖区间', 'Date range')} value={range ?? '—'} /></section>{chartRows.length >= 4 && <section className="history-chart"><div className="section-heading"><div><h2>{tx('分红来源', 'Dividend sources')}</h2><p>{tx('当前已加载记录 · 按到账金额排名', 'Loaded records · Ranked by amount received')}</p></div></div><BarList rows={chartRows} currency={currency} ariaLabel={tx('当前已加载分红记录按资产汇总', 'Loaded dividends grouped by asset')} /></section>}</>
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
  onHoldings,
  onInstrument,
  onNavigate,
}: {
  portfolio: PortfolioSnapshot
  hideBalances: boolean
  searchQuery: string
  onHoldings: () => void
  onInstrument: (position: Position) => void
  onNavigate: (page: Page) => void
}) {
  const currency = portfolio.account.currency
  const analytics = portfolio.analytics
  const [selectedTicker, setSelectedTicker] = useState<string>(() => portfolio.positions[0]?.instrument?.ticker ?? '')

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
              <span>{tx('24小时变动', 'LAST 24H')}</span>
              <strong className={analytics.unrealizedProfitLoss >= 0 ? 'tone-positive' : 'tone-negative'}>
                {hideBalances ? '••••' : signedMoney(analytics.unrealizedProfitLoss, currency)}
              </strong>
            </div>
            <div className="sub-metric-block">
              <span>{tx('收益率', 'RATE OF RETURN')}</span>
              <strong className={(analytics.unrealizedReturnPercent ?? 0) >= 0 ? 'tone-positive' : 'tone-negative'}>
                {percent(analytics.unrealizedReturnPercent)}
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
          <span><b>{analytics.positionCount}</b>{tx(' 个持仓', ' holdings')}</span>
          <span><b>{analytics.piePositionCount}</b>{tx(' 个 Pie 持仓', ' Pie holdings')}</span>
          <span><b>{plainPercent(analytics.availableCashWeightPercent)}</b>{tx(' 现金占比', ' cash')}</span>
          <span><b>{plainPercent(analytics.top3WeightPercent)}</b>{tx(' 前三大集中度', ' top 3 concentration')}</span>
          {analytics.reservedForOrders > 0 && <span><b>{hideBalances ? '••••' : money(analytics.reservedForOrders, currency)}</b>{tx(' 订单预留', ' reserved')}</span>}
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
                    <strong>{order.side === 'BUY' ? tx('买入', 'Buy') : tx('卖出', 'Sell')} {order.instrument?.name ?? order.ticker}</strong>
                    <small>{decimal(order.quantity, 4)} · {order.type === 'LIMIT' ? tx('限价单', 'Limit') : order.type === 'STOP' ? tx('止损单', 'Stop') : tx('市价单', 'Market')} · {order.limitPrice ? money(order.limitPrice, order.currency ?? currency) : tx('市价', 'Market')}</small>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* 资产配置：按市值面积显示，颜色表达收益方向 */}
        <section className="cockpit-treemap-section">
          <div className="pane-section-header">
            <div>
              <h3>{tx('资产配置', 'Asset allocation')}</h3>
              <p className="pane-section-sub">{tx('按持仓市值排序', 'Ranked by market value')}</p>
            </div>
          </div>
          <DynamicTreemapGrid
            allocation={portfolio.analytics.allocation}
            activeTicker={activePosition?.instrument?.ticker}
            onSelect={setSelectedTicker}
          />
          <button className="cockpit-see-all-btn" type="button" onClick={onHoldings}>
            {tx('查看全部', 'See all')}
            <span className="btn-orb" aria-hidden="true"><ArrowRight size={13} strokeWidth={2} /></span>
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
          <CockpitInstrumentView position={activePosition} accountCurrency={currency} portfolioTotal={analytics.totalValue} onSelect={onInstrument} />
        ) : (
          <div className="empty-inline">{tx('目前没有持仓', 'No holdings yet')}</div>
        )}

        <section className="cockpit-overview-holdings">
          <section className="cockpit-holdings-preview">
            <div className="section-heading">
              <h2>{tx('主要持仓', 'Top holdings')}</h2>
              <p>{tx('点击资产查看真实价格曲线、买卖点和交易历史', 'Select an asset to view its price chart, trade markers, and history')}</p>
            </div>
            <HoldingTable positions={filteredPositions} currency={currency} limit={6} compact selectedTicker={activePosition?.instrument?.ticker} onSelect={onInstrument} />
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
  return <section className="content-page help-page"><h1>{tx('帮助', 'Help')}</h1><p>{tx('Trading 212 连接是只读的。模型会看到工具返回的投资组合快照，但诊断信息不会包含凭据、持仓或金额。', 'The Trading 212 connection is read-only. The model can use portfolio snapshots returned by tools, while diagnostics exclude credentials, holdings, and values.')}</p><div className="help-list">{entries.map(([id, title, body]) => <article id={`help-${id}`} key={id}><h2>{title}</h2><p>{body}</p></article>)}</div><h2>{tx('在 dsh 中提问', 'Ask in dsh')}</h2><ul><li>{tx('总结我最大的三个持仓', 'Summarize my three largest holdings')}</li><li>{tx('我的组合有哪些货币敞口？', 'What currency exposure does my portfolio have?')}</li><li>{tx('哪些仓位正在拖累未实现收益？', 'Which positions are dragging down unrealized returns?')}</li></ul></section>
}

function DisconnectDialog({ pending, error, onCancel, onConfirm }: { pending: boolean; error?: ApiError; onCancel: () => void; onConfirm: () => void }) {
  return <div className="dialog-backdrop"><section className="confirm-dialog" role="dialog" aria-modal="true" aria-labelledby="disconnect-title"><Unplug strokeWidth={1.5} /><h2 id="disconnect-title">{tx('断开 Trading 212？', 'Disconnect Trading 212?')}</h2><p>{tx('这会停用当前连接并清除本次运行中的投资组合缓存。插件不会删除 Trading 212 网站上的密钥。', 'This disables the current connection and clears the in-memory portfolio cache. It does not delete the key on Trading 212.')}</p>{error && <ErrorPanel error={error} compact />}<div><button type="button" onClick={onCancel} disabled={pending}>{tx('取消', 'Cancel')}</button><button className="danger" type="button" onClick={onConfirm} disabled={pending}>{pending ? tx('正在断开…', 'Disconnecting…') : tx('确认断开', 'Disconnect')}</button></div></section></div>
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
  return <section className="content-page settings-page"><h1>{tx('设置', 'Settings')}</h1><LanguageSetting /><div className="settings-row"><div><span>{tx('连接状态', 'Connection')}</span><strong><i className="status-dot" />{tx('已连接', 'Connected')}</strong></div><div><span>{tx('环境', 'Environment')}</span><strong>{status.environment === 'live' ? 'Live' : 'Demo'}</strong></div><div><span>{tx('凭据来源', 'Credential source')}</span><strong>{status.source === 'record' ? tx('dsh 凭据记录', 'dsh credential record') : status.source === 'reference' ? tx('兼容凭据引用', 'Credential reference') : status.source}</strong></div></div>{status.writable ? <div className="settings-actions"><button type="button" onClick={() => setReconnect(true)}>{tx('更换密钥或环境', 'Change key or environment')}</button><button className="danger-outline" type="button" onClick={() => setConfirm(true)}>{tx('断开连接', 'Disconnect')}</button></div> : <div className="read-only-note"><ShieldCheck strokeWidth={1.5} /><span><strong>{tx('此连接由只读来源管理', 'This connection is managed by a read-only source')}</strong><br />{tx('请在环境变量或外部凭据配置中修改；插件不会覆盖它。', 'Change it in the environment or external credential configuration; the plugin will not overwrite it.')}</span></div>}{confirm && <DisconnectDialog pending={pending} error={error} onCancel={() => { if (!pending) { setConfirm(false); setError(undefined) } }} onConfirm={() => void disconnect()} />}</section>
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
    content = position ? <InstrumentDetailPage position={position} accountCurrency={portfolio.account.currency} onBack={() => onNavigate('holdings')} /> : <section className="content-page"><button className="back-button" type="button" onClick={() => onNavigate('holdings')}><ArrowLeft strokeWidth={1.5} />{tx('返回持仓', 'Back to holdings')}</button><div className="empty-state"><AlertTriangle strokeWidth={1.5} /><strong>{tx('找不到这项持仓', 'Holding not found')}</strong><span>{tx('刷新后该持仓可能已经变化。', 'It may have changed since the last refresh.')}</span></div></section>
  }
  else if (page === 'holdings') content = <section className="content-page"><h1>{tx('持仓', 'Holdings')}</h1><p>{tx(`${portfolio.positions.length} 个持仓 · 点击任意资产查看价格曲线和买卖历史`, `${portfolio.positions.length} holdings · Select an asset to view its price chart and trade history`)}</p>{error && <ErrorPanel error={error} status={status} onRetry={onRefresh} compact />}<HoldingTable positions={portfolio.positions} currency={portfolio.account.currency} onSelect={onInstrument} /></section>
  else content = <>{error && <ErrorPanel error={error} status={status} onRetry={onRefresh} compact />}<OverviewPage portfolio={portfolio} hideBalances={hideBalances} searchQuery={searchQuery} onHoldings={() => onNavigate('holdings')} onInstrument={onInstrument} onNavigate={onNavigate} /></>
  
  return <main className="workspace">{content}<footer className="legal">{tx('持仓和成交来自 Trading 212；个股历史价格来自 Yahoo Finance。仅供参考，不构成投资建议。', 'Holdings and trades come from Trading 212; historical prices come from Yahoo Finance. For information only, not investment advice.')}</footer></main>
}

export function App() {
  useSyncExternalStore(languageStore.subscribe, languageStore.getSnapshot)
  const [boot, setBoot] = useState<BootState>({ kind: 'loading' })
  const [page, setPage] = useState<Page>('overview')
  const [selectedTicker, setSelectedTicker] = useState<string>()
  const [portfolio, setPortfolio] = useState<PortfolioSnapshot>()
  const [portfolioError, setPortfolioError] = useState<ApiError>()
  const [loadingPortfolio, setLoadingPortfolio] = useState(false)
  const [hideBalances, setHideBalances] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')

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
  if (boot.kind === 'loading') return <div className="loading-screen"><Brand /><LoaderCircle strokeWidth={1.5} className="spin" /><span>{tx('正在读取连接状态…', 'Checking connection…')}</span></div>
  if (boot.kind === 'error') return <div className="fatal-screen"><Brand /><ErrorPanel error={boot.error} onRetry={() => void bootstrap()} /></div>

  const onConnected = (status: ConnectionStatus, snapshot: PortfolioSnapshot) => { setBoot({ kind: 'ready', status }); setPortfolio(snapshot); setPortfolioError(undefined); setPage('overview') }
  const onDisconnected = () => { setBoot({ kind: 'ready', status: { connected: false, environment: 'demo', writable: true, source: 'none' } }); setPortfolio(undefined); setPortfolioError(undefined); setPage('setup') }
  const navigate = (next: Page) => { if (next !== 'instrument') setSelectedTicker(undefined); setPage(next) }
  const openInstrument = (position: Position) => { setSelectedTicker(position.instrument?.ticker); setPage('instrument') }
  return (
    <div className="t212-native-app-root">
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
    </div>
  )
}
