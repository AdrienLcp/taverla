import type React from 'react'

import type { RoomSettings } from '@taverla/protocol/room'

import { SegmentedControl } from '@/presentation/components/segmented-control'
import { useTranslate } from '@/presentation/i18n/i18n-provider'

import './game-settings.sass'

const ROUND_COUNTS = [5, 10, 20, 30] as const
const CLIP_DURATIONS_MS = [10_000, 20_000, 30_000] as const
const COUNTDOWN_DURATIONS_MS = [3_000, 5_000, 10_000] as const

const optionFrom = <T extends number>(
  options: readonly T[],
  value: string
): T | undefined => options.find((option) => String(option) === value)

type GameSettingsProps = {
  /** Applied to the room as it is pressed; nothing here waits for the launch. */
  onChange: (settings: RoomSettings) => void
  settings: RoomSettings
}

/**
 * The three numbers that decide how a party goes, in the lobby where the host
 * is already standing. The source next to them is a draft the launch commits,
 * because a search can come back empty; these cannot, so they land immediately.
 */
export const GameSettings: React.FC<GameSettingsProps> = ({
  onChange,
  settings
}) => {
  const translate = useTranslate()

  const secondsLabel = (milliseconds: number): string =>
    translate('host.seconds', { seconds: milliseconds / 1_000 })

  return (
    <section className='game-settings'>
      <SegmentedControl
        label={translate('host.rounds')}
        onChange={(next) => {
          const roundCount = optionFrom(ROUND_COUNTS, next)

          if (roundCount !== undefined) {
            onChange({ ...settings, roundCount })
          }
        }}
        options={ROUND_COUNTS.map((count) => ({
          label: String(count),
          value: String(count)
        }))}
        value={String(settings.roundCount)}
      />

      <SegmentedControl
        label={translate('host.clip')}
        onChange={(next) => {
          const playbackDurationMs = optionFrom(CLIP_DURATIONS_MS, next)

          if (playbackDurationMs !== undefined) {
            onChange({ ...settings, playbackDurationMs })
          }
        }}
        options={CLIP_DURATIONS_MS.map((milliseconds) => ({
          label: secondsLabel(milliseconds),
          value: String(milliseconds)
        }))}
        value={String(settings.playbackDurationMs)}
      />

      <SegmentedControl
        label={translate('host.countdown')}
        onChange={(next) => {
          const countdownMs = optionFrom(COUNTDOWN_DURATIONS_MS, next)

          if (countdownMs !== undefined) {
            onChange({ ...settings, countdownMs })
          }
        }}
        options={COUNTDOWN_DURATIONS_MS.map((milliseconds) => ({
          label: secondsLabel(milliseconds),
          value: String(milliseconds)
        }))}
        value={String(settings.countdownMs)}
      />
    </section>
  )
}
