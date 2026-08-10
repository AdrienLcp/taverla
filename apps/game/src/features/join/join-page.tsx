import { type FormEvent, useState } from 'react'
import { Form } from 'react-aria-components'
import { useNavigate } from 'react-router'

import { ROOM_CODE_LENGTH } from '@taverla/protocol/identifiers'

import { parseRoomCodeInput } from '@taverla/core/room/room-code'

import { createRoom, roomExists } from '@/infrastructure/api/taverla-api'
import { hostPathFor, playPathFor } from '@/infrastructure/router/navigation'
import { Button } from '@/presentation/components/button'
import { Separator } from '@/presentation/components/separator'
import { TextField } from '@/presentation/components/text-field'
import { useTranslate } from '@/presentation/i18n/i18n-provider'
import {
  apiErrorKey,
  type TranslationKey,
  type TranslationValues
} from '@/presentation/i18n/translation'

import './join-page.sass'

/** Held as a key rather than a rendered string, so it follows a locale switch. */
type FieldError = {
  key: TranslationKey
  values?: TranslationValues
}

export const JoinPage = () => {
  const navigate = useNavigate()
  const translate = useTranslate()
  const [code, setCode] = useState('')
  const [codeError, setCodeError] = useState<FieldError | null>(null)
  const [isCreating, setIsCreating] = useState(false)
  const [isJoining, setIsJoining] = useState(false)

  const startHosting = async (): Promise<void> => {
    setIsCreating(true)
    setCodeError(null)

    const created = await createRoom()

    setIsCreating(false)

    if (created.status === 'failure') {
      setCodeError({ key: apiErrorKey(created.error) })

      return
    }

    await navigate(hostPathFor(created.data.code))
  }

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
    <main className='join-page'>
      <header>
        <h1>{translate('blindtest.tagline')}</h1>
      </header>

      <section className='action'>
        <h2>{translate('join.host.title')}</h2>
        <p>{translate('join.host.description')}</p>
        <Button
          isPending={isCreating}
          onPress={() => {
            void startHosting()
          }}
          size='large'
        >
          {translate('join.host.action')}
        </Button>
      </section>

      <Separator label={translate('join.divider')} />

      <section className='action'>
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
                : translate(codeError.key, codeError.values)
            }
            isInvalid={codeError !== null}
            label={translate('join.roomCode.label')}
            maxLength={ROOM_CODE_LENGTH + 2}
            name='roomCode'
            onChange={(next) => {
              setCode(next)
              setCodeError(null)
            }}
            // Derived rather than written, so it cannot drift from the length
            // the server actually generates. Dots carry no language.
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
    </main>
  )
}
