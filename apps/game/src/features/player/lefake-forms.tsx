import type React from 'react'
import { useState } from 'react'
import { Form } from 'react-aria-components'

import type { ProtocolErrorCode } from '@taverla/protocol/error-code'
import { LIE_MAX_LENGTH } from '@taverla/protocol/lefake'
import type { RoundView } from '@taverla/protocol/room'

import { lefakeContent } from '@/helpers/round-content'
import { Button } from '@/presentation/components/button'
import { TextField } from '@/presentation/components/text-field'
import { useTranslate } from '@/presentation/i18n/i18n-provider'
import { protocolErrorKey } from '@/presentation/i18n/translation'

import './lefake-forms.sass'

type LefakeFormProps = {
  /**
   * The last thing the server refused, and `null` when it has refused nothing.
   * Both forms below need it for the same reason: their optimistic "done" state
   * has to be taken back when the frame turns out not to have been accepted.
   */
  error: ProtocolErrorCode | null
  round: RoundView | null
  youId: string
}

type LieFormProps = LefakeFormProps & {
  /** `false` from the socket means the frame was never written. */
  onSubmitLie: (lie: string) => boolean
}

/**
 * The writing half. It looks like the typed answer form and is not one: nothing
 * here is graded, so there is no verdict to feed back — but there is one refusal
 * a player can hit honestly, and writing the real answer has to be recoverable
 * rather than spending their go.
 */
export const LieForm: React.FC<LieFormProps> = ({
  error,
  onSubmitLie,
  round,
  youId
}) => {
  const translate = useTranslate()
  const [lie, setLie] = useState('')
  const [sentForRoundId, setSentForRoundId] = useState<string | null>(null)
  const content = lefakeContent(round)

  if (round === null || content === null) {
    return null
  }

  // The socket holds the last error until it reopens, so an untried round would
  // otherwise open showing the refusal from the one before it. Nothing this
  // player has not sent *this* round can have been refused.
  const hasTried = sentForRoundId === round.id
  const isRefused = hasTried && error !== null

  // Believed until the server disagrees. The round trip is 20–80 ms and a field
  // left open that long is where a second lie gets typed on the end of the
  // first — but a refusal has to hand the field back, or "that is the real
  // answer" would be a message beside a control nobody can use.
  const hasSent =
    content.writtenPlayerIds.includes(youId) || (hasTried && !isRefused)

  const isEmpty = lie.trim() === ''

  return (
    <section className='lefake-form'>
      <Form
        onSubmit={(event) => {
          event.preventDefault()

          if (!isEmpty && onSubmitLie(lie.trim())) {
            setSentForRoundId(round.id)
          }
        }}
      >
        <TextField
          autoComplete='off'
          description={translate('lefake.write.description')}
          enterKeyHint='send'
          errorMessage={
            isRefused ? translate(protocolErrorKey(error)) : undefined
          }
          isDisabled={hasSent}
          isInvalid={isRefused && !hasSent}
          label={translate('lefake.write.label')}
          maxLength={LIE_MAX_LENGTH}
          onChange={(next) => {
            setLie(next)

            // Typing takes the refusal back, and it has to: react-aria marks an
            // invalid field on the form itself, and a native submit of an
            // invalid form does nothing at all — so leaving it standing would
            // mean the button quietly stopped working after "that is the real
            // answer", which is the one refusal a player is meant to recover
            // from.
            setSentForRoundId(null)
          }}
          value={lie}
        />
        <Button isDisabled={hasSent || isEmpty} size='large' type='submit'>
          {translate('round.answer.submit')}
        </Button>
      </Form>
      <p className='status' role='status'>
        {hasSent
          ? translate('lefake.write.sent')
          : translate('lefake.write.waiting', {
              count: content.writtenPlayerIds.length
            })}
      </p>
    </section>
  )
}

type VoteBoardProps = LefakeFormProps & {
  /** `false` from the socket means the frame was never written. */
  onVote: (candidateId: string) => boolean
}

/**
 * The board, on a player's screen. A player's own line is shown rather than
 * hidden — it is half the fun of the round to watch it sit there — but it
 * cannot be pressed, and the server refuses it anyway.
 */
export const VoteBoard: React.FC<VoteBoardProps> = ({
  error,
  onVote,
  round,
  youId
}) => {
  const translate = useTranslate()
  const [votedForRoundId, setVotedForRoundId] = useState<string | null>(null)
  const content = lefakeContent(round)

  if (round === null || content?.board == null) {
    return null
  }

  const hasTried = votedForRoundId === round.id
  const isRefused = hasTried && error !== null

  const hasVoted =
    content.votedPlayerIds.includes(youId) || (hasTried && !isRefused)

  return (
    <section className='lefake-form vote'>
      <p className='vote-title'>{translate('lefake.vote.title')}</p>
      <ul>
        {content.board.map((candidate) => {
          const isYours = candidate.id === content.yourCandidateId

          return (
            <li key={candidate.id}>
              <Button
                isDisabled={hasVoted || isYours}
                onPress={() => {
                  if (onVote(candidate.id)) {
                    setVotedForRoundId(round.id)
                  }
                }}
                variant='outlined'
              >
                <span className='title'>{candidate.text}</span>
                {isYours && (
                  <span className='subtitle'>
                    {translate('lefake.vote.yours')}
                  </span>
                )}
              </Button>
            </li>
          )
        })}
      </ul>
      <p className='status' role={isRefused ? 'alert' : 'status'}>
        {isRefused && error !== null
          ? translate(protocolErrorKey(error))
          : hasVoted
            ? translate('lefake.vote.done')
            : translate('lefake.vote.waiting', {
                count: content.votedPlayerIds.length
              })}
      </p>
    </section>
  )
}
