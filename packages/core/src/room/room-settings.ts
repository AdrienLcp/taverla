import {
  DEFAULT_GAME_SETTINGS,
  type GameKind,
  type GameSettings,
  roundDurationMsOf,
  voteDurationMsOf
} from '@taverla/protocol/game'
import type { Locale } from '@taverla/protocol/locale'
import {
  type AnswerMode,
  DEFAULT_MODE_SETTINGS,
  DEFAULT_ROOM_SETTINGS,
  type ModeSettings,
  type RoomSettings
} from '@taverla/protocol/room'

import { questionLanguageFor } from '../quiz/question-language'
import { modeOfferedBy } from './game-modes'

/**
 * How many rounds a game opens on, and `null` where the honest answer is "until
 * you stop". A blind test runs a playlist to its end; a charade evening runs
 * until the room has had enough, and a ten the host has to notice and clear is
 * the blind test's shape wearing the room's name.
 */
const DEFAULT_ROUND_COUNT: Record<GameKind, number | null> = {
  blindtest: 10,
  buzzer: null,
  /** Writing, reading a board aloud and voting is three of a quiz round; ten would be an evening on one game. */
  lefake: 5,
  quiz: 10,
  /** A heat is a wait and a thumb, so ten of them is under two minutes. */
  reflex: 10
}

/**
 * How a game expects to be answered before anybody has said otherwise. It is
 * the game's preference and not the room's rule: `modeOfferedBy` still narrows
 * it, so an entry naming a mode its own game does not offer is corrected rather
 * than served.
 *
 * The split between the two banks' games is what the question is made of. A
 * quiz question is a sentence with one fact missing, and a table reads it faster
 * than it types it — four candidates is the shape the room actually plays, and
 * the shape most of the bank was written in. A blind test's question is a clip:
 * the title and the artist are two answers worth a point each, retries are
 * free, and its candidates are drawn from the room's own pool rather than
 * authored beside the answer. Typing is the game there, not a fallback.
 */
const DEFAULT_ANSWER_MODE: Record<GameKind, AnswerMode> = {
  blindtest: 'typed',
  buzzer: 'buzzer',
  lefake: 'choice',
  quiz: 'choice',
  reflex: 'buzzer'
}

/**
 * The three fields a game gets a say in, as one value: which game, how it is
 * answered, and how long the evening runs. It is the seam `movedToGame` has
 * always turned on, and naming it is what lets a *remembered* answer come
 * through the same door the game's own defaults do.
 */
export type GameSetup = {
  game: GameSettings
  mode: ModeSettings
  roundCount: RoomSettings['roundCount']
}

/**
 * What a freshly opened room is set to. The shell's defaults, with the three
 * fields the game gets a say in.
 *
 * `null` is a room opened from the front door, where the code goes up before
 * anybody has decided what to play. It is the shell's defaults and nothing
 * else: the three fields below are the game's to answer, and there is no game
 * yet to answer them.
 */
export const roomSettingsFor = ({
  game,
  locale
}: {
  game: GameKind | null
  /** The host's, and the only evidence available for what a room has not been asked. */
  locale: Locale
}): RoomSettings =>
  game === null
    ? DEFAULT_ROOM_SETTINGS
    : { ...DEFAULT_ROOM_SETTINGS, ...openedSetup({ game, locale }) }

/** What a game answers before anybody has told it otherwise. */
const openedSetup = ({
  game,
  locale
}: {
  game: GameKind
  locale: Locale
}): GameSetup => ({
  game: openedGameSettings({ game, locale }),
  mode: modeOfferedBy({
    game,
    preferred: DEFAULT_MODE_SETTINGS[DEFAULT_ANSWER_MODE[game]]
  }),
  roundCount: DEFAULT_ROUND_COUNT[game]
})

/**
 * The game's own defaults, with the one field that cannot have a fixed one. A
 * question drawn in a language the host does not read is the wrong game, and the
 * protocol's default has no way of knowing which that is — so both games that
 * draw from the bank take the host's.
 */
const openedGameSettings = ({
  game,
  locale
}: {
  game: GameKind
  locale: Locale
}): GameSettings => {
  const opened = DEFAULT_GAME_SETTINGS[game]

  return opened.kind === 'quiz' || opened.kind === 'lefake'
    ? { ...opened, language: questionLanguageFor(locale) }
    : opened
}

/**
 * The same room, playing something else. The three fields a game gets a say in
 * take that game's answer, and the rest is the host's and survives: a countdown
 * they lengthened is not undone by changing their mind about the game.
 *
 * The three never carry over from the outgoing game, because carrying them is
 * what put a room on a blind test with no round limit that nobody could type an
 * answer into — the bare buzzer's settings, worn by a game that has its own.
 * What they may carry from is this host's *last evening on the incoming game*,
 * which is a different thing entirely and the only reason `remembered` exists.
 */
export const movedToGame = ({
  game,
  locale,
  remembered,
  settings
}: {
  game: GameKind
  locale: Locale
  /** What this host last left this game set to, or `null` if they never have. */
  remembered: GameSetup | null
  settings: RoomSettings
}): RoomSettings => ({
  ...settings,
  ...(remembered ?? openedSetup({ game, locale }))
})

/**
 * Whether the change would alter what a round already under way is *built on*.
 * Everything else is read at the moment it is next needed, which is what lets a
 * host lengthen the countdown or swap the playlist mid-evening and have it land
 * on the next round.
 *
 * These three cannot wait to be read: a simultaneous round is scored on the way
 * out from the mode, so a typed round switched to `choice` pays a typed answer
 * at a pick's rate; a new `game.kind` leaves `round.content` on the arm the
 * screens are already rendering; and a `roundDurationMs` cut below the time
 * already spent ends the round the moment it arrives.
 *
 * A mode's own settings are not on the list. `answerWindowMs` is read when a
 * buzz lands and stamped into the buzz, so moving it decides the next floor
 * rather than the one being held.
 *
 * `voteDurationMs` is on it for the same reason as `roundDurationMs`, and it is
 * one field rather than a fourth clause: Le Fake's two open phases run off the
 * one round clock, so a vote window cut below the time already spent ends the
 * vote on arrival exactly as a shortened round does.
 */
export const reshapesRound = ({
  from,
  to
}: {
  from: RoomSettings
  to: RoomSettings
}): boolean =>
  from.mode.kind !== to.mode.kind ||
  from.game?.kind !== to.game?.kind ||
  roundDurationMsOf(from.game) !== roundDurationMsOf(to.game) ||
  voteDurationMsOf(from.game) !== voteDurationMsOf(to.game)
