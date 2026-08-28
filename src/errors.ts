import { Trading212Error } from './trading212.ts'

export type ErrorCode =
  | 'INVALID_REQUEST' | 'INVALID_CREDENTIALS' | 'MISSING_SCOPE' | 'RATE_LIMITED'
  | 'UPSTREAM_TIMEOUT' | 'UPSTREAM_UNAVAILABLE' | 'UPSTREAM_INVALID_RESPONSE'
  | 'NOT_CONNECTED' | 'CONNECTION_INVALID' | 'CONNECTION_READ_ONLY'
  | 'CONNECTION_WRITE_FAILED' | 'CONNECTION_CHANGED' | 'STATUS_UNAVAILABLE'
  | 'DISCONNECT_FAILED' | 'NOT_FOUND' | 'INTERNAL_ERROR'

export interface ErrorEnvelope {
  error: {
    code: ErrorCode
    message: string
    cause: string
    action: string
    helpPath: string
    requestId: string
    retryAt?: string
  }
}

export class AppError extends Error {
  readonly code: ErrorCode
  readonly status: number
  readonly causeText: string
  readonly action: string
  readonly retryAt?: string

  constructor(
    code: ErrorCode,
    message: string,
    status: number,
    causeText: string,
    action: string,
    retryAt?: string,
  ) {
    super(message)
    this.name = 'AppError'
    this.code = code
    this.status = status
    this.causeText = causeText
    this.action = action
    this.retryAt = retryAt
  }
}

function parseRetryAt(value: string | undefined): string | undefined {
  if (value === undefined) return undefined
  const seconds = Number(value)
  if (Number.isFinite(seconds) && seconds >= 0) return new Date(Date.now() + seconds * 1000).toISOString()
  const timestamp = Date.parse(value)
  return Number.isFinite(timestamp) ? new Date(timestamp).toISOString() : undefined
}

export function normalizeError(error: unknown, fallback: ErrorCode = 'INTERNAL_ERROR'): AppError {
  if (error instanceof AppError) return error
  if (error instanceof Trading212Error) {
    if (error.status === 401) return new AppError('INVALID_CREDENTIALS', 'Trading 212 拒绝了凭据', 401, 'API Key、API Secret 或 Demo/Live 环境不匹配', '确认密钥所属环境后重新输入；Secret 丢失时需要重新创建')
    if (error.status === 403) return new AppError('MISSING_SCOPE', 'Trading 212 密钥权限不足', 403, '密钥缺少账户、投资组合或订单读取权限，或受到 IP 限制', '重新创建只读密钥并启用账户、投资组合和订单读取权限')
    if (error.status === 429) return new AppError('RATE_LIMITED', 'Trading 212 暂时限制了请求', 429, '短时间内请求次数超过限制', '等待倒计时结束后再刷新', parseRetryAt(error.retryAfter))
    if (error.status === 408) return new AppError('UPSTREAM_TIMEOUT', 'Trading 212 响应超时', 504, '券商接口未在超时时间内响应', '检查网络后重试；页面会保留同一连接的旧快照')
    if (error.status === 502) return new AppError('UPSTREAM_INVALID_RESPONSE', 'Trading 212 返回了无法识别的数据', 502, '上游响应缺少必需字段或包含无效数值', '稍后重试；持续出现时复制诊断信息并报告')
    return new AppError('UPSTREAM_UNAVAILABLE', '暂时无法读取 Trading 212', 502, `Trading 212 返回 HTTP ${error.status}`, '稍后重试')
  }
  if (fallback === 'STATUS_UNAVAILABLE') return new AppError(fallback, 'dsh 无法读取插件状态', 503, '插件 Host 服务未正常响应', '重启 dsh 后重试；如仍失败，请复制诊断信息')
  if (fallback === 'DISCONNECT_FAILED') return new AppError(fallback, '未能断开 Trading 212', 500, '凭据存储没有确认断开操作', '连接仍保持不变，请重试或查看帮助')
  return new AppError(fallback, '插件遇到内部错误', 500, '发生了未分类的本地错误', '重试；如仍失败，请复制诊断信息')
}

export function toErrorEnvelope(error: AppError, requestId: string): ErrorEnvelope {
  return { error: {
    code: error.code,
    message: error.message,
    cause: error.causeText,
    action: error.action,
    helpPath: `/trading212/#help-${error.code.toLowerCase().replaceAll('_', '-')}`,
    requestId,
    retryAt: error.retryAt,
  } }
}
