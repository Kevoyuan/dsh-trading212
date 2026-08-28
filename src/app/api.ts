import type { ErrorCode, ErrorEnvelope } from '../errors.ts'
import type { ConnectionStatus } from '../portfolio-service.ts'
import type { MarketRange, MarketSeries } from '../market-data.ts'
import type { HistoryKind, HistoryPage, PortfolioSnapshot, TradingEnvironment } from '../trading212.ts'

export class ApiError extends Error {
  readonly code: ErrorCode
  readonly causeText: string
  readonly action: string
  readonly helpPath: string
  readonly requestId: string
  readonly retryAt?: string

  constructor(
    code: ErrorCode,
    message: string,
    causeText: string,
    action: string,
    helpPath: string,
    requestId: string,
    retryAt?: string,
  ) {
    super(message)
    this.name = 'ApiError'
    this.code = code
    this.causeText = causeText
    this.action = action
    this.helpPath = helpPath
    this.requestId = requestId
    this.retryAt = retryAt
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  let response: Response
  try {
    response = await fetch(`/api/trading212${path}`, {
      ...init,
      headers: { 'content-type': 'application/json', ...init?.headers },
    })
  } catch {
    throw new ApiError('STATUS_UNAVAILABLE', '无法连接 dsh 插件服务', 'Host 请求失败', '重启 dsh 后重试', '/trading212/#help-status-unavailable', 'browser-network')
  }
  const contentType = response.headers.get('content-type') ?? ''
  let value: unknown
  try {
    value = contentType.includes('application/json') ? await response.json() as unknown : undefined
  } catch {
    value = undefined
  }
  if (!response.ok) {
    const envelope = value as Partial<ErrorEnvelope> | undefined
    const error = envelope?.error
    if (error?.code !== undefined && error.message !== undefined) {
      throw new ApiError(error.code, error.message, error.cause, error.action, error.helpPath, error.requestId, error.retryAt)
    }
    throw new ApiError('INTERNAL_ERROR', `请求失败 (${response.status})`, 'Host 返回了无法识别的错误', '重启 dsh 后重试', '/trading212/#help-internal-error', `http-${response.status}`)
  }
  if (value === undefined) throw new ApiError('INTERNAL_ERROR', '插件返回了空响应', '响应不是 JSON', '重启 dsh 后重试', '/trading212/#help-internal-error', 'invalid-json')
  return value as T
}

export const api = {
  status: () => request<ConnectionStatus>('/status'),
  portfolio: (refresh = false) => request<PortfolioSnapshot>(`/portfolio${refresh ? '?refresh=true' : ''}`),
  history: (kind: HistoryKind, cursor?: string, ticker?: string) => {
    const query = new URLSearchParams({ kind })
    if (cursor !== undefined) query.set('cursor', cursor)
    if (ticker !== undefined) query.set('ticker', ticker)
    return request<HistoryPage>(`/history?${query}`)
  },
  market: (ticker: string, range: MarketRange) => request<MarketSeries>(`/market?${new URLSearchParams({ ticker, range })}`),
  connect: (body: { apiKey: string; apiSecret: string; environment: TradingEnvironment }) =>
    request<{ status: ConnectionStatus; snapshot: PortfolioSnapshot }>('/connect', { method: 'POST', body: JSON.stringify(body) }),
  disconnect: () => request<{ connected: false }>('/disconnect', { method: 'POST', body: '{}' }),
}

export function diagnosticText(error: ApiError, status?: ConnectionStatus): string {
  return [
    'dsh-trading212 diagnostic',
    'version: 0.8.0',
    `code: ${error.code}`,
    `requestId: ${error.requestId}`,
    `environment: ${status?.environment ?? 'unknown'}`,
    `source: ${status?.source ?? 'unknown'}`,
    `time: ${new Date().toISOString()}`,
  ].join('\n')
}
