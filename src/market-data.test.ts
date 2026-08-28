import { describe, expect, it, vi } from 'vitest'
import { MarketDataService } from './market-data.ts'

const instrument = { ticker: 'AAPL_US_EQ', isin: 'US0378331005', name: 'Apple', currency: 'USD' }

describe('MarketDataService', () => {
  it('resolves by public instrument identity, parses daily prices, and caches the result', async () => {
    const fetchImpl = vi.fn<typeof fetch>()
      .mockResolvedValueOnce(new Response(JSON.stringify({ quotes: [{ symbol: 'AAPL', quoteType: 'EQUITY' }] }), { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ chart: { result: [{ meta: { symbol: 'AAPL', currency: 'USD', exchangeName: 'NMS', regularMarketPrice: 220 }, timestamp: [1_700_000_000, 1_700_086_400], indicators: { quote: [{ open: [210, 218], high: [222, 225], low: [208, 215], close: [220, 223], volume: [100, 120] }] } }] } }), { status: 200 }))
    const service = new MarketDataService(fetchImpl, 1000)
    const first = await service.series(instrument, '1m')
    const second = await service.series(instrument, '1m')
    expect(first).toMatchObject({ source: 'Yahoo Finance', symbol: 'AAPL', currency: 'USD', candles: [{ close: 220 }, { close: 223 }] })
    expect(second).toBe(first)
    expect(fetchImpl).toHaveBeenCalledTimes(2)
    expect(String(fetchImpl.mock.calls[0]?.[0])).toContain(encodeURIComponent(instrument.isin))
    const chartUrl = new URL(String(fetchImpl.mock.calls[1]?.[0]))
    expect(chartUrl.searchParams.get('period1')).toMatch(/^\d+$/)
    expect(chartUrl.searchParams.get('period2')).toMatch(/^\d+$/)
    expect(chartUrl.searchParams.get('interval')).toBe('1d')
    expect(chartUrl.searchParams.has('range')).toBe(false)
  })

  it('rejects malformed chart data', async () => {
    const fetchImpl = vi.fn<typeof fetch>()
      .mockResolvedValueOnce(new Response(JSON.stringify({ quotes: [{ symbol: 'AAPL', quoteType: 'EQUITY' }] }), { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ chart: { result: [] } }), { status: 200 }))
    await expect(new MarketDataService(fetchImpl, 1000).series(instrument, '1y')).rejects.toMatchObject({ code: 'UPSTREAM_INVALID_RESPONSE' })
  })

  it('uses intraday candles for the one-day and one-week ranges', async () => {
    const chart = { chart: { result: [{ meta: { symbol: 'AAPL', currency: 'USD' }, timestamp: [1_700_000_000, 1_700_000_300], indicators: { quote: [{ close: [220, 221] }] } }] } }
    const fetchImpl = vi.fn<typeof fetch>()
      .mockResolvedValueOnce(new Response(JSON.stringify({ quotes: [{ symbol: 'AAPL', quoteType: 'EQUITY' }] }), { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify(chart), { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify(chart), { status: 200 }))
    const service = new MarketDataService(fetchImpl, 1000)

    expect(await service.series(instrument, '1d')).toMatchObject({ range: '1d', interval: '1m' })
    expect(await service.series(instrument, '1w')).toMatchObject({ range: '1w', interval: '5m' })

    const dayUrl = new URL(String(fetchImpl.mock.calls[1]?.[0]))
    expect(dayUrl.searchParams.get('range')).toBe('1d')
    expect(dayUrl.searchParams.get('interval')).toBe('1m')
    expect(dayUrl.searchParams.get('includePrePost')).toBe('true')
    const weekUrl = new URL(String(fetchImpl.mock.calls[2]?.[0]))
    expect(weekUrl.searchParams.get('range')).toBe('5d')
    expect(weekUrl.searchParams.get('interval')).toBe('5m')
    expect(weekUrl.searchParams.get('includePrePost')).toBe('true')
  })
})
