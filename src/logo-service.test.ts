import { describe, expect, it, vi } from 'vitest'
import { canonicalLogoTicker, LogoService } from './logo-service.ts'

describe('LogoService', () => {
  it('normalizes Trading 212 tickers and maps the former YNDX symbol to NBIS', () => {
    expect(canonicalLogoTicker('MDB_US_EQ')).toBe('MDB')
    expect(canonicalLogoTicker('SNDK1_US_EQ')).toBe('SNDK')
    expect(canonicalLogoTicker('YNDX_US_EQ')).toBe('NBIS')
    expect(canonicalLogoTicker('../bad')).toBeUndefined()
  })

  it('downloads a PNG once and reuses the cached asset', async () => {
    const fetchImpl = vi.fn<typeof fetch>().mockResolvedValue(new Response(new Uint8Array([137, 80, 78, 71]), {
      status: 200,
      headers: { 'content-type': 'image/png', 'content-length': '4' },
    }))
    const service = new LogoService(fetchImpl, 1000)
    await expect(service.get('MDB_US_EQ')).resolves.toMatchObject({ symbol: 'MDB', contentType: 'image/png' })
    await expect(service.get('MDB_US_EQ')).resolves.toMatchObject({ symbol: 'MDB' })
    expect(fetchImpl).toHaveBeenCalledOnce()
    expect(fetchImpl.mock.calls[0]?.[0]).toBe('https://tickerlogo.com/alpha_logos_png/MDB.png')
  })

  it('returns no asset for missing or invalid upstream content', async () => {
    const missing = new LogoService(vi.fn<typeof fetch>().mockResolvedValue(new Response('', { status: 404 })), 1000)
    await expect(missing.get('UNKNOWN_US_EQ')).resolves.toBeUndefined()
    const html = new LogoService(vi.fn<typeof fetch>().mockResolvedValue(new Response('<html>', { status: 200, headers: { 'content-type': 'text/html' } })), 1000)
    await expect(html.get('MDB_US_EQ')).resolves.toBeUndefined()
  })
})
