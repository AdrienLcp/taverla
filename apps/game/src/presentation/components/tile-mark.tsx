import type React from 'react'

const SHAPES = [
  <circle cx='12' cy='12' key='circle' r='9' />,
  <path d='M12 3 22 20.5H2z' key='triangle' />,
  <rect height='17' key='square' rx='2' width='17' x='3.5' y='3.5' />,
  <path d='M12 1.8 22.2 12 12 22.2 1.8 12z' key='diamond' />
]

type TileMarkProps = {
  /** Which of the four tiles: a circle, a triangle, a square, a diamond. */
  index: number
}

/**
 * The shape printed on an answer tile beside its ink, so that no two tiles are
 * told apart by colour alone.
 */
export const TileMark: React.FC<TileMarkProps> = ({ index }) => (
  <svg
    aria-hidden='true'
    className='tile-mark'
    fill='currentColor'
    focusable='false'
    viewBox='0 0 24 24'
  >
    {SHAPES[index % SHAPES.length]}
  </svg>
)
