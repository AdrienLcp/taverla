import type React from 'react'
import { useState } from 'react'
import { Form } from 'react-aria-components'

import type { PlayerId } from '@taverla/protocol/identifiers'
import type { RoundView } from '@taverla/protocol/room'
import type { Verdict } from '@taverla/protocol/scoring'

import { whatTheRoomNames } from '@taverla/core/blindtest/typed-answer'
import {
  isFullyBanked,
  isMiss,
  verdictKindFor
} from '@taverla/core/scoring/verdict'

import { bankedHalves } from '@/helpers/round-content'
import { Button } from '@/presentation/components/button'
import { TextField } from '@/presentation/components/text-field'
import { useTranslate } from '@/presentation/i18n/i18n-provider'
import type { PlainTranslationKey } from '@/presentation/i18n/translation'

import './answer-forms.sass'

/**
 * The round rather than a whole room view: the host console shows these too
 * when its owner has taken a seat, and it holds a different view type.
 */
type AnswerFormProps = {
  /** `false` from the socket means the frame was never written. */
  onAnswer: (answer: PlayerAnswer) => boolean
  round: RoundView | null
}

export type PlayerAnswer =
  | { choiceIndex: number; kind: 'choice' }
  | { guess: string; kind: 'typed' }

/**
 * Every arm of a choice round in the one shape a column of buttons needs. A
 * quiz candidate is a single claim; the blind test's is a track, and a title
 * with no artist under it is not one of four distinguishable answers.
 */
type Candidate = {
  key: string
  /** The blind test's second line, and `null` for a candidate that is one line. */
  subtitle: string | null
  title: string
}

const candidatesIn = (round: RoundView): Candidate[] => {
  const content = round.content

  switch (content.kind) {
    case 'blindtest':
      return content.choices.map((choice) => ({
        key: choice.id,
        subtitle: choice.artist,
        title: whatTheRoomNames(choice)
      }))
    // None of the three serves candidates to pick from here: two have no
    // content at all, and Le Fake's board is written by the room and voted on
    // by its own form.
    case 'buzzer':
    case 'lefake':
    case 'reflex':
      return []
    case 'quiz':
      return content.choices.map((choice) => ({
        key: choice,
        subtitle: null,
        title: choice
      }))
  }
}

type ChoiceAnswerProps = AnswerFormProps & {
  /** `null` on a console that is only running the room, which shows no form. */
  youId: PlayerId | null
}

/**
 * One pick and the round waits for the others — it takes no floor the way a
 * buzz does, and the music keeps running under everyone.
 *
 * Mounted under `key={round.id}`, so `hasSent` is about this round and nothing
 * else.
 */
export const ChoiceAnswer: React.FC<ChoiceAnswerProps> = ({
  onAnswer,
  round,
  youId
}) => {
  const translate = useTranslate()
  const [hasSent, setHasSent] = useState(false)

  if (round === null) {
    return null
  }

  // The server's answer is what survives a reload; the local half is only there
  // because the round trip is 20–80 ms and a grid that stays live that long
  // takes a second tap the server then refuses in silence.
  const hasAnswered =
    hasSent || round.answers.some((answer) => answer.playerId === youId)

  return (
    <section className='answer-form choices'>
      {/*
        The typed field has said *as many goes as you like* since it existed;
        the grid beside it said nothing at all, and it is the harder of the two
        to guess — four buttons look like a thing you can try. It is also the
        mode the quiz now opens on, so it is the first form most players meet.

        Above the grid rather than under it: it changes which button a thumb
        commits to, so it is read before the choosing and not after.
      */}
      <p className='hint'>{translate('round.answer.oneShot')}</p>
      <ul>
        {candidatesIn(round).map((candidate, index) => (
          <li key={candidate.key}>
            <Button
              isDisabled={hasAnswered}
              onPress={() => {
                setHasSent(onAnswer({ choiceIndex: index, kind: 'choice' }))
              }}
              variant='outlined'
            >
              <span className='title'>{candidate.title}</span>
              {candidate.subtitle !== null && (
                <span className='subtitle'>{candidate.subtitle}</span>
              )}
            </Button>
          </li>
        ))}
      </ul>
      <AnswerStatus
        doneKey='round.answer.locked'
        hasAnswered={hasAnswered}
        round={round}
      />
    </section>
  )
}

type TypedAnswerProps = AnswerFormProps & {
  /**
   * Whether this round's two halves are a film and its composer rather than a
   * title and its artist. Read off the room's settings, never off the track:
   * the phone is not sent the track while the answer can still be typed.
   */
  asksForAFilm: boolean
  /**
   * What the server has banked for this player, and `null` before their first
   * guess. Two halves in the blind test, one claim everywhere else — and the
   * field closes once it holds everything the round had for them.
   */
  verdict: Verdict | null
}

/**
 * One field and as many goes as the round allows. Two fields asked a player to
 * know which half they were holding before they could say it, where a typed
 * round is won by firing the moment something surfaces — so the guess goes in
 * whole and the server decides what it was worth.
 */
export const TypedAnswer: React.FC<TypedAnswerProps> = ({
  asksForAFilm,
  onAnswer,
  round,
  verdict
}) => {
  const translate = useTranslate()
  const [guess, setGuess] = useState('')

  if (round === null) {
    return null
  }

  const judgedInHalves = verdictKindFor(round.content.kind) === 'halves'
  const isDone = verdict !== null && isFullyBanked(verdict)
  const isEmpty = guess.trim() === ''

  return (
    <section className='answer-form typed'>
      {/* Above the field, because it is the context for the next guess. */}
      <GuessFeedback asksForAFilm={asksForAFilm} verdict={verdict} />
      <Form
        onSubmit={(event) => {
          event.preventDefault()

          // Cleared on send rather than on the snapshot coming back: the round
          // trip is 20–80ms, and a field that holds a spent guess that long is
          // where the next one gets typed onto the end of the last.
          if (!isEmpty && onAnswer({ guess: guess.trim(), kind: 'typed' })) {
            setGuess('')
          }
        }}
      >
        <TextField
          autoComplete='off'
          // The form only ever mounts on `playing`, so this opens the keyboard
          // when the round does and never over a countdown nobody can answer.
          autoFocus
          description={translate(
            judgedInHalves
              ? asksForAFilm
                ? 'blindtest.answer.anyOrderFilm'
                : 'blindtest.answer.anyOrder'
              : 'round.answer.retry'
          )}
          enterKeyHint='send'
          isDisabled={isDone}
          label={translate('round.answer.label')}
          onChange={setGuess}
          value={guess}
        />
        <Button isDisabled={isDone || isEmpty} size='large' type='submit'>
          {translate('round.answer.submit')}
        </Button>
      </Form>
      <AnswerStatus
        doneKey={
          judgedInHalves ? 'blindtest.answer.bothFound' : 'round.answer.correct'
        }
        hasAnswered={isDone}
        round={round}
      />
    </section>
  )
}

/**
 * Without this a second guess is a guess at what to guess at: the player has
 * been told nothing about the first. It names only what *they* banked, which is
 * why it can be shown before the reveal.
 *
 * A miss and a half are mutually exclusive by construction — `isMiss` is a
 * verdict worth nothing, so anything banked rules it out — which is what lets
 * one row carry both without ever holding a contradiction.
 *
 * It mounts on every round and stays: an element that appeared with the first
 * verdict spent a `gap` it had nothing to fill, shifting the field and its
 * button down under a thumb already aiming at them, and a live region that
 * arrives already holding its text is a change no screen reader watched happen.
 */
const GuessFeedback = ({
  asksForAFilm,
  verdict
}: {
  asksForAFilm: boolean
  verdict: Verdict | null
}) => {
  const translate = useTranslate()
  const banked = bankedHalves(verdict)

  return (
    <p className='banked' role='status'>
      {banked?.titleCorrect === true && (
        <span className='half'>
          {translate(
            asksForAFilm
              ? 'blindtest.answer.filmFound'
              : 'blindtest.answer.titleFound'
          )}
        </span>
      )}
      {banked?.artistCorrect === true && (
        <span className='half'>
          {translate(
            asksForAFilm
              ? 'blindtest.answer.composerFound'
              : 'blindtest.answer.artistFound'
          )}
        </span>
      )}
      {verdict !== null && isMiss(verdict) && (
        <span className='missed'>{translate('round.answer.missed')}</span>
      )}
    </p>
  )
}

const AnswerStatus = ({
  doneKey,
  hasAnswered,
  round
}: {
  /** What a player who has nothing left to do is told — the two modes end differently. */
  doneKey: PlainTranslationKey
  hasAnswered: boolean
  round: RoundView | null
}) => {
  const translate = useTranslate()

  return (
    <p className='status' role='status'>
      {hasAnswered
        ? translate(doneKey)
        : translate('round.answer.waiting', {
            count: round?.answers.length ?? 0
          })}
    </p>
  )
}
