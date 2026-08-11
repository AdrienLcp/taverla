import {
  DEFAULT_GAME_SETTINGS,
  type GameKind,
  roundDurationMsOf
} from '@taverla/protocol/game'
import {
  DEFAULT_ROOM_SETTINGS,
  type RoomSettings
} from '@taverla/protocol/room'

import { answerModeForGame } from './game-modes'

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
 */
export const roomSettingsFor = (game: GameKind): RoomSettings => ({
  ...DEFAULT_ROOM_SETTINGS,
  answerMode: answerModeForGame({
    answerMode: DEFAULT_ROOM_SETTINGS.answerMode,
    game
  }),
  game: DEFAULT_GAME_SETTINGS[game],
  roundCount: DEFAULT_ROUND_COUNT[game]
})

/**
 * Whether the change would alter what a round already under way is *built on*.
 * Everything else is read at the moment it is next needed, which is what lets a
 * host lengthen the countdown or close the playlist mid-evening and have it
 * land on the next round.
 *
 * These three cannot wait to be read: a simultaneous round is scored on the way
 * out from `answerMode`, so a typed round switched to `choice` pays a typed
 * answer at a pick's rate; a new `game.kind` leaves `round.content` on the arm
 * the screens are already rendering; and a `roundDurationMs` cut below the time
 * already spent ends the round the moment it arrives.
 */
export const reshapesRound = ({
  from,
  to
}: {
  from: RoomSettings
  to: RoomSettings
}): boolean =>
  from.answerMode !== to.answerMode ||
  from.game.kind !== to.game.kind ||
  roundDurationMsOf(from.game) !== roundDurationMsOf(to.game)
