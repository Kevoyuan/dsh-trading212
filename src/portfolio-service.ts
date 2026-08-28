import { createHmac, randomBytes } from 'node:crypto'
import * as credentialApi from '@deepseek-ai/dsh-credentials'
import type { CredentialKey, CredentialProvider, CredentialRecord, CredentialRef } from '@deepseek-ai/dsh-credentials'
import { AppError, normalizeError } from './errors.ts'
import { Trading212Client, type HistoryKind, type HistoryPage, type PortfolioSnapshot, type Trading212Credentials, type TradingEnvironment } from './trading212.ts'

export const CONNECTION_REF = credentialApi.credentialRef('TRADING212_CONNECTION')
export const LEGACY_KEY_REF = credentialApi.credentialRef('TRADING212_API_KEY')
export const LEGACY_SECRET_REF = credentialApi.credentialRef('TRADING212_API_SECRET')
export const LEGACY_ENV_REF = credentialApi.credentialRef('TRADING212_ENVIRONMENT')

interface ConnectedRecord {
  version: 1
  state: 'connected'
  environment: TradingEnvironment
  apiKey: string
  apiSecret: string
}

interface DisconnectedRecord {
  version: 1
  state: 'disconnected'
}

type ConnectionRecord = ConnectedRecord | DisconnectedRecord

export interface ConnectionStatus {
  connected: boolean
  environment: TradingEnvironment
  writable: boolean
  source: 'record' | 'reference' | 'legacy' | 'none'
}

type ClientFactory = (credentials: Trading212Credentials, timeoutMs: number) => Trading212Client

interface RecordProvider {
  readRecord(key: CredentialKey): Promise<CredentialRecord | undefined>
  describeRecord(key: CredentialKey): Promise<{ configured: boolean; writable: boolean }>
  modifyRecord(key: CredentialKey, mutate: (current: CredentialRecord | undefined) => Promise<CredentialRecord | undefined>): Promise<CredentialRecord | undefined>
}

interface ReferenceProvider {
  resolve(ref: CredentialRef): Promise<{ value: string } | undefined>
  describe(ref: CredentialRef): Promise<{ configured: boolean; writable: boolean }>
  set(ref: CredentialRef, value: string): Promise<void>
  unset(ref: CredentialRef): Promise<void>
}

function referenceProvider(provider: CredentialProvider): ReferenceProvider {
  return provider as unknown as ReferenceProvider
}

function supportsRecords(provider: CredentialProvider): provider is CredentialProvider & RecordProvider {
  const candidate = provider as Partial<RecordProvider>
  return typeof credentialApi.credentialKey === 'function'
    && typeof candidate.readRecord === 'function'
    && typeof candidate.describeRecord === 'function'
    && typeof candidate.modifyRecord === 'function'
}

function recordKey(): CredentialKey {
  if (typeof credentialApi.credentialKey !== 'function') throw new Error('credential records are unavailable')
  return credentialApi.credentialKey('dsh-trading212', 'connection')
}

function parseRecord(value: unknown): ConnectionRecord {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) throw invalidConnection('连接记录不是 JSON 对象')
  const item = value as Record<string, unknown>
  if (item.version !== 1) throw invalidConnection('连接记录版本不受支持')
  if (item.state === 'disconnected') return { version: 1, state: 'disconnected' }
  if (item.state !== 'connected') throw invalidConnection('连接记录状态无效')
  if (item.environment !== 'demo' && item.environment !== 'live') throw invalidConnection('连接环境无效')
  if (typeof item.apiKey !== 'string' || item.apiKey.length < 8 || typeof item.apiSecret !== 'string' || item.apiSecret.length < 8) {
    throw invalidConnection('连接记录中的密钥不完整')
  }
  return { version: 1, state: 'connected', environment: item.environment, apiKey: item.apiKey, apiSecret: item.apiSecret }
}

function invalidConnection(cause: string): AppError {
  return new AppError('CONNECTION_INVALID', '保存的 Trading 212 连接无效', 500, cause, '请在设置中重新连接；插件不会回退到可能属于其他账户的旧密钥')
}

function credentialsOf(record: ConnectedRecord): Trading212Credentials {
  return { apiKey: record.apiKey, apiSecret: record.apiSecret, environment: record.environment }
}

export class PortfolioService {
  private readonly generationSecret = randomBytes(32)
  private readonly provider: CredentialProvider
  private readonly timeoutMs: number
  private readonly cacheTtlMs: number
  private readonly clientFactory: ClientFactory
  private cache?: { generation: string; expiresAt: number; value: PortfolioSnapshot }
  private inFlight?: { generation: string; promise: Promise<PortfolioSnapshot> }
  private cooldownUntil = 0

  constructor(
    provider: CredentialProvider,
    timeoutMs: number,
    cacheTtlMs: number,
    clientFactory: ClientFactory = (credentials, timeout) => new Trading212Client(credentials, timeout),
  ) {
    this.provider = provider
    this.timeoutMs = timeoutMs
    this.cacheTtlMs = cacheTtlMs
    this.clientFactory = clientFactory
  }

  invalidate(): void {
    this.cache = undefined
    this.inFlight = undefined
    this.cooldownUntil = 0
  }

  private generation(record: ConnectedRecord): string {
    return createHmac('sha256', this.generationSecret).update(JSON.stringify({
      version: record.version,
      state: record.state,
      environment: record.environment,
      apiKey: record.apiKey,
      apiSecret: record.apiSecret,
    })).digest('hex')
  }

  private async readCanonical(): Promise<{ record?: ConnectionRecord; source: 'record' | 'reference'; writable: boolean } | undefined> {
    if (supportsRecords(this.provider)) {
      const key = recordKey()
      const stored = await this.provider.readRecord(key)
      const info = await this.provider.describeRecord(key)
      if (stored !== undefined) {
        if (stored.kind !== 'grant') throw invalidConnection('连接凭据记录类型无效')
        return { record: parseRecord(stored.payload), source: 'record', writable: info.writable }
      }
    }
    const provider = referenceProvider(this.provider)
    const [resolved, info] = await Promise.all([
      provider.resolve(CONNECTION_REF),
      provider.describe(CONNECTION_REF),
    ])
    if (resolved === undefined) return undefined
    try {
      return { record: parseRecord(JSON.parse(resolved.value) as unknown), source: 'reference', writable: info.writable }
    } catch (error) {
      if (error instanceof AppError) throw error
      throw invalidConnection('连接记录不是有效 JSON')
    }
  }

  private async readLegacy(): Promise<ConnectedRecord | undefined> {
    const provider = referenceProvider(this.provider)
    const [key, secret, environment] = await Promise.all([
      provider.resolve(LEGACY_KEY_REF),
      provider.resolve(LEGACY_SECRET_REF),
      provider.resolve(LEGACY_ENV_REF),
    ])
    if (key === undefined && secret === undefined && environment === undefined) return undefined
    if (key === undefined || secret === undefined) throw invalidConnection('检测到不完整的旧版密钥')
    return {
      version: 1,
      state: 'connected',
      environment: environment?.value === 'live' ? 'live' : 'demo',
      apiKey: key.value,
      apiSecret: secret.value,
    }
  }

  private async writeCanonical(record: ConnectionRecord): Promise<void> {
    if (supportsRecords(this.provider)) {
      const key = recordKey()
      const info = await this.provider.describeRecord(key)
      if (!info.writable) throw new AppError('CONNECTION_READ_ONLY', '当前连接由只读来源管理', 409, '凭据记录不可写', '请在提供该凭据的来源中修改或删除连接')
      const stored = await this.provider.modifyRecord(key, async () => ({ kind: 'grant', payload: record }))
      if (stored?.kind !== 'grant' || JSON.stringify(parseRecord(stored.payload)) !== JSON.stringify(parseRecord(record))) {
        throw new AppError('CONNECTION_WRITE_FAILED', '无法确认连接已保存', 500, '凭据提供方返回的记录与写入内容不一致', '原连接状态未知，请刷新状态后再操作')
      }
      await referenceProvider(this.provider).unset(CONNECTION_REF).catch(() => undefined)
      return
    }
    const provider = referenceProvider(this.provider)
    const info = await provider.describe(CONNECTION_REF)
    if (!info.writable) throw new AppError('CONNECTION_READ_ONLY', '当前连接由只读来源管理', 409, '凭据引用被环境或项目配置遮蔽', '请在提供该凭据的来源中修改或删除连接')
    await provider.set(CONNECTION_REF, JSON.stringify(record))
    const verified = await provider.resolve(CONNECTION_REF)
    if (verified === undefined || JSON.stringify(parseRecord(JSON.parse(verified.value) as unknown)) !== JSON.stringify(parseRecord(record))) {
      throw new AppError('CONNECTION_WRITE_FAILED', '无法确认连接已保存', 500, '凭据提供方没有返回刚写入的连接', '原连接状态未知，请刷新状态后再操作')
    }
  }

  private async cleanLegacy(): Promise<void> {
    const provider = referenceProvider(this.provider)
    await Promise.allSettled([
      provider.unset(LEGACY_KEY_REF), provider.unset(LEGACY_SECRET_REF), provider.unset(LEGACY_ENV_REF),
    ])
  }

  private async resolveConnection(migrate = true): Promise<{ record: ConnectedRecord; source: ConnectionStatus['source']; writable: boolean } | undefined> {
    const canonical = await this.readCanonical()
    if (canonical?.record !== undefined) {
      if (canonical.record.state === 'disconnected') return undefined
      return { record: canonical.record, source: canonical.source, writable: canonical.writable }
    }
    const legacy = await this.readLegacy()
    if (legacy === undefined) return undefined
    if (migrate) {
      await this.writeCanonical(legacy)
      await this.cleanLegacy()
      return { record: legacy, source: supportsRecords(this.provider) ? 'record' : 'reference', writable: true }
    }
    return { record: legacy, source: 'legacy', writable: false }
  }

  async status(): Promise<ConnectionStatus> {
    const connection = await this.resolveConnection()
    if (connection !== undefined) return { connected: true, environment: connection.record.environment, writable: connection.writable, source: connection.source }
    const writable = supportsRecords(this.provider)
      ? (await this.provider.describeRecord(recordKey())).writable
      : (await referenceProvider(this.provider).describe(CONNECTION_REF)).writable
    return { connected: false, environment: 'demo', writable, source: 'none' }
  }

  async connect(credentials: Trading212Credentials, signal?: AbortSignal): Promise<PortfolioSnapshot> {
    const snapshot = await this.clientFactory(credentials, this.timeoutMs).portfolioSnapshot(signal)
    const record: ConnectedRecord = { version: 1, state: 'connected', ...credentials }
    await this.writeCanonical(record)
    await this.cleanLegacy()
    this.invalidate()
    this.cache = { generation: this.generation(record), expiresAt: Date.now() + this.cacheTtlMs, value: snapshot }
    return snapshot
  }

  async disconnect(): Promise<void> {
    await this.writeCanonical({ version: 1, state: 'disconnected' })
    await this.cleanLegacy()
    this.invalidate()
  }

  async snapshot(refresh = false, signal?: AbortSignal): Promise<PortfolioSnapshot> {
    const connection = await this.resolveConnection()
    if (connection === undefined) throw new AppError('NOT_CONNECTED', 'Trading 212 尚未连接', 409, '没有可用的连接记录', '打开设置并连接只读 API 密钥')
    const generation = this.generation(connection.record)
    const now = Date.now()
    if (!refresh && this.cache?.generation === generation && this.cache.expiresAt > now) return this.cache.value
    if (refresh && this.cooldownUntil > now) {
      throw new AppError('RATE_LIMITED', '刷新暂时不可用', 429, '仍处于 Trading 212 请求冷却期', '等待倒计时结束后再刷新', new Date(this.cooldownUntil).toISOString())
    }
    if (this.inFlight?.generation === generation) return this.inFlight.promise

    const promise = this.clientFactory(credentialsOf(connection.record), this.timeoutMs).portfolioSnapshot(signal)
      .then(async value => {
        const latest = await this.resolveConnection(false)
        if (latest === undefined || this.generation(latest.record) !== generation) {
          throw new AppError('CONNECTION_CHANGED', '连接已在请求期间变化', 409, '返回的数据属于旧凭据世代', '刷新以读取当前连接的数据')
        }
        this.cache = { generation, expiresAt: Date.now() + this.cacheTtlMs, value }
        return value
      })
      .catch(error => {
        const normalized = normalizeError(error)
        if (normalized.code === 'RATE_LIMITED') this.cooldownUntil = Date.parse(normalized.retryAt ?? '') || Date.now() + 30_000
        const mayUseStale = normalized.code === 'RATE_LIMITED'
          || normalized.code === 'UPSTREAM_TIMEOUT'
          || normalized.code === 'UPSTREAM_UNAVAILABLE'
        if (mayUseStale && this.cache?.generation === generation) {
          return { ...this.cache.value, stale: true, staleReason: normalized.message }
        }
        throw normalized
      })
      .finally(() => {
        if (this.inFlight?.promise === promise) this.inFlight = undefined
      })
    this.inFlight = { generation, promise }
    return promise
  }

  async history(kind: HistoryKind, cursor?: string, signal?: AbortSignal, ticker?: string): Promise<HistoryPage> {
    const connection = await this.resolveConnection()
    if (connection === undefined) throw new AppError('NOT_CONNECTED', 'Trading 212 尚未连接', 409, '没有可用的连接记录', '打开设置并连接只读 API 密钥')
    const generation = this.generation(connection.record)
    let value: HistoryPage
    try { value = await this.clientFactory(credentialsOf(connection.record), this.timeoutMs).history(kind, cursor, signal, ticker) }
    catch (error) { throw normalizeError(error) }
    const latest = await this.resolveConnection(false)
    if (latest === undefined || this.generation(latest.record) !== generation) {
      throw new AppError('CONNECTION_CHANGED', '连接已在请求期间变化', 409, '返回的历史数据属于旧凭据世代', '重新打开历史页面读取当前连接的数据')
    }
    return value
  }
}
