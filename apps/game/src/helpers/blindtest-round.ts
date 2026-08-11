import type {
  HostRoomView,
  HostRoundContent,
  RoundContent,
  RoundView
} from '@taverla/protocol/room'
import type { HalvesVerdict, Verdict } from '@taverla/protocol/scoring'

/**
 * The blind test's arm of a round, or `null` when the room is playing something
 * else. Every screen under `features/host` and `features/player` is the blind
 * test's, so the narrowing says nothing at a call site and belongs here.
 */
export const blindtestContent = (
  round: RoundView | null | undefined
): Extract<RoundContent, { kind: 'blindtest' }> | null =>
  round?.content.kind === 'blindtest' ? round.content : null

/** The same over the half only the host is sent. */
export const blindtestHostContent = (
  view: HostRoomView | null | undefined
): Extract<HostRoundContent, { kind: 'blindtest' }> | null =>
  view?.currentContent?.kind === 'blindtest' ? view.currentContent : null

/** And over what the reader has banked, which the typed field reads to know what is still owed. */
export const bankedHalves = (
  verdict: Verdict | null | undefined
): HalvesVerdict | null => (verdict?.kind === 'halves' ? verdict : null)
