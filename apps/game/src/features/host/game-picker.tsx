import type React from 'react'

import { shelvedGames } from '@taverla/protocol/game'
import type { RoomSettings } from '@taverla/protocol/room'

import {
  type HostPreferences,
  rememberedSetupFor
} from '@taverla/core/room/host-preferences'
import { movedToGame } from '@taverla/core/room/room-settings'
import { isShelvedGame } from '@taverla/core/room/shelved-game'

import { SegmentedControl } from '@/presentation/components/segmented-control'
import { useI18n } from '@/presentation/i18n/i18n-provider'
import { gameNameKey } from '@/presentation/i18n/translation'

import './game-picker.sass'

type GamePickerProps = {
  /** The socket is closed, or a round is under way and the server would refuse the switch. */
  isDisabled: boolean
  onChange: (settings: RoomSettings) => void
  /** What this host last left each game set to, or `null` if they never set anything. */
  preferences: HostPreferences | null
  settings: RoomSettings
}

/**
 * Which game the room is playing, and nothing is selected until somebody says.
 * A room is opened before the table decides — the code goes up, the players
 * arrive, and this is the decision they are waiting on, which is why the lobby
 * shows it on the stage and every later phase keeps it with the settings.
 */
export const GamePicker: React.FC<GamePickerProps> = ({
  isDisabled,
  onChange,
  preferences,
  settings
}) => {
  const { locale, translate } = useI18n()

  return (
    <SegmentedControl
      className='game-picker'
      isDisabled={isDisabled}
      label={translate('host.game.label')}
      onChange={(next) => {
        // One frame, whole settings: the server refuses a mode the new game
        // does not offer, so a room left on the old one between two presses
        // would be a round nobody could answer.
        if (isShelvedGame(next)) {
          onChange(
            movedToGame({
              game: next,
              locale,
              remembered: rememberedSetupFor({ game: next, preferences }),
              settings
            })
          )
        }
      }}
      options={shelvedGames.map((game) => ({
        label: translate(gameNameKey(game)),
        value: game
      }))}
      value={settings.game?.kind ?? null}
    />
  )
}
