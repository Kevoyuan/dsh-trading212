// @vitest-environment jsdom
import { cleanup, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { PortfolioSnapshot } from '../trading212.ts'

const snapshot: PortfolioSnapshot = {
  environment: 'demo', fetchedAt: '2026-08-24T10:00:00.000Z',
  account: { currency: 'EUR', totalValue: 1250, cash: { availableToTrade: 250 } },
  positions: [{ quantity: 2, quantityAvailableForTrading: 2, averagePricePaid: 200, currentPrice: 225, instrument: { ticker: 'AAPL_US_EQ', isin: 'US0378331005', name: 'Apple', currency: 'USD' }, walletImpact: { currentValue: 1000, totalCost: 950, unrealizedProfitLoss: 50 } }],
  pendingOrders: [],
  analytics: {
    currency: 'EUR', totalValue: 1250, investedValue: 1000, positionMarketValue: 1000, totalCost: 950, availableCash: 250, cashInPies: 0,
    reservedForOrders: 0, unrealizedProfitLoss: 50, positionUnrealizedProfitLoss: 50, realizedProfitLoss: 0, fxImpact: 0, unrealizedReturnPercent: 5.26,
    investedWeightPercent: 80, availableCashWeightPercent: 20, top1WeightPercent: 100, top3WeightPercent: 100,
    positionCount: 1, piePositionCount: 0,
    allocation: [{ ticker: 'AAPL_US_EQ', name: 'Apple', instrumentCurrency: 'EUR', currentValue: 1000, totalCost: 950, unrealizedProfitLoss: 50, fxImpact: 0, weightPercent: 100, returnPercent: 5.26 }],
    currencyExposure: [{ currency: 'EUR', currentValue: 1000, weightPercent: 100, positions: 1 }],
  },
}

const mocks = vi.hoisted(() => ({
  status: vi.fn(), portfolio: vi.fn(), history: vi.fn(), market: vi.fn(), connect: vi.fn(), disconnect: vi.fn(), diagnosticText: vi.fn(() => 'diagnostic'),
}))

vi.mock('./api.ts', async importOriginal => {
  const original = await importOriginal<typeof import('./api.ts')>()
  return { ...original, api: { status: mocks.status, portfolio: mocks.portfolio, history: mocks.history, market: mocks.market, connect: mocks.connect, disconnect: mocks.disconnect }, diagnosticText: mocks.diagnosticText }
})

import { App, tickerLabel } from './App.tsx'
import { languageStore } from './i18n.ts'

describe('Trading 212 UI interactions', () => {
  beforeEach(() => { vi.clearAllMocks(); languageStore.setPreference('auto'); mocks.status.mockResolvedValue({ connected: false, environment: 'demo', writable: true, source: 'none' }); mocks.portfolio.mockResolvedValue(snapshot); mocks.market.mockResolvedValue({ source: 'Yahoo Finance', symbol: 'AAPL', exchange: 'NMS', currency: 'USD', range: '1y', interval: '1d', fetchedAt: '2026-08-24T10:00:00Z', regularMarketPrice: 225, candles: Array.from({ length: 24 }, (_, index) => ({ time: new Date(Date.UTC(2026, 7, index + 1)).toISOString(), close: 200 + index })) }); mocks.history.mockImplementation(async (kind: string) => kind === 'orders' ? { kind, items: [
    { order: { id: 1, ticker: 'AAPL_US_EQ', side: 'BUY', status: 'FILLED', type: 'MARKET', instrument: { name: 'Apple', currency: 'USD' } }, fill: { id: 11, filledAt: '2026-08-01T10:00:00Z', price: 210, quantity: 1, walletImpact: { currency: 'EUR', netValue: -190 } } },
    { order: { id: 2, ticker: 'AAPL_US_EQ', side: 'SELL', status: 'FILLED', type: 'MARKET', instrument: { name: 'Apple', currency: 'USD' } }, fill: { id: 12, filledAt: '2026-08-20T10:00:00Z', price: 225, quantity: 0.5, walletImpact: { currency: 'EUR', netValue: 102, realisedProfitLoss: 7 } } },
  ] } : { kind, items: [] }); mocks.disconnect.mockResolvedValue({ connected: false }) })
  afterEach(cleanup)

  it('shows current public tickers while retaining Trading 212 instrument keys internally', () => {
    expect(tickerLabel('YNDX_US_EQ')).toBe('NBIS')
    expect(tickerLabel('SNDK1_US_EQ')).toBe('SNDK')
    expect(tickerLabel('MDB_US_EQ')).toBe('MDB')
  })

  it('connects with the selected environment and every primary navigation button changes view', async () => {
    const user = userEvent.setup()
    mocks.connect.mockResolvedValue({ status: { connected: true, environment: 'live', writable: true, source: 'record' }, snapshot: { ...snapshot, environment: 'live' } })
    render(<App />)
    await screen.findByRole('heading', { name: '连接你的 Trading 212' })

    await user.click(screen.getByText('Live'))
    await user.type(screen.getByLabelText('API Key'), 'key-12345678')
    await user.type(screen.getByLabelText('API Secret'), 'secret-12345678')
    await user.click(screen.getByRole('button', { name: '测试并保存' }))
    await screen.findByText('账户总价值 · EUR')
    expect(screen.getByRole('heading', { name: '资产配置' })).toBeTruthy()
    expect(screen.getByRole('heading', { name: '主要持仓' })).toBeTruthy()
    expect(mocks.connect).toHaveBeenCalledWith({ apiKey: 'key-12345678', apiSecret: 'secret-12345678', environment: 'live' })

    await user.click(screen.getByRole('button', { name: '持仓' }))
    expect(await screen.findByRole('heading', { name: '持仓' })).toBeTruthy()
    await user.click(screen.getByRole('button', { name: '历史' }))
    expect(await screen.findByRole('img', { name: /Apple 的成交价格时间线，共 2 个真实成交点/ })).toBeTruthy()
    expect(screen.getByText('仅显示真实成交点，不是市场 K 线')).toBeTruthy()
    expect(screen.getByText('已加载记录')).toBeTruthy()
    await user.click(screen.getByRole('tab', { name: '资金流水' }))
    await waitFor(() => expect(mocks.history).toHaveBeenCalledWith('transactions', undefined))
    await user.click(screen.getByRole('button', { name: '设置' }))
    expect(await screen.findByText('凭据来源')).toBeTruthy()
    await user.click(screen.getByRole('button', { name: '帮助' }))
    expect(await screen.findByRole('heading', { name: '帮助' })).toBeTruthy()
    await user.click(screen.getByRole('button', { name: '概览' }))
    expect(await screen.findByText('主要持仓')).toBeTruthy()
  })

  it('requires confirmation, disconnects, and returns to setup', async () => {
    mocks.status.mockResolvedValue({ connected: true, environment: 'demo', writable: true, source: 'record' })
    render(<App />)
    const user = userEvent.setup()
    await screen.findByText('账户总价值 · EUR')
    await user.click(screen.getByRole('button', { name: '设置' }))
    await user.click(screen.getByRole('button', { name: '断开连接' }))
    expect(screen.getByRole('dialog')).toBeTruthy()
    await user.click(screen.getByRole('button', { name: '确认断开' }))
    await waitFor(() => expect(mocks.disconnect).toHaveBeenCalledOnce())
    expect(await screen.findByRole('heading', { name: '连接你的 Trading 212' })).toBeTruthy()
  })

  it('follows dsh by default and persists a manual English preference', async () => {
    mocks.status.mockResolvedValue({ connected: true, environment: 'demo', writable: true, source: 'record' })
    render(<App />)
    const user = userEvent.setup()
    await screen.findByText('账户总价值 · EUR')
    await user.click(screen.getByRole('button', { name: '设置' }))
    expect(screen.getByRole('radio', { name: '自动（跟随 dsh）' }).getAttribute('aria-checked')).toBe('true')
    await user.click(screen.getByRole('radio', { name: 'English' }))
    expect(await screen.findByRole('button', { name: 'Overview' })).toBeTruthy()
    expect(screen.getByRole('heading', { name: 'Settings' })).toBeTruthy()
    expect(localStorage.getItem('dsh-trading212:language')).toBe('en')
    await user.click(screen.getByRole('radio', { name: 'Auto (follow dsh)' }))
    expect(await screen.findByRole('button', { name: '概览' })).toBeTruthy()
    expect(localStorage.getItem('dsh-trading212:language')).toBeNull()
  })

  it('opens a holding with Yahoo prices and Trading 212 buy and sell markers', async () => {
    mocks.status.mockResolvedValue({ connected: true, environment: 'demo', writable: true, source: 'record' })
    render(<App />)
    const user = userEvent.setup()
    await screen.findByText('账户总价值 · EUR')
    await user.click(screen.getByRole('button', { name: /Apple.*AAPL.*USD/ }))
    expect(await screen.findByRole('heading', { name: 'Apple' })).toBeTruthy()
    expect(await screen.findByRole('img', { name: /Apple 1年历史价格曲线，包含 2 个买卖成交点/ })).toBeTruthy()
    const points = screen.getByLabelText('成交点明细')
    expect(within(points).getByText(/买入.*成交价/)).toBeTruthy()
    expect(within(points).getByText(/卖出.*成交价/)).toBeTruthy()
    expect(screen.getByText(/价格来源：Yahoo Finance/)).toBeTruthy()
    expect(mocks.history).toHaveBeenCalledWith('orders', undefined, 'AAPL_US_EQ')
    expect(mocks.market).toHaveBeenCalledWith('AAPL_US_EQ', '1y')
    await user.click(screen.getByRole('radio', { name: '1天' }))
    await waitFor(() => expect(mocks.market).toHaveBeenCalledWith('AAPL_US_EQ', '1d'))
    await user.click(screen.getByRole('radio', { name: '1周' }))
    await waitFor(() => expect(mocks.market).toHaveBeenCalledWith('AAPL_US_EQ', '1w'))
    await user.click(screen.getByRole('radio', { name: '3个月' }))
    await waitFor(() => expect(mocks.market).toHaveBeenCalledWith('AAPL_US_EQ', '3m'))
    await user.click(screen.getByRole('button', { name: /返回持仓/ }))
    expect(await screen.findByRole('heading', { name: '持仓' })).toBeTruthy()
  })
})
