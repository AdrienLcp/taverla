import type React from 'react'
import { useLayoutEffect, useRef, useState } from 'react'

import type { PublicPlayer } from '@taverla/protocol/room'

import { useTranslate } from '@/presentation/i18n/i18n-provider'

import { Pawn } from './pawn'

import './score-track.sass'

const SQUARES_PER_MARK = 5
const MIN_COLUMNS = 5
const MIN_ROWS = 4

type TrackShape = { columns: number; rows: number }

type ScoreTrackProps = {
  /**
   * The room's roster in seat order, which is what picks each pawn's colour —
   * the same order every other screen names them in.
   */
  players: readonly PublicPlayer[]
}

/**
 * The board's edge, counted the way a printed score track is: square nought is
 * the start, every fifth one is printed heavier, and a score past the last
 * square goes round again. Each player's pawn stands on their score.
 *
 * Decorative to assistive technology: the standings say the same thing in
 * words wherever the room is told the score.
 */
export const ScoreTrack: React.FC<ScoreTrackProps> = ({ players }) => {
  const translate = useTranslate()
  const trackRef = useRef<HTMLDivElement>(null)
  const bandRef = useRef<HTMLSpanElement>(null)
  const [shape, setShape] = useState<TrackShape | null>(null)

  useLayoutEffect(() => {
    const track = trackRef.current
    const band = bandRef.current

    if (track === null || band === null) {
      return
    }

    const measure = () => {
      const bandSize = band.offsetWidth

      if (bandSize === 0) {
        setShape(null)

        return
      }

      const columns = Math.max(
        MIN_COLUMNS,
        Math.round(track.clientWidth / bandSize)
      )
      const rows = Math.max(MIN_ROWS, Math.round(track.clientHeight / bandSize))

      setShape((current) =>
        current?.columns === columns && current.rows === rows
          ? current
          : { columns, rows }
      )
    }

    const observer = new ResizeObserver(measure)

    observer.observe(track)
    observer.observe(band)

    return () => {
      observer.disconnect()
    }
  }, [])

  const squareCount = shape === null ? 0 : perimeterOf(shape)

  return (
    <div
      aria-hidden='true'
      className='score-track'
      ref={trackRef}
      style={
        shape === null
          ? undefined
          : {
              '--track-inner-columns': shape.columns - 2,
              '--track-inner-rows': shape.rows - 2
            }
      }
    >
      <span className='band-probe' ref={bandRef} />
      {shape !== null &&
        squaresOf(squareCount).map((square) => {
          const [column, row] = cellOf({ shape, square })
          const standing = players
            .map((player, seat) => ({ player, seat }))
            .filter(({ player }) => player.score % squareCount === square)

          return (
            <div
              className='square'
              data-mark={
                square === 0
                  ? 'start'
                  : square % SQUARES_PER_MARK === 0
                    ? 'five'
                    : undefined
              }
              data-parity={square % 2 === 0 ? 'even' : 'odd'}
              key={square}
              style={{
                '--column': column,
                '--pawn-scale': pawnScaleFor(standing.length),
                '--row': row
              }}
            >
              <span className='number'>
                {square === 0 ? translate('room.track.start') : square}
              </span>
              {standing.length > 0 && (
                <span className='pawns'>
                  {standing.map(({ player, seat }) => (
                    <span
                      className='standing'
                      // Keyed on the square as well, so a pawn that moves is a
                      // new element and lands rather than teleports.
                      key={`${player.id}:${square}`}
                    >
                      <Pawn seat={seat} />
                    </span>
                  ))}
                </span>
              )}
            </div>
          )
        })}
    </div>
  )
}

/**
 * A pawn's height as a share of the band, measured so a square's whole crowd
 * fits under its number: the table starts the game on one square.
 */
const pawnScaleFor = (standing: number): number => {
  if (standing <= 1) {
    return 0.45
  }

  if (standing === 2) {
    return 0.38
  }

  if (standing <= 4) {
    return 0.27
  }

  if (standing <= 6) {
    return 0.24
  }

  if (standing <= 9) {
    return 0.2
  }

  if (standing <= 16) {
    return 0.15
  }

  return 0.12
}

const squaresOf = (count: number): number[] =>
  Array.from({ length: count }, (_, square) => square)

const perimeterOf = ({ columns, rows }: TrackShape): number =>
  2 * columns + 2 * (rows - 2)

/** The grid cell, one-based, of a square counted clockwise from the top-left corner. */
const cellOf = ({
  shape: { columns, rows },
  square
}: {
  shape: TrackShape
  square: number
}): [number, number] => {
  if (square < columns) {
    return [square + 1, 1]
  }

  if (square < columns + rows - 1) {
    return [columns, square - columns + 2]
  }

  if (square < 2 * columns + rows - 2) {
    return [2 * columns + rows - 2 - square, rows]
  }

  return [1, 2 * columns + 2 * rows - 3 - square]
}
