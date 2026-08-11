import { DEFAULT_GAME_SETTINGS, type GameKind } from '@taverla/protocol/game'
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
