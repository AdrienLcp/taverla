import type { GameKind } from '@taverla/protocol/game'
import {
  type AnswerMode,
  answerModes,
  DEFAULT_MODE_SETTINGS,
  type ModeSettings
} from '@taverla/protocol/room'

const BUZZER_ONLY = ['buzzer'] as const satisfies readonly AnswerMode[]

/**
 * The slate is written, so it is `typed` — the mode says how a round is
 * answered, and a sheet is answered by typing. What the mode usually brings
 * with it, a server grade and a speed bonus, is the game's to refuse: the host
 * marks the sheets, which `isJudgedByHost` says rather than this.
 */
const TYPED_ONLY = ['typed'] as const satisfies readonly AnswerMode[]

/**
 * Which answer modes a game offers. The mode is the room's because the shell
 * reads it everywhere a round is answered and scored; what a game does is
 * narrow it, and two of them narrow it to one — four candidates and a typed
 * field both need something to answer *against*, and neither the bare buzzer
 * nor the reflex race serves anything to answer.
 *
 * A game with one mode is a game whose host is never asked: the panel hides the
 * control rather than offering an option that would break the round.
 *
 * A room with no game yet narrows nothing, which is what lets the settings
 * frame carrying a mode be accepted before the table has decided. The panel
 * still shows no strip — "how to answer" cannot be explained without a game —
 * and `movedToGame` narrows whatever was held the moment one is picked.
 *
 * A switch rather than a default, so that adding a game kind stops compiling
 * here instead of silently offering it a typed field it cannot grade.
 */
export const answerModesFor = (
  game: GameKind | null
): readonly AnswerMode[] => {
  if (game === null) {
    return answerModes
  }

  switch (game) {
    case 'blindtest':
    case 'quiz':
      return answerModes
    case 'buzzer':
    case 'reflex':
      return BUZZER_ONLY
    case 'slate':
      return TYPED_ONLY
  }
}

export const offersAnswerMode = ({
  game,
  mode
}: {
  game: GameKind | null
  mode: AnswerMode
}): boolean => answerModesFor(game).includes(mode)

/**
 * Whether the round ends in a verdict a human has to grant, which is the one
 * thing that keeps a console out of its own game: a judge who is also answering
 * is not one.
 *
 * `buzzer` is the mode that asks for one, and the reflex race is the exception
 * that shares that mode without needing it — being first *is* being right
 * there, so the heat settles on the presses and nobody reads anything out.
 * Keying on the mode alone caught it by accident of what it narrows to.
 *
 * The slate is the one game judged by hand under another mode: its sheets are
 * typed and its host marks them, knowing every answer from the key.
 *
 * A room with no game yet answers `true` under `buzzer`, because the seat is
 * withheld until something says otherwise rather than the other way round.
 */
export const isJudgedByHost = ({
  game,
  mode
}: {
  game: GameKind | null
  mode: AnswerMode
}): boolean => game === 'slate' || (mode === 'buzzer' && game !== 'reflex')

/**
 * Whether the missing seat is worth explaining, which is narrower than the seat
 * being withheld: it is withheld wherever a verdict is owed, and only here is
 * that something the room can undo.
 *
 * The bare buzzer is judged and offers nothing else, so there is no seat to be
 * had and nothing to say about its absence. A room that has picked no game is
 * the same — the seat is waiting on the decision the lobby is already asking
 * for, not on how this game is answered. What is left is a quiz or a blind test
 * left on `buzzer`, where the control simply vanished: the host is remembered
 * per game, so a room can arrive in that state without anyone choosing it this
 * evening, and a screen that says nothing reads as the seat being broken.
 */
export const isSeatWithheldByMode = ({
  game,
  mode
}: {
  game: GameKind | null
  mode: AnswerMode
}): boolean =>
  game !== null &&
  isJudgedByHost({ game, mode }) &&
  answerModesFor(game).length > 1

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
