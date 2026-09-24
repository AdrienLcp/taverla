import type React from 'react'

import type { GameSettings } from '@taverla/protocol/game'
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
import { MAX_SLATE_ITEMS, MIN_SLATE_ITEMS } from '@taverla/protocol/slate'
import {
  type TrackDifficulty,
  type TrackSource,
  trackDifficulties
} from '@taverla/protocol/track'

import { hasAdultContent } from '@taverla/core/quiz/adult-content'
import { answerModesFor } from '@taverla/core/room/game-modes'

import { NumberField } from '@/presentation/components/number-field'
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

import { NO_LIMIT, NumberChoice, useDurationLabels } from './number-choice'
import { SlateKeyEditor } from './slate-key-editor'
import { SlateLabelsEditor } from './slate-labels-editor'

import './settings-panel.sass'

const ROUND_COUNTS = [5, 10, 20, 30] as const
const CLIP_DURATIONS_MS = [10_000, 20_000, 30_000] as const
const COUNTDOWN_DURATIONS_MS = [3_000, 5_000, 10_000] as const

/**
 * Longer than a clip at both ends: a question has to be read before it can be
 * answered, and a typed answer has to be spelled out where a pick is a press.
 */
const QUESTION_DURATIONS_MS = [15_000, 30_000, 60_000] as const

/**
 * Longer again at both ends, and for two different jobs: inventing something
 * believable takes longer than recalling an answer, and reading five lies off a
 * screen before choosing takes longer than reading four candidates.
 */
const WRITING_DURATIONS_MS = [30_000, 60_000, 90_000, NO_LIMIT] as const

/**
 * The floor is 20 rather than the 10 the other ladders start at: this one is
 * spent reading a board that holds up to ten lines somebody else wrote, and a
 * choice offered where nobody could have finished reading is a trap.
 */
const VOTING_DURATIONS_MS = [20_000, 30_000, 60_000, NO_LIMIT] as const

const ANSWER_WINDOWS_MS = [5_000, 10_000, 20_000, NO_LIMIT] as const
const ROUND_COUNT_OPTIONS = [...ROUND_COUNTS, NO_LIMIT] as const

/**
 * Both games that draw from the bank, in the one type their shared controls
 * need. It is an `Extract` rather than a new protocol type because what they
 * share is three settings, not a shape worth naming on the wire.
 */
type BankDrawingGame = Extract<GameSettings, { kind: 'lefake' | 'quiz' }>

/**
 * The three questions the bank asks whoever is drawing from it. Extracted the
 * moment a second game asked them, and not before — the quiz carried them
 * inline while it was the only one.
 */
const QuestionBankSettings: React.FC<{
  game: BankDrawingGame
  isDisabled: boolean
  onChange: (game: BankDrawingGame) => void
}> = ({ game, isDisabled, onChange }) => {
  const translate = useTranslate()

  return (
    <>
      {/*
        The host's alone, and never the reader's: the interface locale is stored
        per device, so two players in one room can hold different ones and
        drawing from them would deal each player their own question. It opens on
        whatever the host was reading and moves independently after that — a
        room can play in French on an English console.
      */}
      <SegmentedControl
        isDisabled={isDisabled}
        label={translate('quiz.language')}
        onChange={(next) => {
          if (isQuestionLanguage(next)) {
            onChange({ ...game, language: next })
          }
        }}
        options={questionLanguages.map((language) => ({
          label: LANGUAGE_NAMES[language],
          value: language
        }))}
        value={game.language}
      />
      <ToggleGroup
        className='question-subjects'
        isDisabled={isDisabled}
        label={translate('quiz.category.label')}
        onSelectionChange={(keys) => {
          onChange({
            ...game,
            categories: [...keys]
              .map(asCategory)
              .filter((category) => category !== undefined)
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
        description={translate('quiz.wellKnown.hint')}
        isDisabled={isDisabled}
        isSelected={game.wellKnownOnly}
        label={translate('quiz.wellKnown.label')}
        onChange={(wellKnownOnly) => {
          onChange({ ...game, wellKnownOnly })
        }}
      />
      {/*
        Hidden where the bank has nothing to rate, for the same reason the mode
        strip is hidden when a game offers one: this one would keep its promise
        and change nothing. The value is left alone rather than reset, so a host
        who turns it on in French still has it on when they come back.
      */}
      {hasAdultContent(game.language) && (
        <Switch
          description={translate('quiz.adult.hint')}
          isDisabled={isDisabled}
          isSelected={game.allowsAdultContent}
          label={translate('quiz.adult.label')}
          onChange={(allowsAdultContent) => {
            onChange({ ...game, allowsAdultContent })
          }}
        />
      )}
    </>
  )
}

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
  /**
   * What the picker above is currently showing, which the room does not hold
   * yet — nothing there commits until a round opens. `null` while the chosen
   * kind is still missing the text it needs.
   */
  draftSource: TrackSource | null
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
  /** Files one key on this tab; the room hears of it only when the sheets open. */
  onPrepareSlateKey: (itemIndex: number, key: string) => void
  /** The slate's answer key as this host prepared it, by item index. */
  preparedSlateKeys: readonly (string | null)[]
  settings: RoomSettings
}

/**
 * The numbers that decide how a party goes, reachable for as long as it runs.
 * All but two land on the round after the one on screen, which is why they are
 * not folded away with the things only a lobby can offer.
 */
export const SettingsPanel: React.FC<SettingsPanelProps> = ({
  draftSource,
  isLive,
  isRoundInPlay,
  onChange,
  onPrepareSlateKey,
  preparedSlateKeys,
  settings
}) => {
  const translate = useTranslate()
  const isDisabled = !isLive
  const isHeldByRound = isDisabled || isRoundInPlay
  const game = settings.game
  const mode = settings.mode
  const offeredModes = answerModesFor(game?.kind ?? null)
  // Read from the draft rather than from the room, or this strip goes on
  // claiming to work for a whole round after the composers were chosen.
  const chosenSource =
    draftSource ?? (game?.kind === 'blindtest' ? game.source : null)
  const pinsItsOwnDifficulty = chosenSource?.kind === 'film'

  const { openEnded: openEndedSecondsLabel, seconds: secondsLabel } =
    useDurationLabels()

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
              className='answer-mode'
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
            {translate(
              scoringKey({
                answerMode: mode.kind,
                asksForAFilm: pinsItsOwnDifficulty,
                game: game.kind
              })
            )}
          </p>
        </>
      )}

      {game?.kind === 'blindtest' && (
        <SegmentedControl
          className='track-difficulty'
          isDisabled={isDisabled || pinsItsOwnDifficulty}
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

      {/*
        Said where the lie would otherwise be told. The composers pin their own
        floor, so this strip decides nothing while they are the source — and a
        control that quietly stopped working is worse than one that is ruled
        and says why.
      */}
      {game?.kind === 'blindtest' && pinsItsOwnDifficulty && (
        <p className='hint'>
          {translate('blindtest.difficulty.pinnedByFilms')}
        </p>
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

      {game?.kind === 'slate' && (
        <NumberField
          className='item-count'
          isDisabled={isDisabled}
          label={translate('slate.items.label')}
          maxValue={MAX_SLATE_ITEMS}
          minValue={MIN_SLATE_ITEMS}
          onChange={(itemCount) => {
            if (Number.isInteger(itemCount)) {
              onChange({ ...settings, game: { ...game, itemCount } })
            }
          }}
          value={game.itemCount}
        />
      )}

      {/*
        The lobby's copy of the editor. Once the sheets are open the console
        carries one beside the answer key, sized to the sheet as it has grown.
      */}
      {game?.kind === 'slate' && !isRoundInPlay && (
        <SlateLabelsEditor
          isDisabled={isDisabled}
          itemCount={game.itemCount}
          labels={game.labels}
          onChange={(labels) => {
            onChange({ ...settings, game: { ...game, labels } })
          }}
        />
      )}

      {game?.kind === 'slate' && !isRoundInPlay && (
        <SlateKeyEditor
          hint={translate('slate.key.hint')}
          isDisabled={false}
          itemCount={game.itemCount}
          keys={preparedSlateKeys}
          labels={game.labels}
          onSetKey={onPrepareSlateKey}
        />
      )}

      {(game?.kind === 'lefake' || game?.kind === 'quiz') && (
        <QuestionBankSettings
          game={game}
          isDisabled={isDisabled}
          onChange={(next) => {
            onChange({ ...settings, game: next })
          }}
        />
      )}

      {/*
        A slate is one sheet, marked once: the next sheet is the next game, set
        up afresh, and a strip offering five of them would offer no *one*.
      */}
      {game?.kind !== 'slate' && (
        <NumberChoice
          className='round-count'
          isDisabled={isDisabled}
          label={translate('host.rounds')}
          onChange={(count) => {
            onChange({
              ...settings,
              roundCount: count === NO_LIMIT ? null : count
            })
          }}
          optionLabel={(count) =>
            count === NO_LIMIT
              ? translate('host.roundCount.open')
              : String(count)
          }
          options={ROUND_COUNT_OPTIONS}
          value={settings.roundCount ?? NO_LIMIT}
        />
      )}

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

      {game?.kind === 'lefake' && (
        <>
          <NumberChoice
            className='write-duration'
            isDisabled={isHeldByRound}
            label={translate('lefake.write.duration')}
            onChange={(chosen) => {
              onChange({
                ...settings,
                game: {
                  ...game,
                  roundDurationMs: chosen === NO_LIMIT ? null : chosen
                }
              })
            }}
            optionLabel={openEndedSecondsLabel}
            options={WRITING_DURATIONS_MS}
            value={game.roundDurationMs ?? NO_LIMIT}
          />
          <NumberChoice
            className='vote-duration'
            isDisabled={isHeldByRound}
            label={translate('lefake.vote.duration')}
            onChange={(chosen) => {
              onChange({
                ...settings,
                game: {
                  ...game,
                  voteDurationMs: chosen === NO_LIMIT ? null : chosen
                }
              })
            }}
            optionLabel={openEndedSecondsLabel}
            options={VOTING_DURATIONS_MS}
            value={game.voteDurationMs ?? NO_LIMIT}
          />
        </>
      )}

      {/*
        Buzzer-moded and still nothing to hold: a reflex press takes no floor
        and waits for no verdict, so how long a player has to answer is a
        setting about a moment this game does not have.
      */}
      {mode.kind === 'buzzer' && game?.kind !== 'reflex' && (
        <NumberChoice
          className='answer-window'
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
          optionLabel={openEndedSecondsLabel}
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
