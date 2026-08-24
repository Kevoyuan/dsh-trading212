import { describe, expect, it, vi } from 'vitest'
import { Trading212Client, Trading212Error } from './trading212.ts'

const credentials = { apiKey: 'key-12345678', apiSecret: 'secret-12345678', environment: 'demo' as const }

describe('Trading212Client', () => {
  it('uses the demo host and HTTP Basic authentication', async () => {
    const fetchImpl = vi.fn<typeof fetch>().mockResolvedValue(new Response(JSON.stringify({ currency: 'EUR', totalValue: 10 }), {
      status: 200,
      headers: { 'content-type': 'application/json' },
    }))
    const client = new Trading212Client(credentials, 1000, fetchImpl)

    await expect(client.accountSummary()).resolves.toMatchObject({ currency: 'EUR' })
    const [url, init] = fetchImpl.mock.calls[0]!
    expect(url).toBe('https://demo.trading212.com/api/v0/equity/account/summary')
    expect(new Headers(init?.headers).get('authorization')).toBe(
      `Basic ${Buffer.from('key-12345678:secret-12345678').toString('base64')}`,
    )
  })

  it('uses the live host when explicitly configured', async () => {
    const fetchImpl = vi.fn<typeof fetch>().mockResolvedValue(new Response('[]', { status: 200 }))
    const client = new Trading212Client({ ...credentials, environment: 'live' }, 1000, fetchImpl)
    await client.positions()
    expect(fetchImpl.mock.calls[0]?.[0]).toBe('https://live.trading212.com/api/v0/equity/positions')
  })

  it('returns one normalized read-only portfolio snapshot', async () => {
    const responses = new Map([
      ['/equity/account/summary', { currency: 'EUR', totalValue: 250, cash: { availableToTrade: 50 } }],
      ['/equity/positions', [{ quantity: 2, instrument: { ticker: 'AAPL_US_EQ' } }]],
      ['/equity/orders', [{ id: 1, ticker: 'AAPL_US_EQ', side: 'BUY', status: 'NEW', type: 'LIMIT' }]],
    ])
    const fetchImpl = vi.fn<typeof fetch>().mockImplementation(async input => {
      const path = new URL(String(input)).pathname.replace('/api/v0', '')
      return new Response(JSON.stringify(responses.get(path)), { status: 200 })
    })
    const snapshot = await new Trading212Client(credentials, 1000, fetchImpl).portfolioSnapshot()
    expect(snapshot.environment).toBe('demo')
    expect(snapshot.account.totalValue).toBe(250)
    expect(snapshot.positions).toHaveLength(1)
    expect(snapshot.pendingOrders).toHaveLength(1)
    expect(snapshot.analytics).toMatchObject({ totalValue: 250, investedValue: 0, positionCount: 1 })
    expect(fetchImpl).toHaveBeenCalledTimes(3)
  })

  it('preserves Trading 212 HTTP failures without leaking credentials', async () => {
    const fetchImpl = vi.fn<typeof fetch>().mockResolvedValue(new Response('Bad API key', { status: 401 }))
    const client = new Trading212Client(credentials, 1000, fetchImpl)
    const error = await client.accountSummary().catch(cause => cause)
    expect(error).toBeInstanceOf(Trading212Error)
    expect(error).toMatchObject({ status: 401 })
    expect(String(error)).not.toContain(credentials.apiSecret)
  })

  it('rejects malformed numeric data instead of exposing an unsafe snapshot', async () => {
    const fetchImpl = vi.fn<typeof fetch>().mockResolvedValue(new Response(JSON.stringify({ currency: 'EUR', totalValue: '100' }), { status: 200 }))
    await expect(new Trading212Client(credentials, 1000, fetchImpl).accountSummary()).rejects.toMatchObject({ status: 502 })
  })

  it('propagates caller cancellation through the official tool signal', async () => {
    const controller = new AbortController()
    const fetchImpl = vi.fn<typeof fetch>().mockImplementation((_input, init) => new Promise((_resolve, reject) => {
      init?.signal?.addEventListener('abort', () => reject(new DOMException('aborted', 'AbortError')), { once: true })
    }))
    const request = new Trading212Client(credentials, 10_000, fetchImpl).accountSummary(controller.signal)
    controller.abort(new DOMException('caller cancelled', 'AbortError'))
    await expect(request).rejects.toMatchObject({ name: 'AbortError' })
  })

  it('reads and validates cursor-paginated historical orders', async () => {
    const fetchImpl = vi.fn<typeof fetch>().mockResolvedValue(new Response(JSON.stringify({
      items: [{
        order: { id: 42, ticker: 'AAPL_US_EQ', side: 'BUY', status: 'FILLED', type: 'MARKET', quantity: 2, instrument: { currency: 'USD', name: 'Apple' } },
        fill: { id: 43, filledAt: '2026-08-20T10:00:00Z', price: 220, quantity: 2, walletImpact: { currency: 'EUR', netValue: -410, taxes: [{ name: 'CURRENCY_CONVERSION_FEE', quantity: 0.62, currency: 'EUR' }] } },
      }],
      nextPagePath: '/api/v0/equity/history/orders?limit=50&cursor=12345',
    }), { status: 200 }))
    const client = new Trading212Client(credentials, 1000, fetchImpl)
    await expect(client.history('orders')).resolves.toMatchObject({ kind: 'orders', nextCursor: '12345', items: [{ order: { id: 42 }, fill: { price: 220, walletImpact: { taxes: [{ quantity: 0.62 }] } } }] })
    expect(fetchImpl.mock.calls[0]?.[0]).toBe('https://demo.trading212.com/api/v0/equity/history/orders?limit=50')
  })

  it('passes an exact ticker filter to historical orders', async () => {
    const fetchImpl = vi.fn<typeof fetch>().mockResolvedValue(new Response(JSON.stringify({ items: [] }), { status: 200 }))
    await new Trading212Client(credentials, 1000, fetchImpl).history('orders', undefined, undefined, 'AAPL_US_EQ')
    expect(fetchImpl.mock.calls[0]?.[0]).toBe('https://demo.trading212.com/api/v0/equity/history/orders?limit=50&ticker=AAPL_US_EQ')
  })

  it('rejects an upstream history cursor that points outside its category', async () => {
    const fetchImpl = vi.fn<typeof fetch>().mockResolvedValue(new Response(JSON.stringify({ items: [], nextPagePath: '/api/v0/equity/history/dividends?cursor=wrong' }), { status: 200 }))
    await expect(new Trading212Client(credentials, 1000, fetchImpl).history('orders')).rejects.toMatchObject({ status: 502 })
  })
})
