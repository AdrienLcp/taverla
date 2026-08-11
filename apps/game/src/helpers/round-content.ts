import type {
  HostRoomView,
  HostRoundContent,
  RoundContent,
  RoundView
} from '@taverla/protocol/room'
import type {
  HalvesVerdict,
  SingleVerdict,
  Verdict
} from '@taverla/protocol/scoring'

/**
 * A round's content is a union, and a screen only ever renders one arm of it.
 * Narrowing at every call site says nothing there — `content.kind === 'quiz'`
 * beside a component already named for the quiz — so it is spelled once here.
 */
export const blindtestContent = (
  round: RoundView | null | undefined
): Extract<RoundContent, { kind: 'blindtest' }> | null =>
  round?.content.kind === 'blindtest' ? round.content : null

export const quizContent = (
  round: RoundView | null | undefined
): Extract<RoundContent, { kind: 'quiz' }> | null =>
  round?.content.kind === 'quiz' ? round.content : null

/** The same over the half only the host is sent. */
export const blindtestHostContent = (
  view: HostRoomView | null | undefined
): Extract<HostRoundContent, { kind: 'blindtest' }> | null =>
  view?.currentContent?.kind === 'blindtest' ? view.currentContent : null

export const quizHostContent = (
  view: HostRoomView | null | undefined
): Extract<HostRoundContent, { kind: 'quiz' }> | null =>
  view?.currentContent?.kind === 'quiz' ? view.currentContent : null

/**
 * Whether the host still holds what this round is judged against. A host who
 * took a seat is sent neither the track nor the question — that screen is a
 * player's then — so the panel that judges a buzz would have nothing to show,
 * which is why the seat is refused in buzzer mode rather than the panel being
 * rendered empty.
 *
 * A game whose question the room owns is always holding it: it never left.
 */
export const holdsTheAnswer = (content: HostRoundContent): boolean => {
  switch (content.kind) {
    case 'blindtest':
      return content.track !== null
    case 'buzzer':
      return true
    case 'quiz':
      return content.question !== null
  }
}

/**
 * And over what the reader has banked, which a typed field reads to know what
 * is still owed — two halves in the blind test, one claim everywhere else.
 */
export const bankedHalves = (
  verdict: Verdict | null | undefined
): HalvesVerdict | null => (verdict?.kind === 'halves' ? verdict : null)

export const bankedSingle = (
  verdict: Verdict | null | undefined
): SingleVerdict | null => (verdict?.kind === 'single' ? verdict : null)
