import type React from 'react'

import {
  DEFAULT_GAME_SETTINGS,
  type ShelvedGame,
  shelvedGames
} from '@taverla/protocol/game'
import type { RoomSettings } from '@taverla/protocol/room'

import { answerModeForGame } from '@taverla/core/room/game-modes'

import { SegmentedControl } from '@/presentation/components/segmented-control'
import { useTranslate } from '@/presentation/i18n/i18n-provider'
import { gameNameKey, isShelvedGame } from '@/presentation/i18n/translation'

type GamePickerProps = {
  /** The socket is open. This sends a frame, so it does nothing without one. */
  isLive: boolean
  onChange: (settings: RoomSettings) => void
  settings: RoomSettings
}

/**
 * Which game the room is playing, above everything it decides. The room opens
 * on the one whose front door the host came through, so this is for the table
 * that changes its mind while standing at the screen.
 */
export const GamePicker: React.FC<GamePickerProps> = ({
  isLive,
  onChange,
  settings
}) => {
  const translate = useTranslate()

  // The pair travels in one frame: the server refuses a mode the new game does
  // not offer, and a room left on the old one between two presses would be a
  // round nobody could answer.
  const switchGame = (next: ShelvedGame): void => {
    onChange({
      ...settings,
      answerMode: answerModeForGame({
        answerMode: settings.answerMode,
        game: next
      }),
      game: DEFAULT_GAME_SETTINGS[next]
    })
  }

  return (
    <SegmentedControl
      isDisabled={!isLive}
      label={translate('host.game')}
      onChange={(next) => {
        if (isShelvedGame(next)) {
          switchGame(next)
        }
      }}
      options={shelvedGames.map((game) => ({
        label: translate(gameNameKey(game)),
        value: game
      }))}
      value={settings.game.kind}
    />
  )
}
