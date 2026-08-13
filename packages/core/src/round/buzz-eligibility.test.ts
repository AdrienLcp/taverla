import { describe, expect, it } from 'vitest'

import {
  DEFAULT_ROOM_SETTINGS,
  type PlayerRoomView,
  type RoomPhase,
  type RoundView
} from '@taverla/protocol/room'

import {
  type BuzzBlocker,
  type BuzzRejection,
  findBuzzBlocker,
  findBuzzRejection,
  hasEligibleBuzzer
} from './buzz-eligibility'

const runningRound: RoundView = {
  activeBuzz: null,
  answers: [],
  awards: [],
  content: { choices: [], kind: 'blindtest', revealedTrack: null },
  id: 'r1',
  index: 1,
  lockedOutPlayerIds: [],
  revealedAnswers: [],
  startsAt: 1_000
}

const viewFor = (
  phase: RoomPhase,
  round: RoundView | null = runningRound
): PlayerRoomView => ({
  code: 'K3M9',
  isHostConnected: true,
  phase,
  players: [{ id: 'me', isConnected: true, nickname: 'Alice', score: 0 }],
  round,
  roundElapsedMs: 0,
  settings: DEFAULT_ROOM_SETTINGS,
  youId: 'me',
  yourVerdict: null
})

describe('findBuzzBlocker', () => {
  it('[buzz] arms the buzzer while the clip is running', () => {
    expect(findBuzzBlocker(viewFor('playing'))).toBeNull()
  })

  it('[buzz] kills the buzzer while the host is away, and says so', () => {
    expect(
      findBuzzBlocker({ ...viewFor('playing'), isHostConnected: false })
    ).toBe('host_away')
  })

  it('[buzz] blames the absent host rather than the player who is out', () => {
    const lockedOut = viewFor('playing', {
      ...runningRound,
      lockedOutPlayerIds: ['me']
    })

    expect(findBuzzBlocker({ ...lockedOut, isHostConnected: false })).toBe(
      'host_away'
    )
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
      activeBuzz: { atServerTime: 1_500, expiresAt: null, playerId: 'me' }
    }
    const theirs = {
      ...runningRound,
      activeBuzz: { atServerTime: 1_500, expiresAt: null, playerId: 'bob' }
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
      activeBuzz: { atServerTime: 1_500, expiresAt: null, playerId: 'bob' },
      lockedOutPlayerIds: ['me']
    }

    expect(
      findBuzzBlocker(viewFor('buzzed', lockedOutAndBusy))
    ).toBe<BuzzBlocker>('you_already_missed')
  })
})

const arrivingBuzz = {
  claimedRoundId: 'r1',
  currentRoundId: 'r1',
  hasActiveBuzz: false,
  isLockedOut: false,
  phase: 'playing'
} as const

describe('findBuzzRejection', () => {
  it('[buzz] accepts a buzz on the running round', () => {
    expect(findBuzzRejection(arrivingBuzz)).toBeNull()
  })

  it('[buzz] refuses a buzz when no round is running', () => {
    expect(
      findBuzzRejection({ ...arrivingBuzz, currentRoundId: null })
    ).toBe<BuzzRejection>('wrong_phase')
  })

  it('[buzz] calls a thumb that landed after the round turned over stale, not misphased', () => {
    expect(
      findBuzzRejection({
        ...arrivingBuzz,
        claimedRoundId: 'r1',
        currentRoundId: 'r2',
        phase: 'countdown'
      })
    ).toBe<BuzzRejection>('stale_round')
  })

  it('[buzz] refuses a locked-out player ahead of a second buzzer', () => {
    expect(
      findBuzzRejection({
        ...arrivingBuzz,
        hasActiveBuzz: true,
        isLockedOut: true
      })
    ).toBe<BuzzRejection>('player_locked_out')
  })

  it('[buzz] refuses the second thumb on the same round', () => {
    expect(
      findBuzzRejection({
        ...arrivingBuzz,
        hasActiveBuzz: true,
        phase: 'buzzed'
      })
    ).toBe<BuzzRejection>('already_buzzed')
  })

  it('[buzz] refuses a buzz during the countdown', () => {
    expect(
      findBuzzRejection({ ...arrivingBuzz, phase: 'countdown' })
    ).toBe<BuzzRejection>('wrong_phase')
  })
})

describe('hasEligibleBuzzer', () => {
  const alice = { id: 'alice', isConnected: true }
  const bob = { id: 'bob', isConnected: true }

  it('[buzz] keeps the round alive while someone can still answer', () => {
    expect(
      hasEligibleBuzzer({
        candidates: [alice, bob],
        lockedOutPlayerIds: ['alice']
      })
    ).toBe(true)
  })

  it('[buzz] ends the round once everyone has missed', () => {
    expect(
      hasEligibleBuzzer({
        candidates: [alice, bob],
        lockedOutPlayerIds: ['alice', 'bob']
      })
    ).toBe(false)
  })

  it('[buzz] does not hold the round open for a phone that dropped off', () => {
    expect(
      hasEligibleBuzzer({
        candidates: [alice, { ...bob, isConnected: false }],
        lockedOutPlayerIds: ['alice']
      })
    ).toBe(false)
  })

  it('[buzz] ends the round when the room emptied mid-clip', () => {
    expect(hasEligibleBuzzer({ candidates: [], lockedOutPlayerIds: [] })).toBe(
      false
    )
  })
})
