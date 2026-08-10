import type React from 'react'
import { useState } from 'react'
import { Form } from 'react-aria-components'

import type { RoundView } from '@taverla/protocol/room'

import { Button } from '@/presentation/components/button'
import { TextField } from '@/presentation/components/text-field'
import { useTranslate } from '@/presentation/i18n/i18n-provider'

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
  | { artist: string; kind: 'typed'; title: string }

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
        {round.choices.map((choice, index) => (
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
      <AnswerStatus hasAnswered={hasAnswered} round={round} />
    </section>
  )
}

export const TypedAnswer: React.FC<AnswerFormProps> = ({ onAnswer, round }) => {
  const translate = useTranslate()
  const { answeredRoundId, submit } = useAnswering(onAnswer)
  const [title, setTitle] = useState('')
  const [artist, setArtist] = useState('')

  if (round === null) {
    return null
  }

  const hasAnswered = answeredRoundId === round.id

  return (
    <section className='answer-form typed'>
      <Form
        onSubmit={(event) => {
          event.preventDefault()
          submit({ artist, kind: 'typed', title }, round.id)
        }}
      >
        <TextField
          autoComplete='off'
          isDisabled={hasAnswered}
          label={translate('blindtest.answer.title')}
          onChange={setTitle}
          value={title}
        />
        <TextField
          autoComplete='off'
          isDisabled={hasAnswered}
          label={translate('blindtest.answer.artist')}
          onChange={setArtist}
          value={artist}
        />
        {/*
          Either half scores on its own, so the only answer worth refusing is an
          empty one — a player who has the artist and not the song still sends.
        */}
        <Button
          isDisabled={
            hasAnswered || (title.trim() === '' && artist.trim() === '')
          }
          size='large'
          type='submit'
        >
          {translate('blindtest.answer.send')}
        </Button>
      </Form>
      <AnswerStatus hasAnswered={hasAnswered} round={round} />
    </section>
  )
}

const AnswerStatus = ({
  hasAnswered,
  round
}: {
  hasAnswered: boolean
  round: RoundView | null
}) => {
  const translate = useTranslate()

  return (
    <p className='status' role='status'>
      {hasAnswered
        ? translate('blindtest.answer.locked')
        : translate('blindtest.answer.waiting', {
            count: round?.answers.length ?? 0
          })}
    </p>
  )
}
