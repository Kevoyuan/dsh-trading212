import type { IPrimitivePaneView, ISeriesPrimitive, SeriesAttachedParameter, Time } from 'lightweight-charts'

export interface TradeDot {
  time: Time
  price: number
  color: string
}

/** Draw fills in chart coordinates so dots follow zoom, pan, resize and DPR. */
export function createTradeDots(dots: TradeDot[], surface: string): ISeriesPrimitive<Time> {
  let attached: SeriesAttachedParameter<Time> | undefined
  const views: IPrimitivePaneView[] = [{
    zOrder: () => 'top',
    renderer: () => ({
      draw(target) {
        if (!attached) return
        const { chart, series } = attached
        target.useMediaCoordinateSpace(({ context, mediaSize }) => {
          context.save()
          context.beginPath()
          context.rect(0, 0, mediaSize.width, mediaSize.height)
          context.clip()
          for (const dot of dots) {
            const x = chart.timeScale().timeToCoordinate(dot.time)
            const y = series.priceToCoordinate(dot.price)
            if (x === null || y === null || x < -12 || x > mediaSize.width + 12) continue
            context.beginPath()
            context.arc(x, y, 3.5, 0, Math.PI * 2)
            context.fillStyle = dot.color
            context.shadowColor = `${dot.color}99`
            context.shadowBlur = 8
            context.fill()
            context.shadowBlur = 0
            context.lineWidth = 1.5
            context.strokeStyle = surface
            context.stroke()
          }
          context.restore()
        })
      },
    }),
  }]
  return {
    attached(params) { attached = params; params.requestUpdate() },
    detached() { attached = undefined },
    paneViews: () => views,
    autoscaleInfo(start, end) {
      if (!attached) return null
      const prices = dots.filter(dot => {
        const index = attached!.chart.timeScale().timeToIndex(dot.time)
        return index !== null && index >= start && index <= end
      }).map(dot => dot.price)
      if (!prices.length) return null
      return { priceRange: { minValue: Math.min(...prices), maxValue: Math.max(...prices) } }
    },
  }
}
