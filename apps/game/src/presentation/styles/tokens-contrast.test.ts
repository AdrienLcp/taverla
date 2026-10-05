import { readFileSync } from 'node:fs'

import { findContrastFailures, WCAG_AA } from '@adrienlcp/styles/contrast'
import { describe, expect, it } from 'vitest'

const TOKENS = readFileSync(new URL('_tokens.sass', import.meta.url), 'utf8')

const TILES = [1, 2, 3, 4] as const

const PAWNS = [1, 2, 3, 4, 5, 6, 7, 8] as const

const PHASE_MARKS = [
  { background: '--track-five', foreground: '--track-ink' },
  { background: '--spine-reflex', foreground: '--on-spine-light' },
  { background: '--spine-quiz', foreground: '--on-spine' },
  { background: '--primary', foreground: '--on-primary' },
  { background: '--good', foreground: '--on-spine' },
  { background: '--pawn-1', foreground: '--on-spine' }
] as const

describe('colour tokens', () => {
  it('[contrast] every ink reads on the ground it is printed on, in both themes', () => {
    expect(
      findContrastFailures(TOKENS, [
        {
          background: '--board',
          foreground: '--board-ink',
          minimum: WCAG_AA.text
        },
        {
          background: '--board',
          foreground: '--board-muted',
          minimum: WCAG_AA.text
        },
        {
          background: '--card',
          foreground: '--card-ink',
          minimum: WCAG_AA.text
        },
        {
          background: '--card',
          foreground: '--card-muted',
          minimum: WCAG_AA.text
        },
        {
          background: '--track-a',
          foreground: '--track-ink',
          minimum: WCAG_AA.text
        },
        {
          background: '--track-b',
          foreground: '--track-ink',
          minimum: WCAG_AA.text
        },
        {
          background: '--socket',
          foreground: '--socket-ink',
          minimum: WCAG_AA.text
        },
        {
          background: '--danger',
          foreground: '--danger-ink',
          minimum: WCAG_AA.text
        },
        ...PHASE_MARKS.map((pair) => ({ ...pair, minimum: WCAG_AA.text })),
        ...PAWNS.map((pawn) => ({
          background: `--pawn-${pawn}`,
          foreground: `--on-pawn-${pawn}`,
          minimum: WCAG_AA.text
        })),
        ...TILES.flatMap((tile) => [
          {
            background: `--tile-${tile}`,
            foreground: '--tile-ink',
            minimum: WCAG_AA.text
          },
          {
            background: `--tile-${tile}`,
            foreground: `--tile-mark-${tile}`,
            minimum: WCAG_AA.nonText
          }
        ]),
        {
          background: '--socket',
          foreground: '--socket-line',
          minimum: WCAG_AA.nonText
        },
        // The reveal's hold bar drains in the phase's ink along a socket.
        {
          background: '--socket',
          foreground: '--good',
          minimum: WCAG_AA.nonText
        }
      ])
    ).toEqual([])
  })
})
