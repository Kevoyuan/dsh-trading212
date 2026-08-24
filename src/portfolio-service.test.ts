import { describe, expect, it, vi } from 'vitest'
import type { CredentialKey, CredentialProvider, CredentialRecord, CredentialRef } from '@deepseek-ai/dsh-credentials'
import { CONNECTION_REF, LEGACY_ENV_REF, LEGACY_KEY_REF, LEGACY_SECRET_REF, PortfolioService } from './portfolio-service.ts'
import { Trading212Error, type PortfolioSnapshot, type Trading212Credentials } from './trading212.ts'

const snapshot: PortfolioSnapshot = {
  environment: 'demo', fetchedAt: '2026-08-24T10:00:00.000Z',
  account: { currency: 'EUR', totalValue: 100 }, positions: [], pendingOrders: [],
  analytics: { currency: 'EUR', totalValue: 100, investedValue: 0, positionMarketValue: 0, totalCost: 0, availableCash: 0, cashInPies: 0, reservedForOrders: 0, unrealizedProfitLoss: 0, positionUnrealizedProfitLoss: 0, realizedProfitLoss: 0, fxImpact: 0, top1WeightPercent: 0, top3WeightPercent: 0, positionCount: 0, piePositionCount: 0, allocation: [], currencyExposure: [] },
}

class MemoryCredentials {
  readonly refs = new Map<string, string>()
  readonly records = new Map<string, CredentialRecord>()

  async resolve(ref: CredentialRef) { const value = this.refs.get(String(ref)); return value === undefined ? undefined : { value, source: 'file' } }
  async describe(ref: CredentialRef) { return { configured: this.refs.has(String(ref)), source: 'file', writable: true } }
  async set(ref: CredentialRef, value: string) { this.refs.set(String(ref), value) }
  async unset(ref: CredentialRef) { this.refs.delete(String(ref)) }
  async readRecord(key: CredentialKey) { return this.records.get(String(key)) }
  async describeRecord(key: CredentialKey) { const record = this.records.get(String(key)); return { configured: record !== undefined, kind: record?.kind, writable: true } }
  async modifyRecord(key: CredentialKey, mutate: (current: CredentialRecord | undefined) => Promise<CredentialRecord | undefined>) {
    const next = await mutate(this.records.get(String(key)))
    if (next !== undefined) this.records.set(String(key), next)
    return this.records.get(String(key))
  }
}

class ReferenceOnlyCredentials {
  readonly refs = new Map<string, string>()
  async resolve(ref: CredentialRef) { const value = this.refs.get(String(ref)); return value === undefined ? undefined : { value, source: 'file' } }
  async describe(ref: CredentialRef) { return { configured: this.refs.has(String(ref)), source: 'file', writable: true } }
  async set(ref: CredentialRef, value: string) { this.refs.set(String(ref), value) }
  async unset(ref: CredentialRef) { this.refs.delete(String(ref)) }
}

function service(provider: MemoryCredentials | ReferenceOnlyCredentials, values: Array<PortfolioSnapshot | Error> = [snapshot]) {
  let index = 0
  const factory = vi.fn((credentials: Trading212Credentials) => ({
    portfolioSnapshot: vi.fn(async () => {
      const value = values[Math.min(index++, values.length - 1)]!
      if (value instanceof Error) throw value
      return { ...value, environment: credentials.environment }
    }),
  }))
  return { instance: new PortfolioService(provider as unknown as CredentialProvider, 1000, 1000, factory as never), factory }
}

const input: Trading212Credentials = { apiKey: 'key-12345678', apiSecret: 'secret-12345678', environment: 'demo' }

describe('PortfolioService credentials', () => {
  it('persists one canonical reference on the credential API used by the installed dsh desktop', async () => {
    const provider = new ReferenceOnlyCredentials()
    const first = service(provider).instance
    await first.connect(input)
    expect(provider.refs.has(String(CONNECTION_REF))).toBe(true)

    const restarted = service(provider).instance
    await expect(restarted.status()).resolves.toMatchObject({ connected: true, source: 'reference' })
    await expect(restarted.snapshot()).resolves.toMatchObject({ account: { totalValue: 100 } })
  })

  it('durably saves one official credential record and survives a new service instance', async () => {
    const provider = new MemoryCredentials()
    await service(provider).instance.connect(input)

    expect(provider.records.get('dsh-trading212/connection')).toEqual({ kind: 'grant', payload: { version: 1, state: 'connected', ...input } })
    const reloaded = service(provider)
    await expect(reloaded.instance.status()).resolves.toMatchObject({ connected: true, environment: 'demo', source: 'record' })
    await expect(reloaded.instance.snapshot()).resolves.toMatchObject({ account: { totalValue: 100 } })
    expect(reloaded.factory).toHaveBeenCalledWith(input, 1000)
  })

  it('migrates the former split references into the canonical record', async () => {
    const provider = new MemoryCredentials()
    provider.refs.set(String(LEGACY_KEY_REF), input.apiKey)
    provider.refs.set(String(LEGACY_SECRET_REF), input.apiSecret)
    provider.refs.set(String(LEGACY_ENV_REF), input.environment)

    await expect(service(provider).instance.status()).resolves.toMatchObject({ connected: true, source: 'record' })
    expect(provider.records.get('dsh-trading212/connection')).toBeDefined()
    expect(provider.refs.has(String(LEGACY_KEY_REF))).toBe(false)
    expect(provider.refs.has(String(LEGACY_SECRET_REF))).toBe(false)
  })

  it('writes a disconnect tombstone so an older reference cannot resurrect a connection', async () => {
    const provider = new MemoryCredentials()
    const current = service(provider).instance
    await current.connect(input)
    provider.refs.set(String(CONNECTION_REF), JSON.stringify({ version: 1, state: 'connected', ...input }))
    await current.disconnect()

    await expect(service(provider).instance.status()).resolves.toMatchObject({ connected: false })
    expect(provider.records.get('dsh-trading212/connection')).toEqual({ kind: 'grant', payload: { version: 1, state: 'disconnected' } })
  })

  it('only serves stale data for transient failures from the same connection', async () => {
    const provider = new MemoryCredentials()
    const current = service(provider, [snapshot, new Trading212Error('offline', 503)]).instance
    await current.connect(input)
    await expect(current.snapshot(true)).resolves.toMatchObject({ stale: true, account: { totalValue: 100 } })

    const denied = service(provider, [snapshot, new Trading212Error('denied', 401)]).instance
    await denied.snapshot()
    await expect(denied.snapshot(true)).rejects.toMatchObject({ code: 'INVALID_CREDENTIALS' })
  })
})
