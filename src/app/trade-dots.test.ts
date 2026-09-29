import { describe, expect, it, vi } from 'vitest'
import type { IPrimitivePaneRenderer, Logical, SeriesAttachedParameter, Time } from 'lightweight-charts'
import { createTradeDots } from './trade-dots.ts'

describe('trade dots', () => {
  it('uses live chart coordinates, draws 7px dots, and releases chart references on detach', () => {
    const primitive = createTradeDots([{ time: '2026-08-05', price: 150, color: '#059669' }], '#FFFFFF')
    const x = vi.fn(() => 25)
    const y = vi.fn(() => 40)
    const requestUpdate = vi.fn()
    primitive.attached!({ chart: { timeScale: () => ({ timeToCoordinate: x }) }, series: { priceToCoordinate: y }, requestUpdate } as unknown as SeriesAttachedParameter<Time>)
    const context = { save: vi.fn(), restore: vi.fn(), beginPath: vi.fn(), rect: vi.fn(), clip: vi.fn(), arc: vi.fn(), fill: vi.fn(), stroke: vi.fn() }
    const target = { useMediaCoordinateSpace: (draw: (scope: unknown) => void) => draw({ context, mediaSize: { width: 300, height: 200 } }) } as unknown as Parameters<IPrimitivePaneRenderer['draw']>[0]
    const renderer = primitive.paneViews!()[0]!.renderer()!
    renderer.draw(target)
    expect(requestUpdate).toHaveBeenCalledOnce()
    expect(context.arc).toHaveBeenLastCalledWith(25, 40, 3.5, 0, Math.PI * 2)
    expect(y).toHaveBeenCalledWith(150)
    x.mockReturnValue(75)
    renderer.draw(target)
    expect(context.arc).toHaveBeenLastCalledWith(75, 40, 3.5, 0, Math.PI * 2)
    primitive.detached!()
    renderer.draw(target)
    expect(context.arc).toHaveBeenCalledTimes(2)
  })

  it('includes only visible fills in the price range', () => {
    const primitive = createTradeDots([
      { time: '2026-08-05', price: 150, color: '#059669' },
      { time: '2026-08-15', price: 900, color: '#E11D48' },
    ], '#FFFFFF')
    primitive.attached!({ chart: { timeScale: () => ({ timeToIndex: (time: Time) => time === '2026-08-05' ? 4 : 14 }) }, requestUpdate: vi.fn() } as unknown as SeriesAttachedParameter<Time>)
    expect(primitive.autoscaleInfo!(0 as Logical, 8 as Logical)).toEqual({ priceRange: { minValue: 150, maxValue: 150 } })
    expect(primitive.autoscaleInfo!(5 as Logical, 8 as Logical)).toBeNull()
  })
})
