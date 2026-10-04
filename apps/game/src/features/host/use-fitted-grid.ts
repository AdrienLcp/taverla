import { type RefObject, useEffect } from 'react'

import { fittedGrid } from '@/helpers/fitted-grid'

/**
 * Deals `count` cells into the grid's own box and publishes the result on it
 * as `--fitted-columns` and `--fitted-side`. The stylesheet cannot choose the
 * column count itself: the right one depends on the box's proportions and
 * the count at once, and every wrong one is a row run past the box.
 */
export const useFittedGrid = ({
  aspect,
  count,
  grid
}: {
  aspect: number
  count: number
  grid: RefObject<HTMLElement | null>
}): void => {
  useEffect(() => {
    const element = grid.current

    if (element === null) {
      return
    }

    const fit = () => {
      const style = getComputedStyle(element)
      const { columns, side } = fittedGrid({
        aspect,
        count,
        gap: Number.parseFloat(style.rowGap) || 0,
        height:
          element.clientHeight -
          Number.parseFloat(style.paddingBlockStart) -
          Number.parseFloat(style.paddingBlockEnd),
        width:
          element.clientWidth -
          Number.parseFloat(style.paddingInlineStart) -
          Number.parseFloat(style.paddingInlineEnd)
      })

      element.style.setProperty('--fitted-columns', String(columns))
      element.style.setProperty('--fitted-side', `${Math.floor(side)}px`)
    }

    const observer = new ResizeObserver(fit)

    observer.observe(element)

    return () => {
      observer.disconnect()
    }
  }, [aspect, count, grid])
}
