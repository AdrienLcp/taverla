import type { GameKind } from '@taverla/protocol/game'
import { type AnswerMode, answerModes } from '@taverla/protocol/room'

const BUZZER_ONLY = ['buzzer'] as const satisfies readonly AnswerMode[]

/**
 * Which answer modes a game offers. `answerMode` stays a room setting because
 * the shell reads it everywhere a round is answered and scored; what a game
 * does is narrow it, and the bare buzzer narrows it to one — four candidates
 * and a typed field both need something to answer *against*, and that game
 * serves nothing.
 *
 * A game with one mode is a game whose host is never asked: the panel hides the
 * control rather than offering an option that would break the round.
 *
 * A switch rather than a default, so that adding a game kind stops compiling
 * here instead of silently offering it a typed field it cannot grade.
 */
export const answerModesFor = (game: GameKind): readonly AnswerMode[] => {
  switch (game) {
    case 'blindtest':
    case 'quiz':
      return answerModes
    case 'buzzer':
      return BUZZER_ONLY
  }
}

export const offersAnswerMode = ({
  answerMode,
  game
}: {
  answerMode: AnswerMode
  game: GameKind
}): boolean => answerModesFor(game).includes(answerMode)

/**
 * What to switch to when the room changes game. Keeping the mode where the new
 * game offers it is what stops a host losing their typed blind test by looking
 * at the buzzer for a second.
 */
export const answerModeForGame = ({
  answerMode,
  game
}: {
  answerMode: AnswerMode
  game: GameKind
}): AnswerMode =>
  offersAnswerMode({ answerMode, game })
    ? answerMode
    : (answerModesFor(game)[0] ?? answerMode)
