import type React from 'react'
import {
  Button as ReactAriaButton,
  type ButtonProps as ReactAriaButtonProps
} from 'react-aria-components'

import { TileMark } from './tile-mark'

import './answer-tile.sass'

type AnswerTileProps = Omit<ReactAriaButtonProps, 'children' | 'className'> & {
  /** Which of the four tiles, and so its ink and its shape. */
  index: number
  /** Whether this is the tile the player took, which stays inked once spent. */
  isChosen?: boolean
  /** The blind test's second line — the artist — or `null` for one line. */
  subtitle: string | null
  title: string
}

/**
 * One of the four die-cut answer tiles: its own ink, its own shape, and the
 * candidate printed on it. Sized by the box it is dealt into, never by its
 * words — the list it sits in publishes how long the longest candidate is.
 */
export const AnswerTile: React.FC<AnswerTileProps> = ({
  index,
  isChosen = false,
  subtitle,
  title,
  ...props
}) => (
  <ReactAriaButton
    {...props}
    className='answer-tile'
    data-chosen={isChosen || undefined}
    style={{
      '--tile': `var(--tile-${(index % 4) + 1})`,
      '--tile-mark': `var(--tile-mark-${(index % 4) + 1})`
    }}
  >
    <span className='face'>
      <TileMark index={index} />
      <span className='title'>{title}</span>
      {subtitle !== null && <span className='subtitle'>{subtitle}</span>}
    </span>
  </ReactAriaButton>
)
