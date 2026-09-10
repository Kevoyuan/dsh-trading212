import { randomUUID } from 'node:crypto'
import { readFile, stat } from 'node:fs/promises'
import type { IncomingMessage, ServerResponse } from 'node:http'
import { extname, resolve, sep } from 'node:path'
import { fileURLToPath } from 'node:url'
import type { Context } from '@deepseek-ai/cordis'
import '@deepseek-ai/dsh-host-webserver'
import { defineTool, type JsonValue } from '@deepseek-ai/dsh-tools'
import Schema from '@deepseek-ai/schemastery'
import { AppError, normalizeError, toErrorEnvelope } from './errors.ts'
import { toLosslessJson } from './lossless.ts'
import { MarketDataService, type MarketRange } from './market-data.ts'
import { LogoService } from './logo-service.ts'
import { PortfolioService } from './portfolio-service.ts'
import type { HistoryKind, TradingEnvironment } from './trading212.ts'

export const name = 'dsh-trading212'
export const inject = ['tools', 'credentials', 'webServer']

export interface Config {
  requestTimeoutMs: number
  cacheTtlMs: number
  marketCacheTtlMs: number
}

export const Config: Schema<Config> = Schema.object({
  requestTimeoutMs: Schema.number().min(1000).max(60_000).default(15_000),
  cacheTtlMs: Schema.number().min(1000).max(60_000).default(5_000),
  marketCacheTtlMs: Schema.number().min(5_000).max(86_400_000).default(15 * 60_000),
})

const UI_ROOT = fileURLToPath(new URL('../lib/ui', import.meta.url))
const MAX_BODY_BYTES = 32 * 1024

function json(res: ServerResponse, status: number, value: unknown, extraHeaders: Record<string, string> = {}): void {
  res.writeHead(status, {
    'cache-control': 'no-store',
    'content-type': 'application/json; charset=utf-8',
    'x-content-type-options': 'nosniff',
    ...extraHeaders,
  })
  res.end(JSON.stringify(value))
}

function methodNotAllowed(res: ServerResponse, allow: string): void {
  json(res, 405, toErrorEnvelope(new AppError('INVALID_REQUEST', '请求方法不受支持', 405, '此接口不接受当前 HTTP 方法', `请使用 ${allow}`), randomUUID()), { allow })
}

function isTrustedBrowserRequest(req: IncomingMessage): boolean {
  const site = req.headers['sec-fetch-site']
  if (site === 'cross-site') return false
  const origin = req.headers.origin
  if (origin === undefined) return true
  try {
    return new URL(origin).host === req.headers.host
  } catch {
    return false
  }
}

async function readJsonBody(req: IncomingMessage): Promise<Record<string, unknown>> {
  const contentType = req.headers['content-type']?.split(';', 1)[0]?.trim()
  if (contentType !== 'application/json') throw new AppError('INVALID_REQUEST', '请求必须使用 JSON', 415, 'Content-Type 不是 application/json', '使用 JSON 请求体后重试')
  const chunks: Buffer[] = []
  let size = 0
  for await (const chunk of req) {
    const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk)
    size += buffer.length
    if (size > MAX_BODY_BYTES) throw new AppError('INVALID_REQUEST', '请求体过大', 413, `请求超过 ${MAX_BODY_BYTES} 字节`, '缩短请求体后重试')
    chunks.push(buffer)
  }
  try {
    const value: unknown = JSON.parse(Buffer.concat(chunks).toString('utf8'))
    if (value === null || typeof value !== 'object' || Array.isArray(value)) throw new Error('not an object')
    return value as Record<string, unknown>
  } catch {
    throw new AppError('INVALID_REQUEST', 'JSON 请求体无效', 400, '请求体不是有效 JSON 对象', '修正 JSON 后重试')
  }
}

function mime(path: string): string {
  return ({
    '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8',
    '.svg': 'image/svg+xml', '.png': 'image/png', '.woff2': 'font/woff2',
  } as Record<string, string>)[extname(path)] ?? 'application/octet-stream'
}

async function serveUi(req: IncomingMessage, res: ServerResponse): Promise<void> {
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    res.writeHead(405, { allow: 'GET, HEAD' }).end()
    return
  }
  try {
    const pathname = new URL(req.url ?? '/', 'http://localhost').pathname
    const relative = pathname === '/trading212' || pathname === '/trading212/' ? 'index.html' : decodeURIComponent(pathname.slice('/trading212/'.length))
    const file = resolve(UI_ROOT, relative)
    if (file !== UI_ROOT && !file.startsWith(`${UI_ROOT}${sep}`)) {
      res.writeHead(403).end()
      return
    }
    const info = await stat(file)
    if (!info.isFile()) throw new Error('not a file')
    res.writeHead(200, {
      'content-type': mime(file),
      'cache-control': relative === 'index.html' ? 'no-cache' : 'public, max-age=31536000, immutable',
      'x-content-type-options': 'nosniff',
    })
    if (req.method === 'HEAD') res.end()
    else res.end(await readFile(file))
  } catch {
    res.writeHead(404).end()
  }
}

function parseCredentials(body: Record<string, unknown>): { apiKey: string; apiSecret: string; environment: TradingEnvironment } {
  const apiKey = typeof body.apiKey === 'string' ? body.apiKey.trim() : ''
  const apiSecret = typeof body.apiSecret === 'string' ? body.apiSecret.trim() : ''
  if (body.environment !== 'demo' && body.environment !== 'live') throw new AppError('INVALID_REQUEST', '请选择 Demo 或 Live 环境', 400, 'environment 不是 demo 或 live', '选择密钥创建时使用的环境')
  if (apiKey.length < 8 || apiSecret.length < 8) throw new AppError('INVALID_REQUEST', '请填写完整的 API Key 和 API Secret', 400, 'Key 或 Secret 长度不足', '重新粘贴完整凭据')
  return { apiKey, apiSecret, environment: body.environment }
}

function parseHistoryKind(value: unknown): HistoryKind {
  if (value === 'orders' || value === 'dividends' || value === 'transactions') return value
  throw new AppError('INVALID_REQUEST', '请选择有效的历史记录类型', 400, 'kind 不是 orders、dividends 或 transactions', '选择历史订单、分红或资金交易')
}

function parseCursor(value: unknown): string | undefined {
  if (value === undefined || value === null || value === '') return undefined
  if (typeof value !== 'string' || value.length > 512 || /[\u0000-\u001f\u007f]/.test(value)) {
    throw new AppError('INVALID_REQUEST', '历史分页位置无效', 400, 'cursor 格式无效', '重新打开历史页面后重试')
  }
  return value
}

function parseTicker(value: unknown, required = false): string | undefined {
  if ((value === undefined || value === null || value === '') && !required) return undefined
  if (typeof value !== 'string' || !/^[A-Za-z0-9._-]{1,80}$/.test(value)) {
    throw new AppError('INVALID_REQUEST', '股票代码无效', 400, 'ticker 格式无效', '从持仓列表重新打开该股票')
  }
  return value
}

function parseMarketRange(value: unknown): MarketRange {
  if (value === '1d' || value === '1w' || value === '1m' || value === '3m' || value === '1y' || value === '5y') return value
  throw new AppError('INVALID_REQUEST', '行情时间范围无效', 400, 'range 不是 1d、1w、1m、3m、1y 或 5y', '选择有效的时间范围')
}

export function apply(ctx: Context, config: Config): void {
  const service = new PortfolioService(ctx.credentials, config.requestTimeoutMs, config.cacheTtlMs)
  const marketData = new MarketDataService(fetch, config.requestTimeoutMs, config.marketCacheTtlMs)
  const logos = new LogoService(fetch, Math.min(config.requestTimeoutMs, 5_000))

  ctx.tools.register(defineTool({
    name: 'trading212_portfolio',
    description: 'Read the connected user\'s Trading 212 account summary, complete open-position fields, pending orders, and derived portfolio analytics including cost basis, realised and unrealised P/L, return, concentration, FX impact, allocation, and instrument-currency exposure. Use for questions about the user\'s portfolio. This tool is read-only and never places, changes, or cancels orders.',
    parameters: { refresh: { type: 'boolean', description: 'Bypass the short local cache and request a fresh snapshot.' } },
    output: {
      schema: { type: 'json' },
      render: (_args, value) => [{ type: 'text', text: JSON.stringify(value) }],
    },
    async execute(args, exec) {
      return toLosslessJson(await service.snapshot(args.refresh === true, exec.signal)) as unknown as JsonValue
    },
  }))

  ctx.tools.register(defineTool({
    name: 'trading212_history',
    description: 'Read the connected user\'s Trading 212 historical orders, dividend payments, or cash transactions. Use this read-only tool for questions about trading activity, deposits, withdrawals, fees, interest, or dividends. It never places or changes orders.',
    parameters: {
      kind: { type: 'string', required: true, enum: ['orders', 'dividends', 'transactions'], description: 'History category to retrieve.' },
      cursor: { type: 'string', description: 'Opaque next-page cursor returned by a previous call.' },
      ticker: { type: 'string', description: 'Optional exact Trading 212 ticker to filter historical results.' },
    },
    output: {
      schema: { type: 'json' },
      render: (_args, value) => [{ type: 'text', text: JSON.stringify(value) }],
    },
    async execute(args, exec) {
      return toLosslessJson(await service.history(parseHistoryKind(args.kind), parseCursor(args.cursor), exec.signal, parseTicker(args.ticker))) as unknown as JsonValue
    },
  }))

  ctx.effect(() => ctx.webServer.register({ kind: 'prefix', path: '/trading212', handler: serveUi }), 'dsh-trading212: UI')

  ctx.effect(() => ctx.webServer.register({
    kind: 'prefix',
    path: '/api/trading212',
    handler: async (req, res) => {
      const requestId = randomUUID()
      if (!isTrustedBrowserRequest(req)) {
        const error = new AppError('INVALID_REQUEST', '不受信任的请求来源', 403, '请求来源与 dsh Host 不同源', '从 dsh 中重新打开插件')
        json(res, error.status, toErrorEnvelope(error, requestId))
        return
      }
      const url = new URL(req.url ?? '/', 'http://localhost')
      const path = url.pathname
      const controller = new AbortController()
      req.once('aborted', () => controller.abort())
      try {
        if (path === '/api/trading212/status') {
          if (req.method !== 'GET') return methodNotAllowed(res, 'GET')
          json(res, 200, await service.status())
          return
        }
        if (path === '/api/trading212/portfolio') {
          if (req.method !== 'GET') return methodNotAllowed(res, 'GET')
          const unknown = [...url.searchParams.keys()].filter(key => key !== 'refresh')
          if (unknown.length > 0) throw new AppError('INVALID_REQUEST', '包含不支持的查询参数', 400, `未知参数：${unknown.join(', ')}`, '移除未知参数后重试')
          json(res, 200, await service.snapshot(url.searchParams.get('refresh') === 'true', controller.signal))
          return
        }
        if (path === '/api/trading212/history') {
          if (req.method !== 'GET') return methodNotAllowed(res, 'GET')
          const unknown = [...url.searchParams.keys()].filter(key => key !== 'kind' && key !== 'cursor' && key !== 'ticker')
          if (unknown.length > 0) throw new AppError('INVALID_REQUEST', '包含不支持的查询参数', 400, `未知参数：${unknown.join(', ')}`, '移除未知参数后重试')
          json(res, 200, await service.history(parseHistoryKind(url.searchParams.get('kind')), parseCursor(url.searchParams.get('cursor') ?? undefined), controller.signal, parseTicker(url.searchParams.get('ticker') ?? undefined)))
          return
        }
        if (path === '/api/trading212/market') {
          if (req.method !== 'GET') return methodNotAllowed(res, 'GET')
          const unknown = [...url.searchParams.keys()].filter(key => key !== 'ticker' && key !== 'range')
          if (unknown.length > 0) throw new AppError('INVALID_REQUEST', '包含不支持的查询参数', 400, `未知参数：${unknown.join(', ')}`, '移除未知参数后重试')
          const ticker = parseTicker(url.searchParams.get('ticker'), true)!
          const snapshot = await service.snapshot(false, controller.signal)
          const instrument = snapshot.positions.find(position => position.instrument?.ticker === ticker)?.instrument
          if (instrument === undefined) throw new AppError('NOT_FOUND', '当前持仓中找不到该股票', 404, `持仓快照不包含 ${ticker}`, '返回持仓列表后重新选择')
          json(res, 200, await marketData.series(instrument, parseMarketRange(url.searchParams.get('range')), controller.signal))
          return
        }
        if (path === '/api/trading212/logo') {
          if (req.method !== 'GET') return methodNotAllowed(res, 'GET')
          const unknown = [...url.searchParams.keys()].filter(key => key !== 'ticker')
          if (unknown.length > 0) throw new AppError('INVALID_REQUEST', '包含不支持的查询参数', 400, `未知参数：${unknown.join(', ')}`, '移除未知参数后重试')
          const ticker = parseTicker(url.searchParams.get('ticker'), true)!
          const asset = await logos.get(ticker, controller.signal)
          if (asset === undefined) {
            res.writeHead(404, { 'cache-control': 'public, max-age=3600', 'x-content-type-options': 'nosniff' }).end()
            return
          }
          res.writeHead(200, {
            'cache-control': 'public, max-age=86400, stale-while-revalidate=604800',
            'content-length': String(asset.body.byteLength),
            'content-type': asset.contentType,
            'x-content-type-options': 'nosniff',
          })
          res.end(asset.body)
          return
        }
        if (path === '/api/trading212/connect') {
          if (req.method !== 'POST') return methodNotAllowed(res, 'POST')
          const snapshot = await service.connect(parseCredentials(await readJsonBody(req)), controller.signal)
          json(res, 200, { status: await service.status(), snapshot })
          return
        }
        if (path === '/api/trading212/disconnect') {
          if (req.method !== 'POST') return methodNotAllowed(res, 'POST')
          await readJsonBody(req)
          await service.disconnect()
          json(res, 200, { connected: false })
          return
        }
        const error = new AppError('NOT_FOUND', '接口不存在', 404, '请求路径未注册', '刷新插件后重试')
        json(res, error.status, toErrorEnvelope(error, requestId))
      } catch (cause) {
        const error = normalizeError(cause, path.endsWith('/status') ? 'STATUS_UNAVAILABLE' : path.endsWith('/disconnect') ? 'DISCONNECT_FAILED' : 'INTERNAL_ERROR')
        const retryAfter: Record<string, string> = error.retryAt === undefined ? {} : { 'retry-after': new Date(error.retryAt).toUTCString() }
        json(res, error.status, toErrorEnvelope(error, requestId), retryAfter)
      }
    },
  }), 'dsh-trading212: API')
}
