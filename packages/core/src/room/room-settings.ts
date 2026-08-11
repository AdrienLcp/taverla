import {
  DEFAULT_GAME_SETTINGS,
  type GameKind,
  roundDurationMsOf
} from '@taverla/protocol/game'
import {
  DEFAULT_ROOM_SETTINGS,
  type RoomSettings
} from '@taverla/protocol/room'

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
  quiz: 10
}

/**
 * What a freshly opened room is set to. The shell's defaults, with the three
 * fields the game gets a say in — which game, how it is answered, and how long
 * the evening runs.
 *
 * `null` is a room opened from the front door, where the code goes up before
 * anybody has decided what to play. It is the shell's defaults and nothing
 * else: the three fields below are the game's to answer, and there is no game
 * yet to answer them.
 */
export const roomSettingsFor = (game: GameKind | null): RoomSettings =>
  game === null
    ? DEFAULT_ROOM_SETTINGS
    : {
        ...DEFAULT_ROOM_SETTINGS,
        game: DEFAULT_GAME_SETTINGS[game],
        mode: modeOfferedBy({ game, preferred: DEFAULT_ROOM_SETTINGS.mode }),
        roundCount: DEFAULT_ROUND_COUNT[game]
      }

/**
 * The same room, playing something else. The three fields a game gets a say in
 * take that game's answer, and the rest is the host's and survives: a countdown
 * they lengthened is not undone by changing their mind about the game.
 *
 * The three reset rather than carry, because carrying them is what put a room
 * on a blind test with no round limit that nobody could type an answer into —
 * the bare buzzer's settings, worn by a game that has its own.
 */
export const movedToGame = ({
  game,
  settings
}: {
  game: GameKind
  settings: RoomSettings
}): RoomSettings => {
  const opened = roomSettingsFor(game)

  return {
    ...settings,
    game: opened.game,
    mode: opened.mode,
    roundCount: opened.roundCount
  }
}

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
  roundDurationMsOf(from.game) !== roundDurationMsOf(to.game)
