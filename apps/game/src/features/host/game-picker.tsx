import type React from 'react'

import { shelvedGames } from '@taverla/protocol/game'
import type { RoomSettings } from '@taverla/protocol/room'

import { movedToGame } from '@taverla/core/room/room-settings'
import { isShelvedGame } from '@taverla/core/room/shelved-game'

import { SegmentedControl } from '@/presentation/components/segmented-control'
import { useTranslate } from '@/presentation/i18n/i18n-provider'
import { gameNameKey } from '@/presentation/i18n/translation'

type GamePickerProps = {
  /** The socket is open. This sends a frame, so it does nothing without one. */
  isLive: boolean
  /**
   * A round is under way. The round on screen is one arm of `round.content`, so
   * a game switched under it would leave the screens rendering the other —
   * which is why the server refuses this one until the round is over.
   */
  isRoundInPlay: boolean
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
  isRoundInPlay,
  onChange,
  settings
}) => {
  const translate = useTranslate()

  return (
    <SegmentedControl
      isDisabled={!isLive || isRoundInPlay}
      label={translate('host.game')}
      onChange={(next) => {
        // One frame, whole settings: the server refuses a mode the new game
        // does not offer, so a room left on the old one between two presses
        // would be a round nobody could answer.
        if (isShelvedGame(next)) {
          onChange(movedToGame({ game: next, settings }))
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
