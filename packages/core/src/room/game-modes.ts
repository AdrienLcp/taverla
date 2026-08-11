import type { GameKind } from '@taverla/protocol/game'
import {
  type AnswerMode,
  answerModes,
  DEFAULT_MODE_SETTINGS,
  type ModeSettings
} from '@taverla/protocol/room'

const BUZZER_ONLY = ['buzzer'] as const satisfies readonly AnswerMode[]

/**
 * Which answer modes a game offers. The mode is the room's because the shell
 * reads it everywhere a round is answered and scored; what a game does is
 * narrow it, and the bare buzzer narrows it to one — four candidates and a
 * typed field both need something to answer *against*, and that game serves
 * nothing.
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
  game,
  mode
}: {
  game: GameKind
  mode: AnswerMode
}): boolean => answerModesFor(game).includes(mode)

/**
 * The nearest thing to `preferred` that this game can serve, with its own
 * settings intact — the preference itself when the game offers it, and the
 * game's only mode otherwise. Carrying the settings rather than the kind is the
 * whole point of the arm: a host who set the floor to "you decide" keeps it.
 */
export const modeOfferedBy = ({
  game,
  preferred
}: {
  game: GameKind
  preferred: ModeSettings
}): ModeSettings =>
  offersAnswerMode({ game, mode: preferred.kind })
    ? preferred
    : DEFAULT_MODE_SETTINGS[answerModesFor(game)[0] ?? preferred.kind]
