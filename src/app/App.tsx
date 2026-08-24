import { Children, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import * as echarts from 'echarts/core'
import { LineChart, ScatterChart } from 'echarts/charts'
import { AriaComponent, DataZoomComponent, GridComponent, LegendComponent, TooltipComponent } from 'echarts/components'
import { CanvasRenderer } from 'echarts/renderers'
import type { EChartsCoreOption } from 'echarts/core'
import {
  AlertTriangle, ArrowLeft, ArrowRight, BarChart3, BriefcaseBusiness, Check, CircleDollarSign, CircleHelp, Clipboard, Eye, EyeOff,
  History as HistoryIcon, Layers3, LayoutDashboard, LoaderCircle, Menu, RefreshCw, Settings, ShieldCheck, Unplug, X,
} from 'lucide-react'
import { ApiError, api, diagnosticText } from './api.ts'
import { copyText } from './clipboard.ts'
import type { ConnectionStatus } from '../portfolio-service.ts'
import type { MarketRange, MarketSeries } from '../market-data.ts'
import type { CashTransaction, Dividend, HistoricalOrder, HistoryItem, HistoryKind, PortfolioSnapshot, Position, TradingEnvironment } from '../trading212.ts'

echarts.use([LineChart, ScatterChart, AriaComponent, DataZoomComponent, GridComponent, LegendComponent, TooltipComponent, CanvasRenderer])

type Page = 'overview' | 'holdings' | 'instrument' | 'history' | 'settings' | 'help' | 'setup'
type CopyStatus = 'idle' | 'copied' | 'failed'
type BootState = { kind: 'loading' } | { kind: 'error'; error: ApiError } | { kind: 'ready'; status: ConnectionStatus }

const money = (value: number | undefined, currency = 'EUR') => new Intl.NumberFormat('zh-CN', {
  style: 'currency', currency, maximumFractionDigits: 2,
}).format(value ?? 0)

const decimal = (value: number | undefined, maximumFractionDigits = 2) => new Intl.NumberFormat('zh-CN', {
  maximumFractionDigits,
}).format(value ?? 0)

const percent = (value: number | undefined, digits = 1) => value === undefined ? '—' : `${value >= 0 ? '+' : ''}${decimal(value, digits)}%`
const plainPercent = (value: number | undefined, digits = 1) => value === undefined ? '—' : `${decimal(value, digits)}%`
const tickerLabel = (ticker: string | undefined) => ticker?.replace(/_.*/, '') ?? '—'
const signedMoney = (value: number | undefined, currency: string) => `${(value ?? 0) >= 0 ? '+' : ''}${money(value, currency)}`

function Brand() {
  return <div className="brand" aria-label="dsh"><span>dsh</span><i /></div>
}

function Sidebar({ connected, active, onNavigate }: { connected: boolean; active: Page; onNavigate: (page: Page) => void }) {
  const [open, setOpen] = useState(false)
  const items = connected
    ? [[LayoutDashboard, 'overview', '概览'], [BriefcaseBusiness, 'holdings', '持仓'], [HistoryIcon, 'history', '历史'], [Settings, 'settings', '设置'], [CircleHelp, 'help', '帮助']] as const
    : [[BriefcaseBusiness, 'setup', '连接'], [CircleHelp, 'help', '帮助']] as const
  const navigate = (page: Page) => { onNavigate(page); setOpen(false) }
  return <aside className={`sidebar ${open ? 'menu-open' : ''}`}>
    <div className="side-head"><Brand /><span className="product-name">Trading 212</span><button className="menu-button" type="button" aria-label={open ? '关闭导航' : '打开导航'} aria-expanded={open} onClick={() => setOpen(value => !value)}>{open ? <X /> : <Menu />}</button></div>
    <nav aria-label="Trading 212 导航">
      {items.map(([Icon, page, label]) => <button key={page} className={active === page ? 'active' : ''} type="button" aria-current={active === page ? 'page' : undefined} onClick={() => navigate(page)}>
        <Icon size={20} strokeWidth={1.8} /><span>{label}</span>
      </button>)}
    </nav>
    <div className="side-note"><ShieldCheck /><span>只读连接<br /><small>不会执行交易</small></span></div>
  </aside>
}

function ErrorPanel({ error, status, onRetry, compact = false }: { error: ApiError; status?: ConnectionStatus; onRetry?: () => void; compact?: boolean }) {
  const [copyStatus, setCopyStatus] = useState<CopyStatus>('idle')
  const copy = async () => {
    try { await copyText(diagnosticText(error, status)); setCopyStatus('copied') }
    catch { setCopyStatus('failed') }
  }
  return <section className={compact ? 'error-panel compact' : 'error-panel'} role="alert" id={`help-${error.code.toLowerCase().replaceAll('_', '-')}`}>
    <strong>{error.message}</strong><p>{error.causeText}</p><p className="error-action">下一步：{error.action}</p>
    {error.retryAt && <small>可重试时间：{new Date(error.retryAt).toLocaleTimeString('zh-CN')}</small>}
    <div className="error-actions">{onRetry && <button type="button" onClick={onRetry}>重试</button>}<button type="button" onClick={() => void copy()}><Clipboard />{copyStatus === 'copied' ? '已复制诊断' : copyStatus === 'failed' ? '复制失败' : '复制诊断'}</button></div>
  </section>
}

function ConnectionForm({ onConnected, title = '连接你的 Trading 212' }: { onConnected: (status: ConnectionStatus, snapshot: PortfolioSnapshot) => void; title?: string }) {
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
    <div className="eyebrow"><ShieldCheck />只读访问</div><h1>{title}</h1><p>选择密钥所属环境，粘贴 Key 和只显示一次的 Secret。保存前会验证账户、持仓和待处理订单。</p>
    <form onSubmit={submit}>
      <fieldset><legend>账户环境</legend><div className="environment-options">
        <label className={environment === 'demo' ? 'selected' : ''}><input type="radio" name="environment" checked={environment === 'demo'} onChange={() => setEnvironment('demo')} /><span><b>Demo</b><small>模拟账户，推荐先测试</small></span></label>
        <label className={environment === 'live' ? 'selected live' : ''}><input type="radio" name="environment" checked={environment === 'live'} onChange={() => setEnvironment('live')} /><span><b>Live</b><small>真实账户的只读数据</small></span></label>
      </div></fieldset>
      <label className="field"><span>API Key</span><input autoComplete="off" value={apiKey} onChange={event => setApiKey(event.target.value)} required minLength={8} placeholder="粘贴 API Key" /></label>
      <label className="field"><span>API Secret</span><div className="secret-wrap"><input type={showSecret ? 'text' : 'password'} autoComplete="new-password" value={apiSecret} onChange={event => setApiSecret(event.target.value)} required minLength={8} placeholder="粘贴 API Secret" /><button type="button" aria-label={showSecret ? '隐藏 Secret' : '显示 Secret'} onClick={() => setShowSecret(value => !value)}>{showSecret ? <EyeOff /> : <Eye />}</button></div></label>
      <a className="help-link" href="https://helpcentre.trading212.com/hc/en-us/articles/14584770928157-How-can-I-generate-an-API-key" target="_blank" rel="noreferrer">查看 Trading 212 官方密钥说明 <ArrowRight /></a>
      {error && <ErrorPanel error={error} compact />}
      <button className="primary" type="submit" disabled={pending}>{pending ? <><LoaderCircle className="spin" />正在验证完整快照…</> : '测试并保存'}</button>
    </form>
    <div className="trust-list"><span><Check />凭据写入 dsh 凭据提供方</span><span><Check />浏览器不会保存 Key 或 Secret</span><span><Check />插件不注册任何下单工具</span></div>
  </section>
}

function SetupPage({ onConnected }: { onConnected: (status: ConnectionStatus, snapshot: PortfolioSnapshot) => void }) {
  return <main className="setup-page"><ConnectionForm onConnected={onConnected} /><aside className="setup-guide"><h2>创建密钥时请选择</h2><ol><li>账户摘要读取权限</li><li>投资组合读取权限</li><li>订单读取权限</li><li>历史数据读取权限</li></ol><p>不要授予下单、修改或取消订单权限。如果启用了 IP 限制，请允许当前运行 dsh 的设备。</p></aside></main>
}

const palette = ['#2764d8', '#4f7fe0', '#789be7', '#9fb7ed', '#c5d2ef', '#dce3ec']

function Allocation({ portfolio }: { portfolio: PortfolioSnapshot }) {
  const currency = portfolio.account.currency
  const source = portfolio.analytics.allocation
  if (source.length === 0) return <div className="empty-inline">目前没有持仓</div>
  const leading = source.slice(0, 5)
  const other = source.slice(5)
  const rows = other.length === 0 ? leading : [...leading, {
    ticker: 'other', name: `其他 ${other.length} 项`, instrumentCurrency: currency,
    currentValue: other.reduce((sum, item) => sum + item.currentValue, 0), totalCost: 0,
    unrealizedProfitLoss: 0, fxImpact: 0, weightPercent: other.reduce((sum, item) => sum + item.weightPercent, 0),
  }]
  return <div className="allocation" aria-label="持仓市值构成">
    <div className="allocation-track" role="img" aria-label={rows.map(item => `${item.name} ${plainPercent(item.weightPercent)}`).join('，')}>{rows.map((item, index) => <i key={item.ticker} style={{ width: `${Math.max(item.weightPercent, .4)}%`, background: palette[index] }} />)}</div>
    <div className="allocation-legend">{rows.map((item, index) => <span key={item.ticker}><i style={{ background: palette[index] }} /><b>{item.name}</b><em>{money(item.currentValue, currency)} · {plainPercent(item.weightPercent)}</em></span>)}</div>
  </div>
}

function BarList({ rows, currency, signed = false, ariaLabel }: { rows: Array<{ key: string; label: string; detail?: string; value: number }>; currency: string; signed?: boolean; ariaLabel: string }) {
  const max = Math.max(...rows.map(row => Math.abs(row.value)), 1)
  if (rows.length === 0) return <div className="empty-inline">暂无足够数据</div>
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
  return <BarList rows={rows} currency={portfolio.account.currency} signed ariaLabel="未实现盈亏贡献排名" />
}

function CurrencyExposureChart({ portfolio }: { portfolio: PortfolioSnapshot }) {
  const exposure = portfolio.analytics.currencyExposure.slice(0, 6)
  if (exposure.length < 4) return <div className="exposure-summary">{exposure.map(item => <div key={item.currency}><strong>{item.currency}</strong><span>{money(item.currentValue, portfolio.account.currency)}</span><small>{item.positions} 个持仓 · {plainPercent(item.weightPercent)}</small></div>)}</div>
  const rows = exposure.map(item => ({
    key: item.currency, label: item.currency, detail: `${item.positions} 个持仓 · ${plainPercent(item.weightPercent)}`, value: item.currentValue,
  }))
  return <BarList rows={rows} currency={portfolio.account.currency} ariaLabel="按标的交易币种划分的持仓市值" />
}

function HoldingTable({ positions, currency, limit, onSelect }: { positions: Position[]; currency: string; limit?: number; onSelect?: (position: Position) => void }) {
  const rows = [...positions].sort((a, b) => (b.walletImpact?.currentValue ?? 0) - (a.walletImpact?.currentValue ?? 0)).slice(0, limit)
  if (rows.length === 0) return <div className="empty-state"><BriefcaseBusiness /><strong>目前没有持仓</strong><span>现金和账户总价值仍会显示在概览中。</span></div>
  const invested = positions.reduce((sum, item) => sum + (item.walletImpact?.currentValue ?? 0), 0)
  return <div className="table-scroll"><table className="holdings-table"><thead><tr><th>资产</th><th>数量</th><th>均价 / 现价</th><th>成本</th><th>市值 / 权重</th><th>未实现收益</th><th>外汇影响</th></tr></thead><tbody>{rows.map((position, index) => {
    const value = position.walletImpact?.currentValue ?? 0
    const cost = position.walletImpact?.totalCost ?? 0
    const profit = position.walletImpact?.unrealizedProfitLoss ?? 0
    const fx = position.walletImpact?.fxImpact
    const label = position.instrument?.name ?? position.instrument?.ticker ?? '未知资产'
    return <tr key={position.instrument?.ticker ?? index}><td data-label="资产">{onSelect && position.instrument?.ticker ? <button className="asset-link" type="button" onClick={() => onSelect(position)}><strong>{label}</strong><small>{tickerLabel(position.instrument.ticker)} · 查看价格与买卖点 <ArrowRight /></small></button> : <><strong>{label}</strong><small>{tickerLabel(position.instrument?.ticker)} · {position.instrument?.currency ?? currency}</small></>}<small>{(position.quantityInPies ?? 0) > 0 ? `Pie ${decimal(position.quantityInPies, 4)}` : ''}</small></td><td data-label="数量">{decimal(position.quantity, 4)}<small>可交易 {decimal(position.quantityAvailableForTrading, 4)}</small></td><td data-label="均价 / 现价"><strong>{position.averagePricePaid === undefined ? '—' : money(position.averagePricePaid, position.instrument?.currency ?? currency)}</strong><small>{position.currentPrice === undefined ? '—' : money(position.currentPrice, position.instrument?.currency ?? currency)}</small></td><td data-label="成本">{money(cost, currency)}</td><td data-label="市值 / 权重"><strong>{money(value, currency)}</strong><small>{plainPercent(invested ? value / invested * 100 : 0)}</small></td><td data-label="未实现收益" className={profit >= 0 ? 'tone-positive' : 'tone-negative'}><strong>{signedMoney(profit, currency)}</strong><small>{percent(cost ? profit / cost * 100 : undefined)}</small></td><td data-label="外汇影响" className={(fx ?? 0) >= 0 ? 'tone-positive' : 'tone-negative'}>{fx === undefined ? '—' : signedMoney(fx, currency)}</td></tr>
  })}</tbody></table></div>
}

function PendingOrders({ orders, currency }: { orders: PortfolioSnapshot['pendingOrders']; currency: string }) {
  if (orders.length === 0) return <div className="empty-inline order-empty">没有待处理订单</div>
  return <div className="table-scroll"><table><thead><tr><th>资产与时间</th><th>方向 / 类型</th><th>数量</th><th>限价 / 止损</th><th>状态</th></tr></thead><tbody>{orders.map(order => <tr key={order.id}>
    <td data-label="资产与时间"><strong>{order.instrument?.name ?? order.ticker}</strong><small>{order.createdAt ? new Date(order.createdAt).toLocaleString('zh-CN') : tickerLabel(order.ticker)} · {order.initiatedFrom ?? '来源未知'}</small></td>
    <td data-label="方向 / 类型"><span className={`history-side ${order.side.toLowerCase()}`}>{order.side === 'BUY' ? '买入' : '卖出'}</span><small>{order.type}{order.extendedHours ? ' · 含延长交易时段' : ''}</small></td>
    <td data-label="数量">{decimal(order.quantity, 4)}<small>已成交 {decimal(order.filledQuantity, 4)}</small></td>
    <td data-label="限价 / 止损"><strong>{order.limitPrice === undefined ? '—' : money(order.limitPrice, order.instrument?.currency ?? order.currency ?? currency)}</strong><small>{order.stopPrice === undefined ? '—' : money(order.stopPrice, order.instrument?.currency ?? order.currency ?? currency)}</small></td>
    <td data-label="状态"><strong>{order.status}</strong><small>{order.timeInForce ?? order.strategy ?? '—'}</small></td>
  </tr>)}</tbody></table></div>
}

const historyLabels: Record<HistoryKind, string> = { orders: '历史订单', transactions: '资金流水', dividends: '分红' }
const transactionLabels: Record<string, string> = {
  WITHDRAW: '提现', DEPOSIT: '入金', FEE: '费用', TRANSFER: '转账',
  INTEREST_ON_FREE_CASH: '闲置现金利息', LENDING_INTEREST: '证券出借利息',
}

function HistoryRows({ kind, items }: { kind: HistoryKind; items: HistoryItem[] }) {
  if (items.length === 0) return <div className="empty-state"><HistoryIcon /><strong>没有{historyLabels[kind]}</strong><span>Trading 212 暂未返回这一类历史记录。</span></div>
  if (kind === 'orders') return <div className="table-scroll"><table><thead><tr><th>时间与资产</th><th>方向 / 状态</th><th>数量</th><th>成交价</th><th>净额</th></tr></thead><tbody>{Children.toArray((items as HistoricalOrder[]).map((item, index) => {
    const date = item.fill?.filledAt ?? item.order.createdAt
    const currency = item.fill?.walletImpact?.currency ?? item.order.instrument?.currency ?? 'EUR'
    return <tr key={`order:${item.order.id}:fill:${item.fill?.id ?? index}`}><td data-label="时间与资产"><strong>{item.order.instrument?.name ?? item.order.ticker}</strong><small>{date ? new Date(date).toLocaleString('zh-CN') : '时间未知'} · {item.order.ticker.replace(/_.*/, '')}</small></td><td data-label="方向 / 状态"><span className={`history-side ${item.order.side.toLowerCase()}`}>{item.order.side === 'BUY' ? '买入' : '卖出'}</span><small>{item.order.status}</small></td><td data-label="数量">{decimal(item.fill?.quantity ?? item.order.filledQuantity ?? item.order.quantity, 4)}</td><td data-label="成交价">{item.fill?.price === undefined ? '—' : money(item.fill.price, item.order.instrument?.currency ?? currency)}</td><td data-label="净额">{item.fill?.walletImpact?.netValue === undefined ? '—' : money(item.fill.walletImpact.netValue, currency)}</td></tr>
  }))}</tbody></table></div>
  if (kind === 'dividends') return <div className="table-scroll"><table><thead><tr><th>日期与资产</th><th>数量</th><th>每股</th><th>到账金额</th></tr></thead><tbody>{Children.toArray((items as Dividend[]).map(item => <tr key={item.reference}><td data-label="日期与资产"><strong>{item.instrument?.name ?? item.ticker}</strong><small>{new Date(item.paidOn).toLocaleDateString('zh-CN')} · {item.ticker.replace(/_.*/, '')}</small></td><td data-label="数量">{decimal(item.quantity, 4)}</td><td data-label="每股">{item.grossAmountPerShare === undefined ? '—' : decimal(item.grossAmountPerShare, 4)}</td><td data-label="到账金额" className="positive">+{money(item.amount, item.currency)}</td></tr>))}</tbody></table></div>
  return <div className="table-scroll"><table><thead><tr><th>时间与类型</th><th>编号</th><th>金额</th></tr></thead><tbody>{Children.toArray((items as CashTransaction[]).map(item => <tr key={item.reference}><td data-label="时间与类型"><strong>{transactionLabels[item.type] ?? item.type}</strong><small>{new Date(item.dateTime).toLocaleString('zh-CN')}</small></td><td data-label="编号"><span className="history-reference">{item.reference}</span></td><td data-label="金额" className={item.amount >= 0 ? 'positive' : 'negative'}>{item.amount >= 0 ? '+' : ''}{money(item.amount, item.currency)}</td></tr>))}</tbody></table></div>
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
  if (allPoints.length === 0) return <section className="trade-timeline"><div className="section-heading"><div><h2>成交价格时间线</h2><p>当前已加载记录没有可绘制的成交时间与价格。</p></div></div></section>

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
    <div className="timeline-header"><div className="section-heading"><h2 id="trade-timeline-title">成交价格时间线</h2><p>{selected?.name ?? tickerLabel(activeTicker)} · 当前已加载 {points.length} 个成交点 · 纵轴聚焦成交价格区间，不从零开始</p></div><label><span>股票</span><select value={activeTicker} onChange={event => setTicker(event.target.value)}>{options.map(option => <option key={option.ticker} value={option.ticker}>{option.name} · {tickerLabel(option.ticker)} ({option.count})</option>)}</select></label></div>
    <div className="timeline-legend"><span><i className="buy-marker" />买入</span><span><i className="sell-marker" />卖出</span><em>仅显示真实成交点，不是市场 K 线</em></div>
    {points.length === 1 ? <div className="single-trade"><strong>{formatPrice(points[0]!.price)}</strong><span>{points[0]!.side === 'BUY' ? '买入' : '卖出'} {decimal(points[0]!.quantity, 4)} 股</span><small>{new Date(points[0]!.filledAt).toLocaleString('zh-CN')}</small></div> : <div className="timeline-chart-scroll"><svg className="timeline-chart" viewBox={`0 0 ${width} ${height}`} role="img" aria-label={`${selected?.name ?? activeTicker} 的成交价格时间线，共 ${points.length} 个真实成交点`}>
      {yTicks.map((tick, index) => <g key={tick}><line x1={margin.left} x2={width - margin.right} y1={y(tick)} y2={y(tick)} className="timeline-grid" /><text x={margin.left - 10} y={y(tick) + 4} textAnchor="end" className="timeline-axis-label">{formatPrice(tick)}</text>{index === yTicks.length - 1 && <line x1={margin.left} x2={width - margin.right} y1={y(tick)} y2={y(tick)} className="timeline-axis" />}</g>)}
      <line x1={margin.left} x2={margin.left} y1={margin.top} y2={height - margin.bottom} className="timeline-axis" />
      <text x={margin.left} y={height - 15} textAnchor="start" className="timeline-axis-label">{new Date(minTime).toLocaleDateString('zh-CN')}</text>
      <text x={width - margin.right} y={height - 15} textAnchor="end" className="timeline-axis-label">{new Date(maxTime).toLocaleDateString('zh-CN')}</text>
      {points.map(point => <g key={point.key} className="timeline-point"><line x1={x(point.time)} x2={x(point.time)} y1={y(point.price)} y2={height - margin.bottom} className="timeline-stem" />{point.side === 'BUY' ? <circle cx={x(point.time)} cy={y(point.price)} r="6" className="timeline-buy"><title>{`买入 · ${new Date(point.filledAt).toLocaleString('zh-CN')} · ${formatPrice(point.price)} · ${decimal(point.quantity, 4)} 股`}</title></circle> : <polygon points={`${x(point.time)},${y(point.price) - 7} ${x(point.time) + 7},${y(point.price)} ${x(point.time)},${y(point.price) + 7} ${x(point.time) - 7},${y(point.price)}`} className="timeline-sell"><title>{`卖出 · ${new Date(point.filledAt).toLocaleString('zh-CN')} · ${formatPrice(point.price)} · ${decimal(point.quantity, 4)} 股`}</title></polygon>}</g>)}
    </svg></div>}
    <div className="timeline-events" aria-label="最近成交点">{latest.map(point => <div key={point.key}><i className={point.side === 'BUY' ? 'buy-marker' : 'sell-marker'} /><span><strong>{point.side === 'BUY' ? '买入' : '卖出'} {decimal(point.quantity, 4)} 股</strong><small>{new Date(point.filledAt).toLocaleString('zh-CN')}</small></span><b>{formatPrice(point.price)}</b></div>)}</div>
  </section>
}

const rangeLabels: Record<MarketRange, string> = { '1m': '1个月', '3m': '3个月', '1y': '1年', '5y': '5年' }

function PriceHistoryChart({ series, orders, name }: { series: MarketSeries; orders: HistoricalOrder[]; name: string }) {
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
    const option: EChartsCoreOption = {
      animation: typeof window.matchMedia !== 'function' || !window.matchMedia('(prefers-reduced-motion: reduce)').matches,
      aria: { enabled: true, decal: { show: false }, description: `${name} ${rangeLabels[series.range]}每日收盘价，叠加 Trading 212 买入与卖出成交点。` },
      color: ['#2764d8', '#2764d8', '#b46c19'],
      grid: { left: 72, right: 24, top: 42, bottom: 72, containLabel: false },
      legend: { top: 0, left: 0, itemWidth: 18, itemHeight: 9, textStyle: { color: '#687481', fontSize: 10 }, data: ['Yahoo 收盘价', '买入（圆形）', '卖出（菱形）'] },
      tooltip: {
        trigger: 'axis', renderMode: 'richText', confine: true, axisPointer: { type: 'cross', snap: false },
        formatter: (params: unknown) => {
          const rows = Array.isArray(params) ? params as Array<Record<string, unknown>> : []
          const firstRow = rows[0]
          const axisValue = typeof firstRow?.axisValue === 'number' ? firstRow.axisValue : Number(firstRow?.axisValue)
          const lines = Number.isFinite(axisValue) ? [new Date(axisValue).toLocaleString('zh-CN')] : []
          for (const row of rows) {
            const data = row.data as { value?: unknown[]; quantity?: number; filledAt?: string } | undefined
            const value = Array.isArray(data?.value) ? Number(data.value[1]) : Number(row.value)
            if (!Number.isFinite(value)) continue
            const seriesName = String(row.seriesName ?? '')
            lines.push(`${String(row.marker ?? '')}${seriesName}  ${formatPrice(value)}`)
            if (data?.quantity !== undefined) lines.push(`数量  ${decimal(data.quantity, 4)} 股${data.filledAt ? ` · ${new Date(data.filledAt).toLocaleTimeString('zh-CN')}` : ''}`)
          }
          return lines.join('\n')
        },
      },
      xAxis: { type: 'time', min: start, max: end, boundaryGap: false, axisLine: { show: true, lineStyle: { color: '#9ca8b4' } }, axisTick: { show: false }, axisLabel: { color: '#687481', fontSize: 10, hideOverlap: true }, splitLine: { show: false } },
      yAxis: { type: 'value', scale: true, axisLine: { show: true, lineStyle: { color: '#9ca8b4' } }, axisTick: { show: false }, axisLabel: { color: '#687481', fontSize: 10, formatter: (value: number) => formatPrice(value) }, splitLine: { show: true, lineStyle: { color: '#e8edf2' } } },
      dataZoom: [{ type: 'inside', filterMode: 'none', minSpan: 8 }, { type: 'slider', height: 20, bottom: 18, borderColor: '#dce2e8', fillerColor: 'rgba(39,100,216,.12)', handleStyle: { color: '#2764d8' }, textStyle: { color: '#687481', fontSize: 9 }, brushSelect: false }],
      series: [
        { name: 'Yahoo 收盘价', type: 'line', data: candles.map(item => [Date.parse(item.time), item.close]), showSymbol: false, sampling: 'lttb', smooth: false, lineStyle: { color: '#2764d8', width: 2.4 }, emphasis: { focus: 'series' }, z: 2 },
        { name: '买入（圆形）', type: 'scatter', data: buyData, symbol: 'circle', symbolSize: 12, itemStyle: { color: '#2764d8', borderColor: '#fff', borderWidth: 2 }, z: 5 },
        { name: '卖出（菱形）', type: 'scatter', data: sellData, symbol: 'diamond', symbolSize: 14, itemStyle: { color: '#b46c19', borderColor: '#fff', borderWidth: 2 }, z: 5 },
      ],
    }
    chart.setOption(option)
    const resize = typeof ResizeObserver === 'undefined' ? undefined : new ResizeObserver(() => chart.resize())
    resize?.observe(element)
    return () => { resize?.disconnect(); chart.dispose() }
  }, [candles, end, name, series.currency, series.range, start, trades])
  return <section className="price-chart-panel" aria-labelledby="price-chart-title">
    <div className="section-heading"><div><h2 id="price-chart-title">历史价格与买卖点</h2><p>{series.symbol} · 每日收盘价 · {new Date(start).toLocaleDateString('zh-CN')} – {new Date(end).toLocaleDateString('zh-CN')} · 纵轴聚焦价格区间</p></div><strong className={(change ?? 0) >= 0 ? 'tone-positive' : 'tone-negative'}>{money(last, series.currency)} <small>{percent(change)}</small></strong></div>
    <p className="chart-count">区间内 {trades.length} 个 Trading 212 成交点 · 可拖动底部滑块或双指缩放</p>
    <div ref={chartRef} className="price-chart" role="img" aria-label={`${name} ${rangeLabels[series.range]}历史价格曲线，包含 ${trades.length} 个买卖成交点`} />
    <div className="sr-only" aria-label="成交点明细">{trades.map(trade => <span key={trade.key}>{trade.side === 'BUY' ? '买入' : '卖出'}，{new Date(trade.filledAt).toLocaleString('zh-CN')}，成交价 {money(trade.price, series.currency)}，{decimal(trade.quantity, 4)} 股</span>)}</div>
    <p className="market-source">价格来源：Yahoo Finance（非官方接口，可能延迟或暂时不可用）；买卖点来源：Trading 212 真实成交记录。Yahoo 只接收公开的 ISIN/股票名称，不会收到你的 API 密钥、持仓数量或账户金额。</p>
  </section>
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
    <button className="back-button" type="button" onClick={onBack}><ArrowLeft />返回持仓</button>
    <div className="instrument-heading"><div><span>{tickerLabel(ticker)} · {position.instrument?.isin ?? 'ISIN 未提供'}</span><h1>{name}</h1><p>{decimal(position.quantity, 4)} 股 · 标的币种 {currency}</p></div><div><span>当前价格</span><strong>{money(position.currentPrice, currency)}</strong><small className={profit >= 0 ? 'tone-positive' : 'tone-negative'}>{signedMoney(profit, accountCurrency)} · {percent(cost ? profit / cost * 100 : undefined)}</small></div></div>
    <section className="instrument-metrics"><Metric label="平均买入价" value={position.averagePricePaid === undefined ? '—' : money(position.averagePricePaid, currency)} /><Metric label="持仓成本" value={money(cost, accountCurrency)} /><Metric label="当前市值" value={money(position.walletImpact?.currentValue, accountCurrency)} /><Metric label="可交易数量" value={decimal(position.quantityAvailableForTrading, 4)} /></section>
    <div className="range-switcher" aria-label="价格时间范围">{(Object.keys(rangeLabels) as MarketRange[]).map(value => <button type="button" key={value} className={range === value ? 'active' : ''} aria-pressed={range === value} onClick={() => setRange(value)}>{rangeLabels[value]}</button>)}</div>
    {marketError && <ErrorPanel error={marketError} onRetry={() => void loadMarket(range)} compact />}
    {marketLoading ? <div className="chart-loading"><LoaderCircle className="spin" />正在读取 Yahoo Finance 行情…</div> : series && <PriceHistoryChart series={series} orders={orders} name={name} />}
    <section className="instrument-history"><div className="section-heading"><div><h2>这只股票的买卖历史</h2><p>Trading 212 返回的真实成交记录 · 已加载 {orders.length} 笔</p></div></div>{historyError && <ErrorPanel error={historyError} onRetry={() => void loadHistory()} compact />}{historyLoading && orders.length === 0 ? <div className="history-loading"><LoaderCircle className="spin" />正在读取买卖历史…</div> : <HistoryRows kind="orders" items={orders} />}{cursor && <button className="load-more" type="button" disabled={historyLoading} onClick={() => void loadHistory(cursor, true)}>{historyLoading ? '正在加载…' : '加载更多'}</button>}</section>
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
    const chartRows = [...byAsset].map(([key, item]) => ({ key, label: item.label, detail: `${item.count} 笔`, value: item.value })).sort((a, b) => b.value - a.value).slice(0, 6)
    return <><section className="history-metrics"><Metric label="已加载记录" value={`${rows.length} 笔`} note="当前分页样本" /><Metric label="买入成交额" value={money(buys, currency)} /><Metric label="卖出成交额" value={money(sells, currency)} /><Metric label="已实现盈亏" value={signedMoney(realized, currency)} tone={realized >= 0 ? 'positive' : 'negative'} note={fees ? `税费 ${money(fees, currency)}` : undefined} /></section><TradeTimeline orders={rows} />{chartRows.length >= 4 && <section className="history-chart"><div className="section-heading"><div><h2>交易活跃资产</h2><p>当前已加载记录 · 按成交净额绝对值排名</p></div></div><BarList rows={chartRows} currency={currency} ariaLabel="当前已加载历史订单的交易活跃资产" /></section>}</>
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
    const chartRows = [...byType].map(([key, value]) => ({ key, label: transactionLabels[key] ?? key, value })).sort((a, b) => Math.abs(b.value) - Math.abs(a.value))
    return <><section className="history-metrics"><Metric label="已加载记录" value={`${rows.length} 笔`} note="当前分页样本" /><Metric label="流入" value={money(inflow, currency)} /><Metric label="流出" value={money(outflow, currency)} /><Metric label="净现金流" value={signedMoney(net, currency)} tone={net >= 0 ? 'positive' : 'negative'} note={interest ? `其中利息 ${signedMoney(interest, currency)}` : undefined} /></section>{chartRows.length >= 4 && <section className="history-chart"><div className="section-heading"><div><h2>资金流水构成</h2><p>当前已加载记录 · 按类型汇总</p></div></div><BarList rows={chartRows} currency={currency} signed ariaLabel="当前已加载资金流水按类型汇总" /></section>}</>
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
  const chartRows = [...byAsset].map(([key, item]) => ({ key, label: item.label, detail: `${item.count} 笔`, value: item.value })).sort((a, b) => b.value - a.value).slice(0, 6)
  const dates = rows.map(item => new Date(item.paidOn).getTime()).filter(Number.isFinite)
  const range = dates.length ? `${new Date(Math.min(...dates)).toLocaleDateString('zh-CN')} – ${new Date(Math.max(...dates)).toLocaleDateString('zh-CN')}` : undefined
  return <><section className="history-metrics"><Metric label="已加载记录" value={`${rows.length} 笔`} note="当前分页样本" /><Metric label="到账合计" value={money(total, currency)} /><Metric label="派息资产" value={`${tickers} 个`} /><Metric label="覆盖区间" value={range ?? '—'} /></section>{chartRows.length >= 4 && <section className="history-chart"><div className="section-heading"><div><h2>分红来源</h2><p>当前已加载记录 · 按到账金额排名</p></div></div><BarList rows={chartRows} currency={currency} ariaLabel="当前已加载分红记录按资产汇总" /></section>}</>
}

function Metric({ label, value, note, tone }: { label: string; value: string; note?: string; tone?: 'positive' | 'negative' }) {
  return <div className="metric-card"><span>{label}</span><strong className={tone === 'positive' ? 'tone-positive' : tone === 'negative' ? 'tone-negative' : ''}>{value}</strong>{note && <small>{note}</small>}</div>
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
  return <section className="content-page history-page"><h1>交易历史</h1><p>来自 Trading 212 的只读历史数据。汇总仅覆盖下方已经加载的记录，不代表账户全历史。</p>
    <div className="history-tabs" role="tablist" aria-label="历史记录类型">{(['orders', 'transactions', 'dividends'] as const).map(value => <button type="button" role="tab" aria-selected={kind === value} className={kind === value ? 'active' : ''} key={value} onClick={() => setKind(value)}>{historyLabels[value]}</button>)}</div>
    {error && <ErrorPanel error={error} onRetry={() => void load(kind)} compact />}
    {loading && loadedKind !== kind ? <div className="history-loading"><LoaderCircle className="spin" />正在读取{historyLabels[kind]}…</div> : loadedKind === kind && <><HistorySummary kind={kind} items={items} /><HistoryRows kind={kind} items={items} /></>}
    {cursor && <button className="load-more" type="button" disabled={loading} onClick={() => void load(kind, cursor, true)}>{loading ? '正在加载…' : '加载更多'}</button>}
  </section>
}

function OverviewPage({ portfolio, onHoldings, onInstrument, onCopyPrompt, copyStatus }: { portfolio: PortfolioSnapshot; onHoldings: () => void; onInstrument: (position: Position) => void; onCopyPrompt: () => void; copyStatus: CopyStatus }) {
  const currency = portfolio.account.currency
  const analytics = portfolio.analytics
  return <>
    <section className="hero-summary"><div><span className="hero-label">账户总价值 · {currency}</span><strong>{money(analytics.totalValue, currency)}</strong><p>{analytics.positionCount} 个持仓 · {portfolio.pendingOrders.length} 个待处理订单 · {analytics.piePositionCount} 个 Pie 内持仓</p></div><div className="hero-return"><span>账户摘要未实现收益</span><strong className={analytics.unrealizedProfitLoss >= 0 ? 'tone-positive' : 'tone-negative'}>{signedMoney(analytics.unrealizedProfitLoss, currency)}</strong><small>{percent(analytics.unrealizedReturnPercent)} · 成本基础 {money(analytics.totalCost, currency)}</small></div></section>
    <section className="metrics" aria-label="投资组合关键指标"><Metric label="已投资市值" value={money(analytics.investedValue, currency)} note={`占账户 ${plainPercent(analytics.investedWeightPercent)}`} /><Metric label="可用现金" value={money(analytics.availableCash, currency)} note={`占账户 ${plainPercent(analytics.availableCashWeightPercent)}`} /><Metric label="累计已实现盈亏" value={signedMoney(analytics.realizedProfitLoss, currency)} tone={analytics.realizedProfitLoss >= 0 ? 'positive' : 'negative'} /><Metric label="外汇影响" value={signedMoney(analytics.fxImpact, currency)} tone={analytics.fxImpact >= 0 ? 'positive' : 'negative'} /><Metric label="订单预留现金" value={money(analytics.reservedForOrders, currency)} note={portfolio.pendingOrders.length ? `${portfolio.pendingOrders.length} 个订单` : '没有待处理订单'} /></section>
    <section className="risk-strip" aria-label="组合集中度"><div><BarChart3 /><span><b>最大持仓</b><strong>{plainPercent(analytics.top1WeightPercent)}</strong></span></div><div><Layers3 /><span><b>前三大持仓</b><strong>{plainPercent(analytics.top3WeightPercent)}</strong></span></div><div><CircleDollarSign /><span><b>Pie 内现金</b><strong>{money(analytics.cashInPies, currency)}</strong></span></div>{analytics.top1WeightPercent >= 25 && <div className="risk-callout"><AlertTriangle /><span><b>集中度提示</b><small>单一持仓超过已投资市值的 25%</small></span></div>}</section>
    <div className="visual-grid"><section className="panel allocation-panel"><header><div><h2>持仓市值构成</h2><p>逐仓快照合计为 100% · 前五项与其他持仓</p></div></header><Allocation portfolio={portfolio} /></section><section className="panel"><header><div><h2>未实现盈亏贡献</h2><p>逐仓快照 · 按绝对影响排序 · 账户币种</p></div></header><ProfitDrivers portfolio={portfolio} /></section><section className="panel"><header><div><h2>标的交易币种暴露</h2><p>逐仓快照 · 不等同于净外汇风险</p></div></header><CurrencyExposureChart portfolio={portfolio} /></section></div>
    <section className="panel holdings-preview"><header><div><h2>主要持仓</h2><p>点击资产查看真实价格曲线、买卖点和交易历史</p></div><button type="button" onClick={onHoldings}>查看全部 <ArrowRight /></button></header><HoldingTable positions={portfolio.positions} currency={currency} limit={5} onSelect={onInstrument} /></section>
    <section className="panel pending-panel"><header><div><h2>待处理订单</h2><p>Trading 212 当前仍处于活动状态的订单</p></div></header><PendingOrders orders={portfolio.pendingOrders} currency={currency} /></section>
    <section className="ask-banner"><div><span>回到任意 dsh 对话直接提问</span><strong>请用我的 Trading 212 数据总结前三大持仓和集中度风险</strong></div><button type="button" onClick={onCopyPrompt}><Clipboard />{copyStatus === 'copied' ? '已复制' : copyStatus === 'failed' ? '复制失败' : '复制问题'}</button></section>
  </>
}

function HelpPage() {
  const entries = [
    ['invalid-credentials', '凭据被拒绝', '确认 Demo/Live 环境与密钥创建环境一致。Secret 丢失后必须重新创建密钥。'],
    ['missing-scope', '权限不足', '启用账户、投资组合和订单读取权限；不需要任何交易权限。'],
    ['history-permission', '历史记录不可用', '在 Trading 212 密钥中启用历史订单、分红和交易记录读取权限，然后在设置中重新连接。'],
    ['rate-limited', '请求频率受限', '等待错误中显示的时间后刷新。插件会保留同一连接的旧快照。'],
    ['status-unavailable', '插件状态不可用', '重启 dsh，确认插件安装在 web profile，然后重新打开。'],
    ['connection-read-only', '连接为只读来源', '在提供凭据的环境变量或外部配置中修改，插件不会覆盖遮蔽值。'],
    ['client-load-failed', '侧栏入口未加载', '重新安装准确版本的插件并完全重启 dsh。'],
  ]
  return <section className="content-page help-page"><h1>帮助</h1><p>Trading 212 连接是只读的。模型会看到工具返回的投资组合快照，但诊断信息不会包含凭据、持仓或金额。</p><div className="help-list">{entries.map(([id, title, body]) => <article id={`help-${id}`} key={id}><h2>{title}</h2><p>{body}</p></article>)}</div><h2>在 dsh 中提问</h2><ul><li>总结我最大的三个持仓</li><li>我的组合有哪些货币敞口？</li><li>哪些仓位正在拖累未实现收益？</li></ul></section>
}

function DisconnectDialog({ pending, error, onCancel, onConfirm }: { pending: boolean; error?: ApiError; onCancel: () => void; onConfirm: () => void }) {
  return <div className="dialog-backdrop"><section className="confirm-dialog" role="dialog" aria-modal="true" aria-labelledby="disconnect-title"><Unplug /><h2 id="disconnect-title">断开 Trading 212？</h2><p>这会停用当前连接并清除本次运行中的投资组合缓存。插件不会删除 Trading 212 网站上的密钥。</p>{error && <ErrorPanel error={error} compact />}<div><button type="button" onClick={onCancel} disabled={pending}>取消</button><button className="danger" type="button" onClick={onConfirm} disabled={pending}>{pending ? '正在断开…' : '确认断开'}</button></div></section></div>
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
  if (reconnect) return <section className="content-page"><button className="back-button" type="button" onClick={() => setReconnect(false)}>← 返回设置</button><ConnectionForm title="重新连接 Trading 212" onConnected={onConnected} /></section>
  return <section className="content-page settings-page"><h1>设置</h1><div className="settings-row"><div><span>连接状态</span><strong><i className="status-dot" />已连接</strong></div><div><span>环境</span><strong>{status.environment === 'live' ? 'Live' : 'Demo'}</strong></div><div><span>凭据来源</span><strong>{status.source === 'record' ? 'dsh 凭据记录' : status.source === 'reference' ? '兼容凭据引用' : status.source}</strong></div></div>{status.writable ? <div className="settings-actions"><button type="button" onClick={() => setReconnect(true)}>更换密钥或环境</button><button className="danger-outline" type="button" onClick={() => setConfirm(true)}>断开连接</button></div> : <div className="read-only-note"><ShieldCheck /><span><strong>此连接由只读来源管理</strong><br />请在环境变量或外部凭据配置中修改；插件不会覆盖它。</span></div>}{confirm && <DisconnectDialog pending={pending} error={error} onCancel={() => { if (!pending) { setConfirm(false); setError(undefined) } }} onConfirm={() => void disconnect()} />}</section>
}

function Workspace({ status, page, selectedTicker, portfolio, loading, error, onNavigate, onInstrument, onRefresh, onConnected, onDisconnected }: { status: ConnectionStatus; page: Page; selectedTicker?: string; portfolio?: PortfolioSnapshot; loading: boolean; error?: ApiError; onNavigate: (page: Page) => void; onInstrument: (position: Position) => void; onRefresh: () => void; onConnected: (status: ConnectionStatus, snapshot: PortfolioSnapshot) => void; onDisconnected: () => void }) {
  const [copyStatus, setCopyStatus] = useState<CopyStatus>('idle')
  const copyPrompt = async () => {
    try { await copyText('请用我的 Trading 212 数据总结前三大持仓和集中度风险'); setCopyStatus('copied') }
    catch { setCopyStatus('failed') }
  }
  let content: ReactNode
  if (page === 'help') content = <HelpPage />
  else if (page === 'settings') content = <SettingsPage status={status} onConnected={onConnected} onDisconnected={onDisconnected} />
  else if (page === 'history') content = <HistoryPage />
  else if (loading && portfolio === undefined) content = <div className="page-loading"><LoaderCircle className="spin" /><span>正在读取真实投资组合…</span></div>
  else if (portfolio === undefined && error !== undefined) content = <ErrorPanel error={error} status={status} onRetry={onRefresh} />
  else if (portfolio === undefined) content = null
  else if (page === 'instrument') {
    const position = portfolio.positions.find(item => item.instrument?.ticker === selectedTicker)
    content = position ? <InstrumentDetailPage position={position} accountCurrency={portfolio.account.currency} onBack={() => onNavigate('holdings')} /> : <section className="content-page"><button className="back-button" type="button" onClick={() => onNavigate('holdings')}><ArrowLeft />返回持仓</button><div className="empty-state"><AlertTriangle /><strong>找不到这项持仓</strong><span>刷新后该持仓可能已经变化。</span></div></section>
  }
  else if (page === 'holdings') content = <section className="content-page"><h1>持仓</h1><p>{portfolio.positions.length} 个持仓 · 点击任意资产查看价格曲线和买卖历史</p>{error && <ErrorPanel error={error} status={status} onRetry={onRefresh} compact />}<HoldingTable positions={portfolio.positions} currency={portfolio.account.currency} onSelect={onInstrument} /></section>
  else content = <>{error && <ErrorPanel error={error} status={status} onRetry={onRefresh} compact />}<OverviewPage portfolio={portfolio} onHoldings={() => onNavigate('holdings')} onInstrument={onInstrument} onCopyPrompt={() => void copyPrompt()} copyStatus={copyStatus} />{copyStatus !== 'idle' && <div className={`toast ${copyStatus === 'failed' ? 'failed' : ''}`} role="status">{copyStatus === 'copied' ? '问题已复制，可粘贴到 dsh 对话' : '系统剪贴板不可用，请手动选择问题文字'}</div>}</>
  const title = page === 'overview' ? 'Trading 212 投资组合' : page === 'holdings' ? '全部持仓' : page === 'instrument' ? '个股详情' : page === 'history' ? '交易历史' : page === 'settings' ? '连接设置' : '帮助与支持'
  return <main className="workspace"><header className="workspace-header"><div><h1>{title}</h1>{portfolio && <p><i className="status-dot" />{portfolio.stale ? `旧数据：${portfolio.staleReason}` : `更新于 ${new Date(portfolio.fetchedAt).toLocaleString('zh-CN')}`} · {status.environment === 'live' ? 'Live' : 'Demo'}</p>}</div>{(page === 'overview' || page === 'holdings') && <button className="refresh-button" type="button" onClick={onRefresh} disabled={loading}><RefreshCw className={loading ? 'spin' : ''} />刷新</button>}</header>{content}<footer className="legal">持仓和成交来自 Trading 212；个股历史价格来自 Yahoo Finance。仅供参考，不构成投资建议。</footer></main>
}

export function App() {
  const [boot, setBoot] = useState<BootState>({ kind: 'loading' })
  const [page, setPage] = useState<Page>('overview')
  const [selectedTicker, setSelectedTicker] = useState<string>()
  const [portfolio, setPortfolio] = useState<PortfolioSnapshot>()
  const [portfolioError, setPortfolioError] = useState<ApiError>()
  const [loadingPortfolio, setLoadingPortfolio] = useState(false)

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
  if (boot.kind === 'loading') return <div className="loading-screen"><Brand /><LoaderCircle className="spin" /><span>正在读取连接状态…</span></div>
  if (boot.kind === 'error') return <div className="fatal-screen"><Brand /><ErrorPanel error={boot.error} onRetry={() => void bootstrap()} /></div>

  const onConnected = (status: ConnectionStatus, snapshot: PortfolioSnapshot) => { setBoot({ kind: 'ready', status }); setPortfolio(snapshot); setPortfolioError(undefined); setPage('overview') }
  const onDisconnected = () => { setBoot({ kind: 'ready', status: { connected: false, environment: 'demo', writable: true, source: 'none' } }); setPortfolio(undefined); setPortfolioError(undefined); setPage('setup') }
  const navigate = (next: Page) => { if (next !== 'instrument') setSelectedTicker(undefined); setPage(next) }
  const openInstrument = (position: Position) => { setSelectedTicker(position.instrument?.ticker); setPage('instrument') }
  return <div className="app-shell"><Sidebar connected={boot.status.connected} active={activePage === 'instrument' ? 'holdings' : activePage} onNavigate={navigate} />{boot.status.connected ? <Workspace status={boot.status} page={activePage} selectedTicker={selectedTicker} portfolio={portfolio} loading={loadingPortfolio} error={portfolioError} onNavigate={navigate} onInstrument={openInstrument} onRefresh={() => void loadPortfolio(true)} onConnected={onConnected} onDisconnected={onDisconnected} /> : activePage === 'help' ? <main className="workspace"><HelpPage /></main> : <SetupPage onConnected={onConnected} />}</div>
}
