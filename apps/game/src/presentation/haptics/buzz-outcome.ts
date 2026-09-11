import { useEffect, useRef } from 'react'

import type { PlayerId } from '@taverla/protocol/identifiers'
import type { ActiveBuzz, RoundView } from '@taverla/protocol/room'

import { reflexContent } from '@/helpers/round-content'
import { buzzFeedback } from '@/infrastructure/browser'

export type BuzzOutcome = {
  hasWon: boolean
  /**
   * What makes this a different outcome from the last one — compared, never
   * shown. A stamp wherever the server kept a time for the press, and the round
   * where it kept none.
   */
  id: string
}

/**
 * Which press the floor answered, for the screen that made it.
 *
 * Taking the floor is felt by whoever took it; a refusal only by a screen that
 * entered this round's race. A screen that never pressed has nothing to be told
 * and eight of them knocking at once is the noise the product already refuses
 * to make with sound.
 *
 * `hasPressed` is per round rather than per press, which is the unit the buzzer
 * is already drawn in: a player who entered the race once and sat out a second
 * buzz in the same round feels that one too, and it is still true of them.
 */
export const floorOutcome = ({
  buzz,
  hasPressed,
  youId
}: {
  buzz: ActiveBuzz | null
  hasPressed: boolean
  youId: PlayerId | null
}): BuzzOutcome | null => {
  if (buzz === null) {
    return null
  }

  const hasWon = buzz.playerId === youId

  return hasWon || hasPressed ? { hasWon, id: String(buzz.atServerTime) } : null
}

/**
 * The race's answer, read off two fields rather than one because it has no
 * floor to take.
 *
 * A tap that landed wins if it is first, and the array already holds that
 * verdict: arrival order *is* reaction order, so a player's own tap appearing
 * in it settles the question for good rather than provisionally.
 *
 * A false start has no stamp — the server refused the frame, so it kept no time
 * for it — and the round stands in as the identity. It can happen once per
 * round, which is what makes that enough.
 *
 * The game is read before the lockout rather than after, because **a lockout
 * has one cause here and several everywhere else**: taking it for a false start
 * outside the race would knock at a player who merely answered wrong.
 */
export const reflexOutcome = ({
  round,
  youId
}: {
  round: RoundView | null
  youId: PlayerId | null
}): BuzzOutcome | null => {
  const content = reflexContent(round)

  if (content === null || round === null || youId === null) {
    return null
  }

  if (round.lockedOutPlayerIds.includes(youId)) {
    return { hasWon: false, id: `jumped:${round.id}` }
  }

  const taps = content.taps
  const yourTap = taps.find((tap) => tap.playerId === youId)

  return yourTap === undefined
    ? null
    : { hasWon: taps[0]?.playerId === youId, id: String(yourTap.atServerTime) }
}

/**
 * The server's answer to a press, in the channel the press was made in. It is
 * the one thing about a buzz a screen cannot show in advance: the race is
 * decided in the fifty milliseconds after the thumb lands, on a machine that is
 * not this one, and until now the only witness was the screen.
 *
 * **Called from the page, never from the screen that took the press**, wherever
 * the outcome can outlive that screen. A reflex heat ends on its last tap, so
 * the snapshot carrying a slow player's own reaction is already the reveal and
 * the buzzer they pressed is gone — which is exactly the player the answer was
 * for. The floor is the one case that can stay where it is pressed: a buzz
 * lands the room on `buzzed`, a phase the buzzer is drawn in.
 *
 * Stamped rather than flagged, for the reason `useBuzzCue` is: the view is
 * re-delivered on every roster change, every settings frame and every
 * reconnection, so an effect watching the phase would knock five times for one
 * press. The guard is what lets the outcome sit honestly in the dependency
 * list, rebuilt on every render as it is.
 *
 * Silent wherever `navigator.vibrate` is — every iOS Safari in the room — and
 * nothing is built on top of it: the screen says all of this too.
 */
export const useBuzzOutcome = (outcome: BuzzOutcome | null): void => {
  const feltRef = useRef<string | null>(null)

  useEffect(() => {
    if (outcome === null || outcome.id === feltRef.current) {
      return
    }

    feltRef.current = outcome.id
    buzzFeedback(outcome.hasWon ? 'won' : 'lost')
  }, [outcome])
}
