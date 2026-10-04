type FittedGrid = {
  columns: number
  /** The width a cell gets; its height is this times the cell's aspect. */
  side: number
}

/**
 * The column count that deals `count` cells into a box with the largest cell
 * that still fits, each cell `aspect` times as tall as it is wide. A square
 * root of the area per cell is the right size and the wrong grid: twenty-six
 * cells at 89px in a 438×474 box deal five across and six down, 606px tall —
 * so every count of columns is tried, and the rows it leads to are paid for.
 */
export const fittedGrid = ({
  aspect,
  count,
  gap,
  height,
  width
}: {
  aspect: number
  count: number
  gap: number
  height: number
  width: number
}): FittedGrid => {
  let best: FittedGrid = { columns: 1, side: 0 }

  for (let columns = 1; columns <= Math.max(count, 1); columns += 1) {
    const rows = Math.ceil(count / columns)
    const side = Math.min(
      (width - (columns - 1) * gap) / columns,
      (height - (rows - 1) * gap) / rows / aspect
    )

    if (side > best.side) {
      best = { columns, side }
    }
  }

  return best
}
