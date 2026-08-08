import { describe, expect, it } from 'vitest'

import type {
  PlayerRoomView,
  RoomPhase,
  RoundView
} from '@blindtest/protocol/room'

import { type BuzzBlocker, findBuzzBlocker } from './buzz-eligibility'

const runningRound: RoundView = {
  activeBuzz: null,
  audioStartsAt: 1_000,
  awards: [],
  id: 'r1',
  index: 1,
  lockedOutPlayerIds: [],
  revealedTrack: null
}

const viewFor = (
  phase: RoomPhase,
  round: RoundView | null = runningRound
): PlayerRoomView => ({
  code: 'K3M9',
  phase,
  players: [{ id: 'me', isConnected: true, nickname: 'Alice', score: 0 }],
  round,
  settings: {
    countdownMs: 3_000,
    playbackDurationMs: 30_000,
    roundCount: 10,
    source: { kind: 'chart' }
  },
  youId: 'me'
})

describe('findBuzzBlocker', () => {
  it('[buzz] arms the buzzer while the clip is running', () => {
    expect(findBuzzBlocker(viewFor('playing'))).toBeNull()
  })

  it.each<[RoomPhase]>([['lobby'], ['countdown'], ['revealed'], ['finished']])(
    '[buzz] keeps the buzzer dead during %s',
    (phase) => {
      expect(findBuzzBlocker(viewFor(phase))).toBe<BuzzBlocker>(
        'round_not_running'
      )
    }
  )

  it('[buzz] blocks between rounds, when there is no round at all', () => {
    expect(findBuzzBlocker(viewFor('lobby', null))).toBe<BuzzBlocker>(
      'round_not_running'
    )
  })

  it('[buzz] distinguishes my pending answer from someone else holding the buzzer', () => {
    const mine = {
      ...runningRound,
      activeBuzz: { atServerTime: 1_500, playerId: 'me' }
    }
    const theirs = {
      ...runningRound,
      activeBuzz: { atServerTime: 1_500, playerId: 'bob' }
    }

    expect(findBuzzBlocker(viewFor('buzzed', mine))).toBe<BuzzBlocker>(
      'your_answer_is_pending'
    )
    expect(findBuzzBlocker(viewFor('buzzed', theirs))).toBe<BuzzBlocker>(
      'someone_else_buzzed'
    )
  })

  // The lockout outlasts every other reason, so it wins even while another
  // player is answering — otherwise the label flickers between the two.
  it('[buzz] reports the lockout ahead of a transient reason', () => {
    const lockedOutAndBusy = {
      ...runningRound,
      activeBuzz: { atServerTime: 1_500, playerId: 'bob' },
      lockedOutPlayerIds: ['me']
    }

    expect(
      findBuzzBlocker(viewFor('buzzed', lockedOutAndBusy))
    ).toBe<BuzzBlocker>('you_already_missed')
  })
})
