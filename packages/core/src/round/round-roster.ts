import type { PlayerId } from '@taverla/protocol/identifiers'

import { isStillExpected } from '../room/seat-presence'

type RoundParticipant = {
  disconnectedAt: number | null
  id: PlayerId
  isConnected: boolean
}

/**
 * Who a round opened on, stamped when its clip starts rather than when it is
 * created: the countdown is three seconds of a screen saying "get ready", and a
 * phone that lands inside it is in the round. `null` until then, which is what
 * makes nobody a latecomer before there is anything to be late for.
 */
export type RoundRoster = ReadonlySet<PlayerId> | null

/**
 * Whether this phone arrived after the round was under way. It keeps its seat
 * and plays from the next round; what it must not do is act in this one, or be
 * waited for by it.
 */
export const hasJoinedAfterStart = ({
  openedWithPlayerIds,
  playerId
}: {
  openedWithPlayerIds: RoundRoster
  playerId: PlayerId
}): boolean =>
  openedWithPlayerIds !== null && !openedWithPlayerIds.has(playerId)

/**
 * Whether the round should still wait for this player before closing a phase
 * everybody else has finished: the conjunction of having been in it when it
 * opened and of the seat still being held.
 */
export const isExpectedInRound = ({
  now,
  openedWithPlayerIds,
  participant
}: {
  now: number
  openedWithPlayerIds: RoundRoster
  participant: RoundParticipant
}): boolean =>
  !hasJoinedAfterStart({ openedWithPlayerIds, playerId: participant.id }) &&
  isStillExpected(participant, now)
