import type { RoomSettings } from '@taverla/protocol/room'
import type { TrackSource } from '@taverla/protocol/track'

import {
  type SettingsSummaryPart,
  settingsSummary
} from '@taverla/core/room/settings-summary'

import { useTranslate } from '@/presentation/i18n/i18n-provider'
import {
  answerModeLabelKey,
  gameNameKey
} from '@/presentation/i18n/translation'

import { sourceKindKey } from './playlist-picker'

/**
 * The line that says what the room is set to play, read on both sides of a
 * game: closed, the setup fold says what opening it would let you change; on
 * the final board it says what *play again* is about to relaunch.
 *
 * It reads the draft source for the same reason in both places — the picker
 * commits on the launch, and on the final board that launch is one press away
 * with nothing between it and the countdown.
 */
export const useSettingsSummary = ({
  draftSource,
  settings
}: {
  draftSource: TrackSource | null
  settings: RoomSettings
}): string => {
  const translate = useTranslate()

  const summaryPart = (part: SettingsSummaryPart): string => {
    switch (part.kind) {
      case 'game':
        return translate(gameNameKey(part.game))
      case 'source':
        return translate(sourceKindKey(part.source))
      case 'answerMode':
        return translate(answerModeLabelKey(part.mode))
      case 'roundCount':
        return part.count === null
          ? translate('host.roundCount.openSummary')
          : translate('host.roundCount.summary', { count: part.count })
    }
  }

  return settingsSummary({ draftSource, settings }).map(summaryPart).join(' · ')
}
