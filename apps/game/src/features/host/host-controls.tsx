import type React from 'react'

import { playsAudioIn } from '@taverla/protocol/game'
import type { RoomSettings } from '@taverla/protocol/room'

import { Slider } from '@/presentation/components/slider'
import { Switch } from '@/presentation/components/switch'
import { useTranslate } from '@/presentation/i18n/i18n-provider'

import './host-controls.sass'

/**
 * Long enough to read the cover and hear someone say "oh I knew that", short
 * enough that the room does not go quiet. The host can always press "next"
 * before it elapses.
 */
const AUTO_ADVANCE_MS = 8_000

type HostControlsProps = {
  /** The socket is open. The volume ignores it: that one never leaves this machine. */
  isLive: boolean
  onSettingsChange: (settings: RoomSettings) => void
  onVolumeChange: (volume: number) => void
  settings: RoomSettings
  /** 0 to 1, the host machine's own — it never reaches the room. */
  volume: number
}

export const HostControls: React.FC<HostControlsProps> = ({
  isLive,
  onSettingsChange,
  onVolumeChange,
  settings,
  volume
}) => {
  const translate = useTranslate()

  return (
    <div className='host-controls'>
      {/*
        Hidden rather than disabled under a game with no sound, the same way the
        mode strip is hidden when a game offers one mode: a control that commands
        nothing asks the host to decide something that has no effect. Chaining
        rounds is the room's, so it stays under every game.
      */}
      {playsAudioIn(settings.game) && (
        <Slider
          formatOptions={{ style: 'percent' }}
          label={translate('host.volume')}
          maxValue={1}
          minValue={0}
          onChange={onVolumeChange}
          step={0.05}
          value={volume}
        />
      )}
      <Switch
        isDisabled={!isLive}
        isSelected={settings.autoAdvanceMs !== null}
        label={translate('host.autoAdvance')}
        onChange={(isSelected) => {
          onSettingsChange({
            ...settings,
            autoAdvanceMs: isSelected ? AUTO_ADVANCE_MS : null
          })
        }}
      />
    </div>
  )
}
