import type { ShelvedGame } from '@taverla/protocol/game'
import type { AnswerMode, RoomSettings } from '@taverla/protocol/room'
import type { TrackSource } from '@taverla/protocol/track'

import { answerModesFor } from './game-modes'
import { isShelvedGame } from './shelved-game'

/**
 * One field of the line a host reads without opening the setup fold — what to
 * say, never the words. The strings are the shell's, and this package holds
 * none.
 */
export type SettingsSummaryPart =
  | { count: number | null; kind: 'roundCount' }
  | { count: number; kind: 'itemCount' }
  | { game: ShelvedGame; kind: 'game' }
  | { kind: 'answerMode'; mode: AnswerMode }
  | { kind: 'source'; source: TrackSource['kind'] }

/**
 * What the fold says while it is closed. Only the round count is always there:
 * a room whose game nobody has picked has nothing to say about the game or
 * about how it is answered, a game the shelf cannot name is one the room was
 * *moved* to rather than opened on, the source belongs to the blind test alone,
 * and a game offering a single answer mode has nothing to report about the
 * choice nobody made.
 *
 * It reads the draft source rather than the committed one, because the picker
 * commits on the launch — a summary that waited for that would contradict the
 * control directly above it.
 */
export const settingsSummary = ({
  draftSource,
  settings
}: {
  draftSource: TrackSource | null
  settings: RoomSettings
}): SettingsSummaryPart[] => {
  const game = settings.game
  const parts: SettingsSummaryPart[] = []

  if (game === null) {
    return [{ count: settings.roundCount, kind: 'roundCount' }]
  }

  if (isShelvedGame(game.kind)) {
    parts.push({ game: game.kind, kind: 'game' })
  }

  if (game.kind === 'blindtest') {
    parts.push({ kind: 'source', source: (draftSource ?? game.source).kind })
  }

  if (game.kind === 'slate') {
    parts.push({ count: game.itemCount, kind: 'itemCount' })
  }

  if (answerModesFor(game.kind).length > 1) {
    parts.push({ kind: 'answerMode', mode: settings.mode.kind })
  }

  parts.push({ count: settings.roundCount, kind: 'roundCount' })

  return parts
}
