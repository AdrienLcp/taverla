import { type FormEvent, useState } from 'react'
import { Form } from 'react-aria-components'
import { useNavigate } from 'react-router'

import { ROOM_CODE_LENGTH } from '@taverla/protocol/identifiers'

import { parseRoomCodeInput } from '@taverla/core/room/room-code'

import { roomExists } from '@/infrastructure/api/taverla-api'
import { playPathFor } from '@/infrastructure/router/navigation'
import { Button } from '@/presentation/components/button'
import { TextField } from '@/presentation/components/text-field'
import { useTranslate } from '@/presentation/i18n/i18n-provider'
import {
  apiErrorKey,
  type PlainTranslationKey
} from '@/presentation/i18n/translation'

import './join-with-code.sass'

/** Held as a key rather than a rendered string, so it follows a locale switch. */
type FieldError =
  | { key: PlainTranslationKey }
  | {
      key: 'join.roomCode.unsupportedCharacters'
      values: { characters: string }
    }
  | { key: 'join.roomCode.wrongLength'; values: { length: number } }

/**
 * The half of joining that is not a QR code, and shell rather than blind test:
 * a code is a room, and the room knows which game it is running. Someone handed
 * four characters over the phone types them here whatever is being played.
 */
export const JoinWithCode = () => {
  const navigate = useNavigate()
  const translate = useTranslate()
  const [code, setCode] = useState('')
  const [codeError, setCodeError] = useState<FieldError | null>(null)
  const [isJoining, setIsJoining] = useState(false)

  const joinExisting = async (event: FormEvent): Promise<void> => {
    event.preventDefault()

    const parsed = parseRoomCodeInput(code)

    if (parsed.status === 'unsupported_characters') {
      setCodeError({
        key: 'join.roomCode.unsupportedCharacters',
        values: { characters: parsed.characters.join(', ') }
      })

      return
    }

    if (parsed.status === 'wrong_length') {
      setCodeError({
        key: 'join.roomCode.wrongLength',
        values: { length: ROOM_CODE_LENGTH }
      })

      return
    }

    setIsJoining(true)
    setCodeError(null)

    const found = await roomExists(parsed.code)

    setIsJoining(false)

    if (found.status === 'failure') {
      setCodeError({ key: apiErrorKey(found.error) })

      return
    }

    if (!found.data) {
      setCodeError({ key: 'join.roomCode.unknown' })

      return
    }

    await navigate(playPathFor(parsed.code))
  }

  return (
    <section className='join-with-code'>
      <h2>{translate('join.player.title')}</h2>
      <Form
        onSubmit={(event) => {
          void joinExisting(event)
        }}
      >
        <TextField
          autoCapitalize='characters'
          autoComplete='off'
          description={translate('join.roomCode.description')}
          errorMessage={
            codeError === null
              ? undefined
              : 'values' in codeError
                ? translate(codeError.key, codeError.values)
                : translate(codeError.key)
          }
          isInvalid={codeError !== null}
          label={translate('join.roomCode.label')}
          maxLength={ROOM_CODE_LENGTH + 2}
          name='roomCode'
          onChange={(next) => {
            setCode(next)
            setCodeError(null)
          }}
          // Derived rather than written, so it cannot drift from the length the
          // server actually generates. Dots carry no language.
          placeholder={'•'.repeat(ROOM_CODE_LENGTH)}
          value={code}
        />
        <Button
          isPending={isJoining}
          size='large'
          type='submit'
          variant='outlined'
        >
          {translate('join.player.action')}
        </Button>
      </Form>
    </section>
  )
}
