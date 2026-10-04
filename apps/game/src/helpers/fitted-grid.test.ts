import { describe, expect, it } from 'vitest'

import { fittedGrid } from './fitted-grid'

describe('fittedGrid', () => {
  it('[layout] pays for the rows a square-root size leads to', () => {
    const grid = fittedGrid({
      aspect: 1.06,
      count: 26,
      gap: 8,
      height: 474,
      width: 438
    })
    const rows = Math.ceil(26 / grid.columns)

    expect(rows * grid.side * 1.06 + (rows - 1) * 8).toBeLessThanOrEqual(474)
    expect(grid.side).toBeGreaterThan(68)
  })

  it('[layout] lays a few cells in one row across a wide box', () => {
    expect(
      fittedGrid({ aspect: 1, count: 4, gap: 0, height: 300, width: 1200 })
    ).toEqual({ columns: 4, side: 300 })
  })
})
