import type React from 'react'
import { useState } from 'react'
import { Form } from 'react-aria-components'

import type { RoundView } from '@taverla/protocol/room'
import type { HalvesVerdict, Verdict } from '@taverla/protocol/scoring'

import { isFullyBanked, verdictKindFor } from '@taverla/core/scoring/verdict'

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
 * Both simultaneous modes share one shape: you answer once, the screen says you
 * are in, and the round waits for the others. Neither takes the floor the way a
 * buzz does — the music keeps running under everyone.
 */
const useAnswering = (onAnswer: (answer: PlayerAnswer) => boolean) => {
  const [answeredRoundId, setAnsweredRoundId] = useState<string | null>(null)

  return {
    answeredRoundId,
    submit: (answer: PlayerAnswer, roundId: string) => {
      if (onAnswer(answer)) {
        setAnsweredRoundId(roundId)
      }
    }
  }
}

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
        title: choice.title
      }))
    // Neither serves candidates to pick from here: one has no content at all,
    // and the other's board is written by the room and voted on by its own form.
    case 'buzzer':
    case 'lefake':
      return []
    case 'quiz':
      return content.choices.map((choice) => ({
        key: choice,
        subtitle: null,
        title: choice
      }))
  }
}

export const ChoiceAnswer: React.FC<AnswerFormProps> = ({
  onAnswer,
  round
}) => {
  const { answeredRoundId, submit } = useAnswering(onAnswer)

  if (round === null) {
    return null
  }

  const hasAnswered = answeredRoundId === round.id

  return (
    <section className='answer-form choices'>
      <ul>
        {candidatesIn(round).map((candidate, index) => (
          <li key={candidate.key}>
            <Button
              isDisabled={hasAnswered}
              onPress={() => {
                submit({ choiceIndex: index, kind: 'choice' }, round.id)
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
      <Banked banked={bankedHalves(verdict)} />
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
          description={translate(
            judgedInHalves ? 'blindtest.answer.anyOrder' : 'round.answer.retry'
          )}
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
 * why it can be shown before the reveal — and only a pair of halves has
 * anything to say here, since one claim is either held or still owed.
 */
const Banked = ({ banked }: { banked: HalvesVerdict | null }) => {
  const translate = useTranslate()

  if (banked === null) {
    return null
  }

  return (
    <p className='banked' role='status'>
      {banked.titleCorrect && (
        <span className='half'>{translate('blindtest.answer.titleFound')}</span>
      )}
      {banked.artistCorrect && (
        <span className='half'>
          {translate('blindtest.answer.artistFound')}
        </span>
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
