import type React from 'react'

import {
  type AnswerMode,
  answerModes,
  type RoomSettings
} from '@taverla/protocol/room'
import {
  type TrackDifficulty,
  trackDifficulties
} from '@taverla/protocol/track'

import { SegmentedControl } from '@/presentation/components/segmented-control'
import { useTranslate } from '@/presentation/i18n/i18n-provider'
import { scoringKey } from '@/presentation/i18n/translation'

import './game-settings.sass'

const ROUND_COUNTS = [5, 10, 20, 30] as const
const CLIP_DURATIONS_MS = [10_000, 20_000, 30_000] as const
const COUNTDOWN_DURATIONS_MS = [3_000, 5_000, 10_000] as const

const optionFrom = <T extends number>(
  options: readonly T[],
  value: string
): T | undefined => options.find((option) => String(option) === value)

/**
 * The literal return type is load-bearing: adding a difficulty to the protocol
 * without adding its label to both dictionaries stops compiling here.
 */
const difficultyLabelKey = (
  difficulty: TrackDifficulty
): `blindtest.difficulty.${TrackDifficulty}` =>
  `blindtest.difficulty.${difficulty}`

const isDifficulty = (value: string): value is TrackDifficulty =>
  trackDifficulties.some((difficulty) => difficulty === value)

const answerModeLabelKey = (
  mode: AnswerMode
): `blindtest.answerMode.${AnswerMode}` => `blindtest.answerMode.${mode}`

const isAnswerMode = (value: string): value is AnswerMode =>
  answerModes.some((mode) => mode === value)

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
        label={translate('blindtest.answerMode.label')}
        onChange={(next) => {
          if (isAnswerMode(next)) {
            onChange({ ...settings, answerMode: next })
          }
        }}
        options={answerModes.map((mode) => ({
          label: translate(answerModeLabelKey(mode)),
          value: mode
        }))}
        value={settings.answerMode}
      />
      {/*
        Under the control that chooses it rather than on the screen where it is
        played: the lobby is the only moment nobody is against a clock, and the
        host is the one deciding what the evening will be worth.
      */}
      <p className='hint'>{translate(scoringKey(settings.answerMode))}</p>

      <SegmentedControl
        label={translate('blindtest.difficulty.label')}
        onChange={(next) => {
          if (isDifficulty(next)) {
            onChange({ ...settings, difficulty: next })
          }
        }}
        options={trackDifficulties.map((difficulty) => ({
          label: translate(difficultyLabelKey(difficulty)),
          value: difficulty
        }))}
        value={settings.difficulty}
      />

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
        label={translate('blindtest.clip')}
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
