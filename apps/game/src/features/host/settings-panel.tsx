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

import { answerModesFor } from '@taverla/core/room/game-modes'

import { SegmentedControl } from '@/presentation/components/segmented-control'
import { Switch } from '@/presentation/components/switch'
import { useTranslate } from '@/presentation/i18n/i18n-provider'
import { answerModeLabelKey, scoringKey } from '@/presentation/i18n/translation'

import './settings-panel.sass'

const ROUND_COUNTS = [5, 10, 20, 30] as const
const CLIP_DURATIONS_MS = [10_000, 20_000, 30_000] as const
const COUNTDOWN_DURATIONS_MS = [3_000, 5_000, 10_000] as const

/**
 * `0` stands for "no window" and for "no limit": the strips carry strings, and
 * a segment whose value is the empty string is one a screen reader announces as
 * nothing.
 */
const NO_LIMIT = 0
const ANSWER_WINDOWS_MS = [5_000, 10_000, 20_000, NO_LIMIT] as const
const ROUND_COUNT_OPTIONS = [...ROUND_COUNTS, NO_LIMIT] as const

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

const isAnswerMode = (value: string): value is AnswerMode =>
  answerModes.some((mode) => mode === value)

type SettingsPanelProps = {
  /** The socket is open. Every control here sends a frame, so none of them work without it. */
  isLive: boolean
  /** Applied to the room as it is pressed; nothing here waits for the launch. */
  onChange: (settings: RoomSettings) => void
  settings: RoomSettings
}

/**
 * The numbers that decide how a party goes, in the lobby where the host is
 * already standing. The source next to them is a draft the launch commits,
 * because a search can come back empty; these cannot, so they land immediately.
 */
export const SettingsPanel: React.FC<SettingsPanelProps> = ({
  isLive,
  onChange,
  settings
}) => {
  const translate = useTranslate()
  const isDisabled = !isLive
  const game = settings.game
  const offeredModes = answerModesFor(game.kind)

  const secondsLabel = (milliseconds: number): string =>
    translate('host.seconds', { seconds: milliseconds / 1_000 })

  return (
    <section className='settings-panel'>
      {/*
        Hidden rather than disabled when the game offers one mode: a control
        with a single segment asks the host to choose something they have no
        choice about.
      */}
      {offeredModes.length > 1 && (
        <SegmentedControl
          isDisabled={isDisabled}
          label={translate('host.answerMode.label')}
          onChange={(next) => {
            if (isAnswerMode(next)) {
              onChange({ ...settings, answerMode: next })
            }
          }}
          options={offeredModes.map((mode) => ({
            label: translate(answerModeLabelKey(mode)),
            value: mode
          }))}
          value={settings.answerMode}
        />
      )}
      {/*
        Under the control that chooses it rather than on the screen where it is
        played: the lobby is the only moment nobody is against a clock, and the
        host is the one deciding what the evening will be worth.
      */}
      <p className='hint'>
        {translate(
          scoringKey({ answerMode: settings.answerMode, game: game.kind })
        )}
      </p>

      {game.kind === 'blindtest' && (
        <SegmentedControl
          isDisabled={isDisabled}
          label={translate('blindtest.difficulty.label')}
          onChange={(next) => {
            if (isDifficulty(next)) {
              onChange({ ...settings, game: { ...game, difficulty: next } })
            }
          }}
          options={trackDifficulties.map((difficulty) => ({
            label: translate(difficultyLabelKey(difficulty)),
            value: difficulty
          }))}
          value={game.difficulty}
        />
      )}

      {game.kind === 'buzzer' && (
        <Switch
          isDisabled={isDisabled}
          isSelected={game.locksOutOnMiss}
          label={translate('buzzer.lockout')}
          onChange={(locksOutOnMiss) => {
            onChange({ ...settings, game: { ...game, locksOutOnMiss } })
          }}
        />
      )}

      <SegmentedControl
        isDisabled={isDisabled}
        label={translate('host.rounds')}
        onChange={(next) => {
          const chosen = optionFrom(ROUND_COUNT_OPTIONS, next)

          if (chosen !== undefined) {
            onChange({
              ...settings,
              roundCount: chosen === NO_LIMIT ? null : chosen
            })
          }
        }}
        options={ROUND_COUNT_OPTIONS.map((count) => ({
          label:
            count === NO_LIMIT
              ? translate('host.roundCount.open')
              : String(count),
          value: String(count)
        }))}
        value={String(settings.roundCount ?? NO_LIMIT)}
      />

      {game.kind === 'blindtest' && (
        <SegmentedControl
          isDisabled={isDisabled}
          label={translate('blindtest.clip')}
          onChange={(next) => {
            const roundDurationMs = optionFrom(CLIP_DURATIONS_MS, next)

            if (roundDurationMs !== undefined) {
              onChange({ ...settings, game: { ...game, roundDurationMs } })
            }
          }}
          options={CLIP_DURATIONS_MS.map((milliseconds) => ({
            label: secondsLabel(milliseconds),
            value: String(milliseconds)
          }))}
          value={String(game.roundDurationMs)}
        />
      )}

      {settings.answerMode === 'buzzer' && (
        <SegmentedControl
          isDisabled={isDisabled}
          label={translate('host.answerWindow')}
          onChange={(next) => {
            const chosen = optionFrom(ANSWER_WINDOWS_MS, next)

            if (chosen !== undefined) {
              onChange({
                ...settings,
                answerWindowMs: chosen === NO_LIMIT ? null : chosen
              })
            }
          }}
          options={ANSWER_WINDOWS_MS.map((milliseconds) => ({
            label:
              milliseconds === NO_LIMIT
                ? translate('host.answerWindow.none')
                : secondsLabel(milliseconds),
            value: String(milliseconds)
          }))}
          value={String(settings.answerWindowMs ?? NO_LIMIT)}
        />
      )}

      <SegmentedControl
        isDisabled={isDisabled}
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
