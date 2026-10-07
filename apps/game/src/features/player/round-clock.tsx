import type React from 'react'

import type { PlayerRoomView } from '@taverla/protocol/room'

import type { ClockEstimate } from '@taverla/core/time/clock-sync'

import {
  RevealHold,
  RoundProgress
} from '@/presentation/components/round-progress'

type RoundClockProps = {
  clock: ClockEstimate | null
  view: PlayerRoomView
}

/**
 * The clock the console is showing, on the player's screen that is answering
 * against it — and then the wait until the next round, which is the same
 * question one phase later.
 *
 * Absent whenever nothing is counting. For the round that is the host being
 * away, because the server has it frozen and a groove still draining would be
 * timing nobody; for the hold `advancesAt` says the same thing on its own,
 * covering a host who advances by hand and a host who has gone at once.
 */
export const RoundClock: React.FC<RoundClockProps> = ({ clock, view }) => {
  const holdMs = view.settings.autoAdvanceMs
  const advancesAt = view.round?.advancesAt ?? null

  if (view.phase === 'revealed' && advancesAt !== null && holdMs !== null) {
    return <RevealHold advancesAt={advancesAt} clock={clock} holdMs={holdMs} />
  }

  const durationMs = view.round?.durationMs ?? null

  if (
    durationMs === null ||
    view.phase !== 'playing' ||
    !view.isHostConnected
  ) {
    return null
  }

  return (
    <RoundProgress durationMs={durationMs} elapsedMs={view.roundElapsedMs} />
  )
}
