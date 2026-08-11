import type React from 'react'
import { useState } from 'react'
import { Form } from 'react-aria-components'

import type { RoundView } from '@taverla/protocol/room'
import type { HalvesVerdict } from '@taverla/protocol/scoring'

import { blindtestContent } from '@/helpers/blindtest-round'
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
        {(blindtestContent(round)?.choices ?? []).map((choice, index) => (
          <li key={choice.id}>
            <Button
              isDisabled={hasAnswered}
              onPress={() => {
                submit({ choiceIndex: index, kind: 'choice' }, round.id)
              }}
              variant='outlined'
            >
              <span className='title'>{choice.title}</span>
              <span className='artist'>{choice.artist}</span>
            </Button>
          </li>
        ))}
      </ul>
      <AnswerStatus
        doneKey='blindtest.answer.locked'
        hasAnswered={hasAnswered}
        round={round}
      />
    </section>
  )
}

type TypedAnswerProps = AnswerFormProps & {
  /** What the server has banked for this player, and `null` before their first guess. */
  banked: HalvesVerdict | null
}

/**
 * One field and as many goes as the clip allows. Two fields asked a player to
 * know which half they were holding before they could say it, where a typed
 * round is won by firing the moment something surfaces — so the guess goes in
 * whole and the server decides which half it was.
 */
export const TypedAnswer: React.FC<TypedAnswerProps> = ({
  banked,
  onAnswer,
  round
}) => {
  const translate = useTranslate()
  const [guess, setGuess] = useState('')

  if (round === null) {
    return null
  }

  const hasBoth = banked?.artistCorrect === true && banked.titleCorrect === true
  const isEmpty = guess.trim() === ''

  return (
    <section className='answer-form typed'>
      {/* Above the field, because it is the context for the next guess. */}
      <Banked banked={banked} />
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
          description={translate('blindtest.answer.anyOrder')}
          isDisabled={hasBoth}
          label={translate('blindtest.answer.guess')}
          onChange={setGuess}
          value={guess}
        />
        <Button isDisabled={hasBoth || isEmpty} size='large' type='submit'>
          {translate('blindtest.answer.send')}
        </Button>
      </Form>
      <AnswerStatus
        doneKey='blindtest.answer.bothFound'
        hasAnswered={hasBoth}
        round={round}
      />
    </section>
  )
}

/**
 * Without this a second guess is a guess at what to guess at: the player has
 * been told nothing about the first. It names only what *they* banked, which is
 * why it can be shown before the reveal.
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
        : translate('blindtest.answer.waiting', {
            count: round?.answers.length ?? 0
          })}
    </p>
  )
}
