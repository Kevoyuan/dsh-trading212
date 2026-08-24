import { AppError } from './errors.ts'
import type { Position } from './trading212.ts'

export type MarketRange = '1m' | '3m' | '1y' | '5y'

export interface PriceCandle {
  time: string
  open?: number
  high?: number
  low?: number
  close: number
  volume?: number
}

export interface MarketSeries {
  source: 'Yahoo Finance'
  symbol: string
  exchange?: string
  currency: string
  range: MarketRange
  interval: '1d'
  fetchedAt: string
  regularMarketPrice?: number
  previousClose?: number
  candles: PriceCandle[]
}

const finite = (value: unknown): number | undefined => typeof value === 'number' && Number.isFinite(value) ? value : undefined
const text = (value: unknown): string | undefined => typeof value === 'string' && value.trim() !== '' ? value : undefined

function object(value: unknown): Record<string, unknown> | undefined {
  return value !== null && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : undefined
}

function parseSeries(value: unknown, range: MarketRange): MarketSeries {
  const root = object(value)
  const chart = object(root?.chart)
  const result = Array.isArray(chart?.result) ? object(chart.result[0]) : undefined
  const meta = object(result?.meta)
  const timestamps = Array.isArray(result?.timestamp) ? result.timestamp : []
  const indicators = object(result?.indicators)
  const quotes = Array.isArray(indicators?.quote) ? object(indicators.quote[0]) : undefined
  const closes = Array.isArray(quotes?.close) ? quotes.close : []
  if (result === undefined || meta === undefined || timestamps.length === 0 || closes.length !== timestamps.length) {
    throw new AppError('UPSTREAM_INVALID_RESPONSE', 'Yahoo Finance 返回了无法识别的行情数据', 502, '历史行情缺少时间或收盘价数组', '稍后重试；持仓与 Trading 212 买卖历史仍可正常查看')
  }
  const opens = Array.isArray(quotes?.open) ? quotes.open : []
  const highs = Array.isArray(quotes?.high) ? quotes.high : []
  const lows = Array.isArray(quotes?.low) ? quotes.low : []
  const volumes = Array.isArray(quotes?.volume) ? quotes.volume : []
  const candles = timestamps.flatMap((timestamp, index): PriceCandle[] => {
    const seconds = finite(timestamp)
    const close = finite(closes[index])
    if (seconds === undefined || close === undefined) return []
    return [{
      time: new Date(seconds * 1000).toISOString(),
      open: finite(opens[index]), high: finite(highs[index]), low: finite(lows[index]),
      close, volume: finite(volumes[index]),
    }]
  })
  const symbol = text(meta.symbol)
  const currency = text(meta.currency)
  if (symbol === undefined || currency === undefined || candles.length < 2) {
    throw new AppError('UPSTREAM_INVALID_RESPONSE', 'Yahoo Finance 行情数据不足', 502, '行情没有有效代码、币种或足够的价格点', '切换时间范围或稍后重试')
  }
  return {
    source: 'Yahoo Finance', symbol, exchange: text(meta.exchangeName), currency, range, interval: '1d',
    fetchedAt: new Date().toISOString(), regularMarketPrice: finite(meta.regularMarketPrice), previousClose: finite(meta.chartPreviousClose), candles,
  }
}

export class MarketDataService {
  private readonly symbolCache = new Map<string, string>()
  private readonly seriesCache = new Map<string, { expiresAt: number; value: MarketSeries }>()

  constructor(private readonly fetchImpl: typeof fetch = fetch, private readonly timeoutMs = 10_000, private readonly ttlMs = 15 * 60_000) {}

  private async request(url: string, signal?: AbortSignal): Promise<unknown> {
    const controller = new AbortController()
    const abort = () => controller.abort()
    signal?.addEventListener('abort', abort, { once: true })
    let timedOut = false
    const timer = setTimeout(() => { timedOut = true; controller.abort() }, this.timeoutMs)
    try {
      const response = await this.fetchImpl(url, { headers: { Accept: 'application/json', 'User-Agent': 'dsh-trading212/0.7.0' }, signal: controller.signal })
      if (!response.ok) throw new AppError('UPSTREAM_UNAVAILABLE', 'Yahoo Finance 行情暂时不可用', 502, `Yahoo Finance 返回 HTTP ${response.status}`, '稍后重试；Trading 212 持仓和买卖历史不受影响')
      return await response.json() as unknown
    } catch (error) {
      if (error instanceof AppError) throw error
      if (signal?.aborted) throw signal.reason instanceof Error ? signal.reason : new DOMException('The operation was aborted', 'AbortError')
      if (timedOut || (error instanceof Error && error.name === 'AbortError')) throw new AppError('UPSTREAM_TIMEOUT', 'Yahoo Finance 行情响应超时', 504, '行情接口未在超时时间内响应', '稍后重试；Trading 212 持仓和买卖历史不受影响')
      throw new AppError('UPSTREAM_UNAVAILABLE', '无法连接 Yahoo Finance 行情', 502, '行情网络请求失败', '检查网络后重试')
    } finally {
      clearTimeout(timer)
      signal?.removeEventListener('abort', abort)
    }
  }

  private async resolveSymbol(instrument: NonNullable<Position['instrument']>, signal?: AbortSignal): Promise<string> {
    const cacheKey = instrument.ticker ?? instrument.isin ?? instrument.name ?? ''
    const cached = this.symbolCache.get(cacheKey)
    if (cached !== undefined) return cached
    const query = instrument.isin ?? instrument.name ?? instrument.ticker
    if (query === undefined) throw new AppError('NOT_FOUND', '无法识别该股票的行情代码', 404, '持仓没有 ticker、ISIN 或名称', '该持仓仍可查看 Trading 212 买卖历史')
    const value = object(await this.request(`https://query1.finance.yahoo.com/v1/finance/search?q=${encodeURIComponent(query)}&quotesCount=8&newsCount=0`, signal))
    const quotes = Array.isArray(value?.quotes) ? value.quotes : []
    const match = quotes.map(object).find(item => item !== undefined && (item.quoteType === 'EQUITY' || item.quoteType === 'ETF') && text(item.symbol) !== undefined)
    const symbol = text(match?.symbol)
    if (symbol === undefined) throw new AppError('NOT_FOUND', 'Yahoo Finance 找不到该股票', 404, `无法把 Trading 212 代码 ${instrument.ticker ?? 'unknown'} 映射到行情代码`, '仍可在下方查看 Trading 212 买卖历史')
    this.symbolCache.set(cacheKey, symbol)
    return symbol
  }

  async series(instrument: NonNullable<Position['instrument']>, range: MarketRange, signal?: AbortSignal): Promise<MarketSeries> {
    const symbol = await this.resolveSymbol(instrument, signal)
    const cacheKey = `${symbol}:${range}`
    const cached = this.seriesCache.get(cacheKey)
    if (cached !== undefined && cached.expiresAt > Date.now()) return cached.value
    const end = new Date()
    end.setUTCDate(end.getUTCDate() + 1)
    const start = new Date(end)
    if (range === '1m') start.setUTCMonth(start.getUTCMonth() - 1)
    else if (range === '3m') start.setUTCMonth(start.getUTCMonth() - 3)
    else if (range === '1y') start.setUTCFullYear(start.getUTCFullYear() - 1)
    else start.setUTCFullYear(start.getUTCFullYear() - 5)
    const query = new URLSearchParams({
      period1: String(Math.floor(start.getTime() / 1000)), period2: String(Math.floor(end.getTime() / 1000)),
      interval: '1d', includePrePost: 'false', events: 'div,splits',
    })
    const value = parseSeries(await this.request(`https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?${query}`, signal), range)
    this.seriesCache.set(cacheKey, { expiresAt: Date.now() + this.ttlMs, value })
    return value
  }
}
