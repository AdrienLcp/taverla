import type React from 'react'

import { playsAudioIn } from '@taverla/protocol/game'
import type { RoomSettings } from '@taverla/protocol/room'

import { Slider } from '@/presentation/components/slider'
import { useTranslate } from '@/presentation/i18n/i18n-provider'

import { NO_LIMIT, NumberChoice, useDurationLabels } from './number-choice'

import './host-controls.sass'

/**
 * How long the answer stays up before the room is moved on, and the only strip
 * outside the setup fold: it is the setting a host reaches *because* of what
 * they just watched happen, on the screen where they watched it.
 *
 * `NO_LIMIT` is the default and means the reveal waits for the host, which is
 * the only option that cannot be too short. The rest are read against what the
 * room has to get through — a quiz answer carries a note in four French rounds
 * out of five, and the median one is twenty words, so eight seconds pays for
 * the note and nothing else. Fifteen leaves room for the scoreline and for
 * somebody saying "oh I knew that"; twenty-five is a table that reads aloud.
 */
const AUTO_ADVANCE_OPTIONS_MS = [8_000, 15_000, 25_000, NO_LIMIT] as const

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
  const { openEnded } = useDurationLabels()

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
      <NumberChoice
        isDisabled={!isLive}
        label={translate('host.autoAdvance')}
        onChange={(chosen) => {
          onSettingsChange({
            ...settings,
            autoAdvanceMs: chosen === NO_LIMIT ? null : chosen
          })
        }}
        optionLabel={openEnded}
        options={AUTO_ADVANCE_OPTIONS_MS}
        value={settings.autoAdvanceMs ?? NO_LIMIT}
      />
    </div>
  )
}
