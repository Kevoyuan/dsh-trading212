const LOGO_BASE_URL = 'https://tickerlogo.com/alpha_logos_png'
const MAX_LOGO_BYTES = 512 * 1024
const DEFAULT_CACHE_TTL_MS = 7 * 24 * 60 * 60 * 1000

export interface LogoAsset {
  body: Uint8Array
  contentType: 'image/png'
  symbol: string
}

const tickerAliases: Record<string, string> = {
  SNDK1: 'SNDK',
  YNDX: 'NBIS',
}

export function canonicalLogoTicker(ticker: string): string | undefined {
  const symbol = ticker.replace(/_.*/, '').trim().toUpperCase()
  if (!/^[A-Z0-9.-]{1,20}$/.test(symbol)) return undefined
  return tickerAliases[symbol] ?? symbol
}

export class LogoService {
  private readonly cache = new Map<string, { asset?: LogoAsset; expiresAt: number }>()
  private readonly inflight = new Map<string, Promise<LogoAsset | undefined>>()
  private readonly fetchImpl: typeof fetch
  private readonly timeoutMs: number
  private readonly cacheTtlMs: number

  constructor(
    fetchImpl: typeof fetch,
    timeoutMs: number,
    cacheTtlMs = DEFAULT_CACHE_TTL_MS,
  ) {
    this.fetchImpl = fetchImpl
    this.timeoutMs = timeoutMs
    this.cacheTtlMs = cacheTtlMs
  }

  async get(ticker: string, signal?: AbortSignal): Promise<LogoAsset | undefined> {
    const symbol = canonicalLogoTicker(ticker)
    if (symbol === undefined) return undefined
    const cached = this.cache.get(symbol)
    if (cached !== undefined && cached.expiresAt > Date.now()) return cached.asset

    const pending = this.inflight.get(symbol) ?? this.download(symbol, signal).finally(() => this.inflight.delete(symbol))
    this.inflight.set(symbol, pending)
    const asset = await pending
    this.cache.set(symbol, {
      asset,
      expiresAt: Date.now() + (asset === undefined ? Math.min(this.cacheTtlMs, 60 * 60 * 1000) : this.cacheTtlMs),
    })
    return asset
  }

  private async download(symbol: string, signal?: AbortSignal): Promise<LogoAsset | undefined> {
    const url = `${LOGO_BASE_URL}/${encodeURIComponent(symbol)}.png`
    for (let attempt = 0; attempt < 2; attempt += 1) {
      try {
        const requestSignal = signal === undefined
          ? AbortSignal.timeout(this.timeoutMs)
          : AbortSignal.any([signal, AbortSignal.timeout(this.timeoutMs)])
        const response = await this.fetchImpl(url, {
          headers: { accept: 'image/png', 'user-agent': 'dsh-trading212' },
          redirect: 'follow',
          signal: requestSignal,
        })
        if (response.status === 404) return undefined
        if (!response.ok) {
          if (response.status >= 500 && attempt === 0) continue
          return undefined
        }
        const contentType = response.headers.get('content-type')?.split(';', 1)[0]?.trim()
        const contentLength = Number(response.headers.get('content-length') ?? 0)
        if (contentType !== 'image/png' || contentLength > MAX_LOGO_BYTES) return undefined
        const body = new Uint8Array(await response.arrayBuffer())
        if (body.byteLength === 0 || body.byteLength > MAX_LOGO_BYTES) return undefined
        return { body, contentType: 'image/png', symbol }
      } catch (cause) {
        if (signal?.aborted) throw cause
        if (attempt === 1) return undefined
      }
    }
    return undefined
  }
}
