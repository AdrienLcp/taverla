import type React from 'react'

import type { RoomSettings } from '@taverla/protocol/room'

import { useTranslate } from '@/presentation/i18n/i18n-provider'

import { NO_LIMIT, NumberChoice, useDurationLabels } from './number-choice'

import './auto-advance-choice.sass'

/**
 * `NO_LIMIT` is the default and means the reveal waits for the host, which is
 * the only option that cannot be too short. The rest are read against what the
 * room has to get through — a quiz answer carries a note in four French rounds
 * out of five, and the median one is twenty words, so eight seconds pays for
 * the note and nothing else. Fifteen leaves room for the scoreline and for
 * somebody saying "oh I knew that"; twenty-five is a table that reads aloud.
 */
const AUTO_ADVANCE_OPTIONS_MS = [8_000, 15_000, 25_000, NO_LIMIT] as const

type AutoAdvanceChoiceProps = {
  /** The socket is open. A frame written to one that is not is dropped. */
  isLive: boolean
  onSettingsChange: (settings: RoomSettings) => void
  settings: RoomSettings
}

/**
 * How long the answer stays up before the room is moved on, and the only
 * setting outside the setup fold: it is the one a host reaches *because* of
 * what they just watched happen, on the screen where they watched it. Chaining
 * rounds is the room's, so it stays under every game.
 */
export const AutoAdvanceChoice: React.FC<AutoAdvanceChoiceProps> = ({
  isLive,
  onSettingsChange,
  settings
}) => {
  const translate = useTranslate()
  const { openEnded } = useDurationLabels()

  return (
    <NumberChoice
      className='auto-advance'
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
  )
}
