import type { GameKind } from '@taverla/protocol/game'
import type { RoomSettings } from '@taverla/protocol/room'

import type { GameSetup } from './room-settings'

/**
 * What one host keeps between rooms, split on the seam `movedToGame` turns on: a
 * game answers four of the room's settings, so those are remembered per game
 * and everything else is remembered once.
 *
 * That is why `roundCount` and `autoAdvanceMs` sit on the game's side of the
 * line despite being room settings. A host who lengthened the countdown meant it
 * for every game; a host who set Le Fake to five rounds did not mean it for the
 * quiz, and neither did the one whose bare buzzer runs until they stop it. Nor
 * did the one who held the reveal twenty-five seconds so a quiz note could be
 * read aloud mean it for a reflex race, which has nothing to read.
 */
export type HostPreferences = {
  /** What this host last left each game set to; absent until they have played it. */
  games: Partial<Record<GameKind, GameSetup>>
  /** Everything no game answers, so it survives every switch. */
  room: Omit<RoomSettings, keyof GameSetup>
  /**
   * The slate's answer key, typed before the evening, by item index. The one
   * thing a host prepares that the settings cannot carry, because they reach
   * every player: it stays on this machine and rides the press that opens the
   * sheet.
   */
  slateKeys: readonly (string | null)[]
}

/**
 * What this host last left `game` set to, and `null` when that is nothing
 * usable.
 *
 * A key and the arm filed under it can disagree — this is read back out of the
 * browser's own storage, which anyone can edit — and an arm that contradicts its
 * key is dropped rather than trusted. Trusting it would have the host press Quiz
 * and get a blind test.
 */
export const rememberedSetupFor = ({
  game,
  preferences
}: {
  game: GameKind
  preferences: HostPreferences | null
}): GameSetup | null => {
  const setup = preferences?.games[game]

  return setup !== undefined && setup.game.kind === game ? setup : null
}

/**
 * The room as this host would have left it. It is applied *over* the settings
 * the room opened on rather than replacing them, so anything never remembered
 * keeps what the door decided — the question language above all, which the door
 * reads off the host's own interface.
 */
export const restoredSettings = ({
  preferences,
  settings
}: {
  preferences: HostPreferences
  settings: RoomSettings
}): RoomSettings => {
  const remembered =
    settings.game === null
      ? null
      : rememberedSetupFor({ game: settings.game.kind, preferences })

  return { ...settings, ...preferences.room, ...remembered }
}

/**
 * The same preferences with what the room is set to now folded in. The rest
 * pattern is the seam itself: whatever `RoomSettings` grows that no game answers
 * joins `room` without an edit here.
 *
 * A room still deciding what to play remembers nothing per game — there is no
 * game to file it under, and its `mode`, `roundCount` and reveal hold are the
 * shell's placeholders rather than anybody's choice.
 */
export const rememberSettings = ({
  preferences,
  settings
}: {
  preferences: HostPreferences | null
  settings: RoomSettings
}): HostPreferences => {
  const { autoAdvanceMs, game, mode, roundCount, ...room } = settings

  return {
    games:
      game === null
        ? (preferences?.games ?? {})
        : {
            ...preferences?.games,
            [game.kind]: { autoAdvanceMs, game, mode, roundCount }
          },
    room,
    slateKeys: preferences?.slateKeys ?? []
  }
}

/**
 * The same preferences with one prepared key changed, `''` clearing it. The
 * list keeps no trailing gap, so a key cleared at the end shortens it.
 */
export const rememberSlateKey = ({
  itemIndex,
  key,
  preferences
}: {
  itemIndex: number
  key: string
  preferences: HostPreferences
}): HostPreferences => {
  const keys = Array.from(
    { length: Math.max(preferences.slateKeys.length, itemIndex + 1) },
    (_, index) =>
      index === itemIndex
        ? key.trim() || null
        : (preferences.slateKeys[index] ?? null)
  )
  const lastKept = keys.findLastIndex((entry) => entry !== null)

  return { ...preferences, slateKeys: keys.slice(0, lastKept + 1) }
}
