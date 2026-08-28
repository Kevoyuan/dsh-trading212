export type TradingEnvironment = 'demo' | 'live'

export interface Trading212Credentials {
  apiKey: string
  apiSecret: string
  environment: TradingEnvironment
}

export interface AccountSummary {
  id?: number
  currency: string
  totalValue: number
  cash?: { availableToTrade?: number; inPies?: number; reservedForOrders?: number }
  investments?: { currentValue?: number; realizedProfitLoss?: number; totalCost?: number; unrealizedProfitLoss?: number }
}

export interface Position {
  averagePricePaid?: number
  createdAt?: string
  currentPrice?: number
  quantity: number
  quantityAvailableForTrading?: number
  quantityInPies?: number
  instrument?: { currency?: string; isin?: string; name?: string; ticker?: string }
  walletImpact?: { currency?: string; currentValue?: number; fxImpact?: number; totalCost?: number; unrealizedProfitLoss?: number }
}

export interface PendingOrder {
  id: number
  ticker: string
  side: 'BUY' | 'SELL'
  status: string
  type: string
  quantity?: number
  filledQuantity?: number
  filledValue?: number
  value?: number
  currency?: string
  extendedHours?: boolean
  initiatedFrom?: string
  strategy?: string
  timeInForce?: string
  limitPrice?: number
  stopPrice?: number
  createdAt?: string
  instrument?: Position['instrument']
}

export interface PortfolioSnapshot {
  environment: TradingEnvironment
  fetchedAt: string
  account: AccountSummary
  positions: Position[]
  pendingOrders: PendingOrder[]
  analytics: PortfolioAnalytics
  stale?: boolean
  staleReason?: string
}

export interface PortfolioAllocation {
  ticker: string
  name: string
  instrumentCurrency: string
  currentValue: number
  totalCost: number
  unrealizedProfitLoss: number
  fxImpact: number
  weightPercent: number
  returnPercent?: number
}

export interface CurrencyExposure {
  currency: string
  currentValue: number
  weightPercent: number
  positions: number
}

export interface PortfolioAnalytics {
  currency: string
  totalValue: number
  investedValue: number
  positionMarketValue: number
  totalCost: number
  availableCash: number
  cashInPies: number
  reservedForOrders: number
  unrealizedProfitLoss: number
  positionUnrealizedProfitLoss: number
  realizedProfitLoss: number
  fxImpact: number
  unrealizedReturnPercent?: number
  investedWeightPercent?: number
  availableCashWeightPercent?: number
  top1WeightPercent: number
  top3WeightPercent: number
  positionCount: number
  piePositionCount: number
  allocation: PortfolioAllocation[]
  currencyExposure: CurrencyExposure[]
}

export type HistoryKind = 'orders' | 'dividends' | 'transactions'

export interface HistoricalOrder {
  order: PendingOrder
  fill?: {
    filledAt?: string
    id?: number
    price?: number
    quantity?: number
    tradingMethod?: string
    type?: string
    walletImpact?: {
      currency?: string
      fxRate?: number
      netValue?: number
      realisedProfitLoss?: number
      taxes?: Array<{ chargedAt?: string; currency?: string; name?: string; quantity?: number }>
    }
  }
}

export interface Dividend {
  amount: number
  amountInEuro?: number
  currency: string
  paidOn: string
  reference: string
  ticker: string
  quantity?: number
  grossAmountPerShare?: number
  tickerCurrency?: string
  instrument?: Position['instrument']
  type?: string
}

export interface CashTransaction {
  amount: number
  currency: string
  dateTime: string
  reference: string
  type: string
}

export type HistoryItem = HistoricalOrder | Dividend | CashTransaction

export interface HistoryPage {
  kind: HistoryKind
  items: HistoryItem[]
  nextCursor?: string
}

export class Trading212Error extends Error {
  constructor(message: string, readonly status: number, readonly retryAfter?: string) {
    super(message)
    this.name = 'Trading212Error'
  }
}

function record(value: unknown, path: string): Record<string, unknown> {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) throw new Trading212Error(`${path} must be an object`, 502)
  return value as Record<string, unknown>
}

function requiredText(value: unknown, path: string): string {
  if (typeof value !== 'string' || value.trim() === '') throw new Trading212Error(`${path} must be a non-empty string`, 502)
  return value
}

function finite(value: unknown, path: string): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) throw new Trading212Error(`${path} must be a finite number`, 502)
  return value
}

function optionalFinite(value: unknown, path: string): number | undefined {
  return value === undefined || value === null ? undefined : finite(value, path)
}

function optionalText(value: unknown, path: string): string | undefined {
  if (value === undefined || value === null) return undefined
  if (typeof value !== 'string') throw new Trading212Error(`${path} must be a string`, 502)
  return value
}

function optionalBoolean(value: unknown, path: string): boolean | undefined {
  if (value === undefined || value === null) return undefined
  if (typeof value !== 'boolean') throw new Trading212Error(`${path} must be a boolean`, 502)
  return value
}

function parseInstrument(value: unknown, path: string): Position['instrument'] {
  if (value === undefined || value === null) return undefined
  const item = record(value, path)
  return {
    currency: optionalText(item.currency, `${path}.currency`),
    isin: optionalText(item.isin, `${path}.isin`),
    name: optionalText(item.name, `${path}.name`),
    ticker: optionalText(item.ticker, `${path}.ticker`),
  }
}

export function parseAccountSummary(value: unknown): AccountSummary {
  const account = record(value, 'account')
  const cash = account.cash === undefined || account.cash === null ? undefined : record(account.cash, 'account.cash')
  const investments = account.investments === undefined || account.investments === null ? undefined : record(account.investments, 'account.investments')
  return {
    id: optionalFinite(account.id, 'account.id'),
    currency: requiredText(account.currency, 'account.currency'),
    totalValue: finite(account.totalValue, 'account.totalValue'),
    cash: cash === undefined ? undefined : {
      availableToTrade: optionalFinite(cash.availableToTrade, 'account.cash.availableToTrade'),
      inPies: optionalFinite(cash.inPies, 'account.cash.inPies'),
      reservedForOrders: optionalFinite(cash.reservedForOrders, 'account.cash.reservedForOrders'),
    },
    investments: investments === undefined ? undefined : {
      currentValue: optionalFinite(investments.currentValue, 'account.investments.currentValue'),
      realizedProfitLoss: optionalFinite(investments.realizedProfitLoss, 'account.investments.realizedProfitLoss'),
      totalCost: optionalFinite(investments.totalCost, 'account.investments.totalCost'),
      unrealizedProfitLoss: optionalFinite(investments.unrealizedProfitLoss, 'account.investments.unrealizedProfitLoss'),
    },
  }
}

export function parsePositions(value: unknown): Position[] {
  if (!Array.isArray(value)) throw new Trading212Error('positions must be an array', 502)
  return value.map((raw, index) => {
    const path = `positions[${index}]`
    const item = record(raw, path)
    const wallet = item.walletImpact === undefined || item.walletImpact === null ? undefined : record(item.walletImpact, `${path}.walletImpact`)
    return {
      averagePricePaid: optionalFinite(item.averagePricePaid, `${path}.averagePricePaid`),
      createdAt: optionalText(item.createdAt, `${path}.createdAt`),
      currentPrice: optionalFinite(item.currentPrice, `${path}.currentPrice`),
      quantity: finite(item.quantity, `${path}.quantity`),
      quantityAvailableForTrading: optionalFinite(item.quantityAvailableForTrading, `${path}.quantityAvailableForTrading`),
      quantityInPies: optionalFinite(item.quantityInPies, `${path}.quantityInPies`),
      instrument: parseInstrument(item.instrument, `${path}.instrument`),
      walletImpact: wallet === undefined ? undefined : {
        currency: optionalText(wallet.currency, `${path}.walletImpact.currency`),
        currentValue: optionalFinite(wallet.currentValue, `${path}.walletImpact.currentValue`),
        fxImpact: optionalFinite(wallet.fxImpact, `${path}.walletImpact.fxImpact`),
        totalCost: optionalFinite(wallet.totalCost, `${path}.walletImpact.totalCost`),
        unrealizedProfitLoss: optionalFinite(wallet.unrealizedProfitLoss, `${path}.walletImpact.unrealizedProfitLoss`),
      },
    }
  })
}

export function parsePendingOrders(value: unknown): PendingOrder[] {
  if (!Array.isArray(value)) throw new Trading212Error('pendingOrders must be an array', 502)
  return value.map((raw, index) => {
    const path = `pendingOrders[${index}]`
    const item = record(raw, path)
    const side = requiredText(item.side, `${path}.side`)
    if (side !== 'BUY' && side !== 'SELL') throw new Trading212Error(`${path}.side is invalid`, 502)
    return {
      id: finite(item.id, `${path}.id`),
      ticker: requiredText(item.ticker, `${path}.ticker`),
      side,
      status: requiredText(item.status, `${path}.status`),
      type: requiredText(item.type, `${path}.type`),
      quantity: optionalFinite(item.quantity, `${path}.quantity`),
      filledQuantity: optionalFinite(item.filledQuantity, `${path}.filledQuantity`),
      filledValue: optionalFinite(item.filledValue, `${path}.filledValue`),
      value: optionalFinite(item.value, `${path}.value`),
      currency: optionalText(item.currency, `${path}.currency`),
      extendedHours: optionalBoolean(item.extendedHours, `${path}.extendedHours`),
      initiatedFrom: optionalText(item.initiatedFrom, `${path}.initiatedFrom`),
      strategy: optionalText(item.strategy, `${path}.strategy`),
      timeInForce: optionalText(item.timeInForce, `${path}.timeInForce`),
      limitPrice: optionalFinite(item.limitPrice, `${path}.limitPrice`),
      stopPrice: optionalFinite(item.stopPrice, `${path}.stopPrice`),
      createdAt: optionalText(item.createdAt, `${path}.createdAt`),
      instrument: parseInstrument(item.instrument, `${path}.instrument`),
    }
  })
}

function parseOrder(item: Record<string, unknown>, path: string): PendingOrder {
  const side = requiredText(item.side, `${path}.side`)
  if (side !== 'BUY' && side !== 'SELL') throw new Trading212Error(`${path}.side is invalid`, 502)
  return {
    id: finite(item.id, `${path}.id`),
    ticker: requiredText(item.ticker, `${path}.ticker`),
    side,
    status: requiredText(item.status, `${path}.status`),
    type: requiredText(item.type, `${path}.type`),
    quantity: optionalFinite(item.quantity, `${path}.quantity`),
    filledQuantity: optionalFinite(item.filledQuantity, `${path}.filledQuantity`),
    filledValue: optionalFinite(item.filledValue, `${path}.filledValue`),
    value: optionalFinite(item.value, `${path}.value`),
    currency: optionalText(item.currency, `${path}.currency`),
    extendedHours: optionalBoolean(item.extendedHours, `${path}.extendedHours`),
    initiatedFrom: optionalText(item.initiatedFrom, `${path}.initiatedFrom`),
    strategy: optionalText(item.strategy, `${path}.strategy`),
    timeInForce: optionalText(item.timeInForce, `${path}.timeInForce`),
    limitPrice: optionalFinite(item.limitPrice, `${path}.limitPrice`),
    stopPrice: optionalFinite(item.stopPrice, `${path}.stopPrice`),
    createdAt: optionalText(item.createdAt, `${path}.createdAt`),
    instrument: parseInstrument(item.instrument, `${path}.instrument`),
  }
}

function nextCursor(value: unknown, kind: HistoryKind): string | undefined {
  if (value === undefined || value === null || value === '') return undefined
  const path = requiredText(value, 'history.nextPagePath')
  let url: URL
  try { url = new URL(path, 'https://history.invalid') } catch { throw new Trading212Error('history.nextPagePath is invalid', 502) }
  if (url.pathname !== `/api/v0/equity/history/${kind}`) throw new Trading212Error('history.nextPagePath points to an unexpected endpoint', 502)
  const cursor = url.searchParams.get('cursor')
  if (cursor === null || cursor.length === 0 || cursor.length > 512) throw new Trading212Error('history.nextPagePath has no valid cursor', 502)
  return cursor
}

export function parseHistoryPage(value: unknown, kind: HistoryKind): HistoryPage {
  const page = record(value, 'history')
  if (!Array.isArray(page.items)) throw new Trading212Error('history.items must be an array', 502)
  const items: HistoryItem[] = page.items.map((raw, index) => {
    const itemPath = `history.items[${index}]`
    const item = record(raw, itemPath)
    if (kind === 'orders') {
      const order = parseOrder(record(item.order, `${itemPath}.order`), `${itemPath}.order`)
      if (item.fill === undefined || item.fill === null) return { order }
      const fill = record(item.fill, `${itemPath}.fill`)
      const wallet = fill.walletImpact === undefined || fill.walletImpact === null ? undefined : record(fill.walletImpact, `${itemPath}.fill.walletImpact`)
      const taxes = wallet?.taxes === undefined || wallet.taxes === null ? undefined : wallet.taxes
      if (taxes !== undefined && !Array.isArray(taxes)) throw new Trading212Error(`${itemPath}.fill.walletImpact.taxes must be an array`, 502)
      return { order, fill: {
        filledAt: optionalText(fill.filledAt, `${itemPath}.fill.filledAt`),
        id: optionalFinite(fill.id, `${itemPath}.fill.id`),
        price: optionalFinite(fill.price, `${itemPath}.fill.price`),
        quantity: optionalFinite(fill.quantity, `${itemPath}.fill.quantity`),
        tradingMethod: optionalText(fill.tradingMethod, `${itemPath}.fill.tradingMethod`),
        type: optionalText(fill.type, `${itemPath}.fill.type`),
        walletImpact: wallet === undefined ? undefined : {
          currency: optionalText(wallet.currency, `${itemPath}.fill.walletImpact.currency`),
          fxRate: optionalFinite(wallet.fxRate, `${itemPath}.fill.walletImpact.fxRate`),
          netValue: optionalFinite(wallet.netValue, `${itemPath}.fill.walletImpact.netValue`),
          realisedProfitLoss: optionalFinite(wallet.realisedProfitLoss, `${itemPath}.fill.walletImpact.realisedProfitLoss`),
          taxes: taxes?.map((rawTax, taxIndex) => {
            const taxPath = `${itemPath}.fill.walletImpact.taxes[${taxIndex}]`
            const tax = record(rawTax, taxPath)
            return {
              chargedAt: optionalText(tax.chargedAt, `${taxPath}.chargedAt`),
              currency: optionalText(tax.currency, `${taxPath}.currency`),
              name: optionalText(tax.name, `${taxPath}.name`),
              quantity: optionalFinite(tax.quantity, `${taxPath}.quantity`),
            }
          }),
        },
      } }
    }
    if (kind === 'dividends') return {
      amount: finite(item.amount, `${itemPath}.amount`),
      amountInEuro: optionalFinite(item.amountInEuro, `${itemPath}.amountInEuro`),
      currency: requiredText(item.currency, `${itemPath}.currency`),
      paidOn: requiredText(item.paidOn, `${itemPath}.paidOn`),
      reference: requiredText(item.reference, `${itemPath}.reference`),
      ticker: requiredText(item.ticker, `${itemPath}.ticker`),
      quantity: optionalFinite(item.quantity, `${itemPath}.quantity`),
      grossAmountPerShare: optionalFinite(item.grossAmountPerShare, `${itemPath}.grossAmountPerShare`),
      tickerCurrency: optionalText(item.tickerCurrency, `${itemPath}.tickerCurrency`),
      instrument: parseInstrument(item.instrument, `${itemPath}.instrument`),
      type: optionalText(item.type, `${itemPath}.type`),
    }
    return {
      amount: finite(item.amount, `${itemPath}.amount`),
      currency: requiredText(item.currency, `${itemPath}.currency`),
      dateTime: requiredText(item.dateTime, `${itemPath}.dateTime`),
      reference: requiredText(item.reference, `${itemPath}.reference`),
      type: requiredText(item.type, `${itemPath}.type`),
    }
  })
  return { kind, items, nextCursor: nextCursor(page.nextPagePath, kind) }
}

export class Trading212Client {
  constructor(
    private readonly credentials: Trading212Credentials,
    private readonly timeoutMs = 15_000,
    private readonly fetchImpl: typeof fetch = fetch,
    private readonly userAgent = 'dsh-trading212/0.8.0',
  ) {}

  private get baseUrl(): string {
    return this.credentials.environment === 'live' ? 'https://live.trading212.com/api/v0' : 'https://demo.trading212.com/api/v0'
  }

  async request(path: string, signal?: AbortSignal): Promise<unknown> {
    const controller = new AbortController()
    const abort = () => controller.abort()
    signal?.addEventListener('abort', abort, { once: true })
    let timedOut = false
    const timer = setTimeout(() => { timedOut = true; abort() }, this.timeoutMs)
    try {
      const token = Buffer.from(`${this.credentials.apiKey}:${this.credentials.apiSecret}`, 'utf8').toString('base64')
      const response = await this.fetchImpl(`${this.baseUrl}${path}`, {
        headers: { Accept: 'application/json', Authorization: `Basic ${token}`, 'User-Agent': this.userAgent },
        signal: controller.signal,
      })
      if (!response.ok) throw new Trading212Error(`Trading 212 returned HTTP ${response.status}`, response.status, response.headers.get('retry-after') ?? undefined)
      try {
        return await response.json() as unknown
      } catch {
        throw new Trading212Error('Trading 212 returned invalid JSON', 502)
      }
    } catch (error) {
      if (error instanceof Trading212Error) throw error
      if (signal?.aborted) throw signal.reason instanceof Error ? signal.reason : new DOMException('The operation was aborted', 'AbortError')
      if (timedOut || (error instanceof Error && error.name === 'AbortError')) throw new Trading212Error('Trading 212 request timed out', 408)
      throw new Trading212Error('Trading 212 request failed', 503)
    } finally {
      clearTimeout(timer)
      signal?.removeEventListener('abort', abort)
    }
  }

  async accountSummary(signal?: AbortSignal): Promise<AccountSummary> {
    return parseAccountSummary(await this.request('/equity/account/summary', signal))
  }

  async positions(signal?: AbortSignal): Promise<Position[]> {
    return parsePositions(await this.request('/equity/positions', signal))
  }

  async pendingOrders(signal?: AbortSignal): Promise<PendingOrder[]> {
    return parsePendingOrders(await this.request('/equity/orders', signal))
  }

  async history(kind: HistoryKind, cursor?: string, signal?: AbortSignal, ticker?: string): Promise<HistoryPage> {
    const query = new URLSearchParams({ limit: '50' })
    if (cursor !== undefined) query.set('cursor', cursor)
    if (ticker !== undefined) query.set('ticker', ticker)
    return parseHistoryPage(await this.request(`/equity/history/${kind}?${query}`, signal), kind)
  }

  async portfolioSnapshot(signal?: AbortSignal): Promise<PortfolioSnapshot> {
    const [account, positions, pendingOrders] = await Promise.all([
      this.accountSummary(signal), this.positions(signal), this.pendingOrders(signal),
    ])
    return {
      environment: this.credentials.environment,
      fetchedAt: new Date().toISOString(),
      account,
      positions,
      pendingOrders,
      analytics: analyzePortfolio(account, positions),
    }
  }
}

const percentage = (part: number, whole: number): number | undefined => whole === 0 ? undefined : part / whole * 100

export function analyzePortfolio(account: AccountSummary, positions: Position[]): PortfolioAnalytics {
  const positionMarketValue = positions.reduce((sum, item) => sum + (item.walletImpact?.currentValue ?? 0), 0)
  const positionUnrealizedProfitLoss = positions.reduce((sum, item) => sum + (item.walletImpact?.unrealizedProfitLoss ?? 0), 0)
  const investedValue = account.investments?.currentValue ?? positionMarketValue
  const totalCost = account.investments?.totalCost ?? positions.reduce((sum, item) => sum + (item.walletImpact?.totalCost ?? 0), 0)
  const unrealizedProfitLoss = account.investments?.unrealizedProfitLoss ?? positions.reduce((sum, item) => sum + (item.walletImpact?.unrealizedProfitLoss ?? 0), 0)
  const allocation = positions.map((item, index): PortfolioAllocation => {
    const currentValue = item.walletImpact?.currentValue ?? 0
    const cost = item.walletImpact?.totalCost ?? 0
    return {
      ticker: item.instrument?.ticker ?? `position-${index + 1}`,
      name: item.instrument?.name ?? item.instrument?.ticker ?? '未知资产',
      instrumentCurrency: item.instrument?.currency ?? account.currency,
      currentValue,
      totalCost: cost,
      unrealizedProfitLoss: item.walletImpact?.unrealizedProfitLoss ?? currentValue - cost,
      fxImpact: item.walletImpact?.fxImpact ?? 0,
      weightPercent: percentage(currentValue, positionMarketValue) ?? 0,
      returnPercent: percentage(item.walletImpact?.unrealizedProfitLoss ?? currentValue - cost, cost),
    }
  }).sort((a, b) => b.currentValue - a.currentValue)
  const exposureMap = new Map<string, { currentValue: number; positions: number }>()
  for (const item of allocation) {
    const current = exposureMap.get(item.instrumentCurrency) ?? { currentValue: 0, positions: 0 }
    exposureMap.set(item.instrumentCurrency, { currentValue: current.currentValue + item.currentValue, positions: current.positions + 1 })
  }
  const currencyExposure = [...exposureMap].map(([currency, value]): CurrencyExposure => ({
    currency,
    currentValue: value.currentValue,
    weightPercent: percentage(value.currentValue, positionMarketValue) ?? 0,
    positions: value.positions,
  })).sort((a, b) => b.currentValue - a.currentValue)
  return {
    currency: account.currency,
    totalValue: account.totalValue,
    investedValue,
    positionMarketValue,
    totalCost,
    availableCash: account.cash?.availableToTrade ?? 0,
    cashInPies: account.cash?.inPies ?? 0,
    reservedForOrders: account.cash?.reservedForOrders ?? 0,
    unrealizedProfitLoss,
    positionUnrealizedProfitLoss,
    realizedProfitLoss: account.investments?.realizedProfitLoss ?? 0,
    fxImpact: positions.reduce((sum, item) => sum + (item.walletImpact?.fxImpact ?? 0), 0),
    unrealizedReturnPercent: percentage(unrealizedProfitLoss, totalCost),
    investedWeightPercent: percentage(investedValue, account.totalValue),
    availableCashWeightPercent: percentage(account.cash?.availableToTrade ?? 0, account.totalValue),
    top1WeightPercent: allocation[0]?.weightPercent ?? 0,
    top3WeightPercent: allocation.slice(0, 3).reduce((sum, item) => sum + item.weightPercent, 0),
    positionCount: positions.length,
    piePositionCount: positions.filter(item => (item.quantityInPies ?? 0) > 0).length,
    allocation,
    currencyExposure,
  }
}
