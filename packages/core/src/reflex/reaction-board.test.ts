import { describe, expect, it } from 'vitest'

import type { PlayerId } from '@taverla/protocol/identifiers'

import { buildReactionBoard } from './reaction-board'

const FLIPS_AT = 1_700_000_000_000

const playerId = (name: string): PlayerId => name as PlayerId

describe('the board a heat leaves behind', () => {
  it('[reflex] keeps arrival order, because it is already reaction order', () => {
    const board = buildReactionBoard({
      flipsAt: FLIPS_AT,
      jumpedPlayerIds: [],
      taps: [
        { atServerTime: FLIPS_AT + 248, playerId: playerId('lea') },
        { atServerTime: FLIPS_AT + 301, playerId: playerId('marc') },
        { atServerTime: FLIPS_AT + 517, playerId: playerId('sam') }
      ]
    })

    expect(board).toEqual([
      { kind: 'reacted', playerId: 'lea', reactionMs: 248 },
      { kind: 'reacted', playerId: 'marc', reactionMs: 301 },
      { kind: 'reacted', playerId: 'sam', reactionMs: 517 }
    ])
  })

  it('[reflex] puts everyone who jumped under everyone who reacted', () => {
    const board = buildReactionBoard({
      flipsAt: FLIPS_AT,
      jumpedPlayerIds: [playerId('zoe')],
      taps: [{ atServerTime: FLIPS_AT + 190, playerId: playerId('lea') }]
    })

    expect(board).toEqual([
      { kind: 'reacted', playerId: 'lea', reactionMs: 190 },
      { kind: 'jumped', playerId: 'zoe' }
    ])
  })

  it('[reflex] lists nobody who neither tapped nor jumped', () => {
    expect(
      buildReactionBoard({ flipsAt: FLIPS_AT, jumpedPlayerIds: [], taps: [] })
    ).toEqual([])
  })

  it('[reflex] measures nothing when the screen never flipped', () => {
    expect(
      buildReactionBoard({
        flipsAt: null,
        jumpedPlayerIds: [playerId('zoe')],
        taps: [{ atServerTime: FLIPS_AT + 190, playerId: playerId('lea') }]
      })
    ).toEqual([{ kind: 'jumped', playerId: 'zoe' }])
  })
})
