import type React from 'react'

import {
  type QuestionCategory,
  type QuestionLanguage,
  questionCategories,
  questionLanguages
} from '@taverla/protocol/question'
import {
  type AnswerMode,
  answerModes,
  DEFAULT_MODE_SETTINGS,
  type RoomSettings
} from '@taverla/protocol/room'
import {
  type TrackDifficulty,
  trackDifficulties
} from '@taverla/protocol/track'

import { answerModesFor } from '@taverla/core/room/game-modes'

import { SegmentedControl } from '@/presentation/components/segmented-control'
import { Switch } from '@/presentation/components/switch'
import { ToggleGroup } from '@/presentation/components/toggle-group'
import { useTranslate } from '@/presentation/i18n/i18n-provider'
import { LANGUAGE_NAMES } from '@/presentation/i18n/language-names'
import {
  answerModeLabelKey,
  questionCategoryKey,
  scoringKey
} from '@/presentation/i18n/translation'

import './settings-panel.sass'

const ROUND_COUNTS = [5, 10, 20, 30] as const
const CLIP_DURATIONS_MS = [10_000, 20_000, 30_000] as const
const COUNTDOWN_DURATIONS_MS = [3_000, 5_000, 10_000] as const

/**
 * Longer than a clip at both ends: a question has to be read before it can be
 * answered, and a typed answer has to be spelled out where a pick is a tap.
 */
const QUESTION_DURATIONS_MS = [15_000, 30_000, 60_000] as const

/**
 * `0` stands for "no window" and for "no limit": the strips carry strings, and
 * a segment whose value is the empty string is one a screen reader announces as
 * nothing.
 */
const NO_LIMIT = 0
const ANSWER_WINDOWS_MS = [5_000, 10_000, 20_000, NO_LIMIT] as const
const ROUND_COUNT_OPTIONS = [...ROUND_COUNTS, NO_LIMIT] as const

type NumberChoiceProps = {
  isDisabled: boolean
  label: string
  onChange: (value: number) => void
  /** How each option reads. `NO_LIMIT` arrives here like any other number. */
  optionLabel: (value: number) => string
  options: readonly number[]
  value: number
}

/**
 * A strip of numbers, which is most of this panel. react-aria addresses a
 * segment by string, so the number has to be found again on the way back up.
 */
const NumberChoice: React.FC<NumberChoiceProps> = ({
  isDisabled,
  label,
  onChange,
  optionLabel,
  options,
  value
}) => (
  <SegmentedControl
    isDisabled={isDisabled}
    label={label}
    onChange={(next) => {
      const chosen = options.find((option) => String(option) === next)

      if (chosen !== undefined) {
        onChange(chosen)
      }
    }}
    options={options.map((option) => ({
      label: optionLabel(option),
      value: String(option)
    }))}
    value={String(value)}
  />
)

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

const asCategory = (value: string | number): QuestionCategory | undefined =>
  questionCategories.find((category) => category === value)

const isQuestionLanguage = (value: string): value is QuestionLanguage =>
  questionLanguages.some((language) => language === value)

type SettingsPanelProps = {
  /** The socket is open. Every control here sends a frame, so none of them work without it. */
  isLive: boolean
  /**
   * A round is under way, so the two controls it is *built on* are held until it
   * ends: it is scored on the way out from the mode it closes on, and it runs
   * for the clip length it opened with. The server refuses both — see
   * `reshapesRound`.
   */
  isRoundInPlay: boolean
  /** Applied to the room as it is pressed; nothing here waits for the launch. */
  onChange: (settings: RoomSettings) => void
  settings: RoomSettings
}

/**
 * The numbers that decide how a party goes, reachable for as long as it runs.
 * All but two land on the round after the one on screen, which is why they are
 * not folded away with the things only a lobby can offer.
 */
export const SettingsPanel: React.FC<SettingsPanelProps> = ({
  isLive,
  isRoundInPlay,
  onChange,
  settings
}) => {
  const translate = useTranslate()
  const isDisabled = !isLive
  const isHeldByRound = isDisabled || isRoundInPlay
  const game = settings.game
  const mode = settings.mode
  const offeredModes = answerModesFor(game?.kind ?? null)

  const secondsLabel = (milliseconds: number): string =>
    translate('host.seconds', { seconds: milliseconds / 1_000 })

  return (
    <section className='settings-panel'>
      {/*
        Nothing about answering until there is a game to answer: which modes are
        on offer is the game's to narrow, and what a round pays is the game's to
        say.
      */}
      {game !== null && (
        <>
          {/*
            Hidden rather than disabled when the game offers one mode: a control
            with a single segment asks the host to choose something they have no
            choice about.
          */}
          {offeredModes.length > 1 && (
            <SegmentedControl
              isDisabled={isHeldByRound}
              label={translate('host.answerMode.label')}
              onChange={(next) => {
                if (isAnswerMode(next)) {
                  onChange({ ...settings, mode: DEFAULT_MODE_SETTINGS[next] })
                }
              }}
              options={offeredModes.map((offered) => ({
                label: translate(answerModeLabelKey(offered)),
                value: offered
              }))}
              value={mode.kind}
            />
          )}
          {/*
            Under the control that chooses it rather than on the screen where it
            is played: the lobby is the only moment nobody is against a clock,
            and the host is the one deciding what the evening will be worth.
          */}
          <p className='hint'>
            {translate(scoringKey({ answerMode: mode.kind, game: game.kind }))}
          </p>
        </>
      )}

      {game?.kind === 'blindtest' && (
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

      {game?.kind === 'buzzer' && (
        <Switch
          isDisabled={isDisabled}
          isSelected={game.locksOutOnMiss}
          label={translate('buzzer.lockout')}
          onChange={(locksOutOnMiss) => {
            onChange({ ...settings, game: { ...game, locksOutOnMiss } })
          }}
        />
      )}

      {game?.kind === 'quiz' && (
        <>
          {/*
            The host's alone, and never the reader's: the interface locale is
            stored per device, so two players in one room can hold different
            ones and drawing from them would deal each phone its own question.
            It opens on whatever the host was reading and moves independently
            after that — a room can play in French on an English console.
          */}
          <SegmentedControl
            isDisabled={isDisabled}
            label={translate('quiz.language')}
            onChange={(next) => {
              if (isQuestionLanguage(next)) {
                onChange({ ...settings, game: { ...game, language: next } })
              }
            }}
            options={questionLanguages.map((language) => ({
              label: LANGUAGE_NAMES[language],
              value: language
            }))}
            value={game.language}
          />
          <ToggleGroup
            isDisabled={isDisabled}
            label={translate('quiz.category.label')}
            onSelectionChange={(keys) => {
              onChange({
                ...settings,
                game: {
                  ...game,
                  categories: [...keys]
                    .map(asCategory)
                    .filter((category) => category !== undefined)
                }
              })
            }}
            options={questionCategories.map((category) => ({
              label: translate(questionCategoryKey(category)),
              value: category
            }))}
            selectedKeys={game.categories}
          />
          {game.categories.length === 0 && (
            <p className='hint'>{translate('quiz.category.none')}</p>
          )}
          <Switch
            isDisabled={isDisabled}
            isSelected={game.allowsAdultContent}
            label={translate('quiz.adult.label')}
            onChange={(allowsAdultContent) => {
              onChange({ ...settings, game: { ...game, allowsAdultContent } })
            }}
          />
          <p className='hint'>{translate('quiz.adult.hint')}</p>
        </>
      )}

      <NumberChoice
        isDisabled={isDisabled}
        label={translate('host.rounds')}
        onChange={(count) => {
          onChange({
            ...settings,
            roundCount: count === NO_LIMIT ? null : count
          })
        }}
        optionLabel={(count) =>
          count === NO_LIMIT ? translate('host.roundCount.open') : String(count)
        }
        options={ROUND_COUNT_OPTIONS}
        value={settings.roundCount ?? NO_LIMIT}
      />

      {game?.kind === 'blindtest' && (
        <NumberChoice
          isDisabled={isHeldByRound}
          label={translate('blindtest.clip')}
          onChange={(roundDurationMs) => {
            onChange({ ...settings, game: { ...game, roundDurationMs } })
          }}
          optionLabel={secondsLabel}
          options={CLIP_DURATIONS_MS}
          value={game.roundDurationMs}
        />
      )}

      {game?.kind === 'quiz' && (
        <NumberChoice
          isDisabled={isHeldByRound}
          label={translate('quiz.duration')}
          onChange={(roundDurationMs) => {
            onChange({ ...settings, game: { ...game, roundDurationMs } })
          }}
          optionLabel={secondsLabel}
          options={QUESTION_DURATIONS_MS}
          value={game.roundDurationMs}
        />
      )}

      {mode.kind === 'buzzer' && (
        <NumberChoice
          isDisabled={isDisabled}
          label={translate('host.answerWindow.label')}
          onChange={(chosen) => {
            onChange({
              ...settings,
              mode: {
                ...mode,
                answerWindowMs: chosen === NO_LIMIT ? null : chosen
              }
            })
          }}
          optionLabel={(milliseconds) =>
            milliseconds === NO_LIMIT
              ? translate('host.answerWindow.none')
              : secondsLabel(milliseconds)
          }
          options={ANSWER_WINDOWS_MS}
          value={mode.answerWindowMs ?? NO_LIMIT}
        />
      )}

      <NumberChoice
        isDisabled={isDisabled}
        label={translate('host.countdown')}
        onChange={(countdownMs) => {
          onChange({ ...settings, countdownMs })
        }}
        optionLabel={secondsLabel}
        options={COUNTDOWN_DURATIONS_MS}
        value={settings.countdownMs}
      />
    </section>
  )
}
