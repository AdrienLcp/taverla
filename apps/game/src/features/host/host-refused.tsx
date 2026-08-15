import { type FormEvent, useState } from 'react'
import { Form } from 'react-aria-components'

import {
  HOST_TOKEN_LENGTH,
  type HostToken
} from '@taverla/protocol/identifiers'
import type { ProtocolErrorMessage } from '@taverla/protocol/server-message'

import { normalizeHostToken } from '@taverla/core/room/host-token'

import { Button } from '@/presentation/components/button'
import { ConnectionRefused } from '@/presentation/components/connection-refused'
import { TextField } from '@/presentation/components/text-field'
import { useTranslate } from '@/presentation/i18n/i18n-provider'

import './host-refused.sass'

type HostRefusedProps = {
  /** `null` when the socket died without the server naming a reason. */
  error: ProtocolErrorMessage | null
  /**
   * Whether a token has already been offered from this screen, so a second
   * refusal reads as an answer to it rather than as the same wall twice.
   */
  hasOfferedToken: boolean
  /** Keeps the token for this room, and opens a fresh socket carrying it. */
  onOfferToken: (hostToken: HostToken) => void
  /** Opens a fresh socket on what this screen already holds. */
  onRetry: () => void
}

/**
 * The console's own end of the line, and the only refusal in the product with a
 * way through it: the room is somebody else's until this screen proves it holds
 * the token, which is what keeps a takeover from being final.
 */
export const HostRefused = ({
  error,
  hasOfferedToken,
  onOfferToken,
  onRetry
}: HostRefusedProps) => {
  const translate = useTranslate()
  const [token, setToken] = useState('')
  const [isTokenInvalid, setIsTokenInvalid] = useState(false)

  // A room holding itself for a console that may still come back has refused
  // everyone, not this code — so the code is not what the screen corrects.
  const wasTokenRefused =
    hasOfferedToken && error?.code === 'host_already_connected'

  const offer = (event: FormEvent): void => {
    event.preventDefault()

    const parsed = normalizeHostToken(token)

    if (parsed === null) {
      setIsTokenInvalid(true)

      return
    }

    onOfferToken(parsed)
  }

  return (
    <ConnectionRefused error={error}>
      <div className='host-refused'>
        {wasTokenRefused && (
          <p className='rejected'>{translate('host.recovery.refused')}</p>
        )}

        <Form onSubmit={offer}>
          <TextField
            autoCapitalize='characters'
            autoComplete='off'
            description={translate('host.recovery.description')}
            errorMessage={translate('host.recovery.invalid')}
            isInvalid={isTokenInvalid}
            label={translate('host.recovery.field')}
            maxLength={HOST_TOKEN_LENGTH + 2}
            name='hostToken'
            onChange={(next) => {
              setToken(next)
              setIsTokenInvalid(false)
            }}
            // Derived rather than written, so it cannot drift from the length
            // the server actually mints. Dots carry no language.
            placeholder={'•'.repeat(HOST_TOKEN_LENGTH)}
            value={token}
          />
          <Button size='large' type='submit' variant='filled'>
            {translate('host.recovery.action')}
          </Button>
        </Form>

        <Button onPress={onRetry} size='small' variant='underlined'>
          {translate('host.recovery.retry')}
        </Button>
      </div>
    </ConnectionRefused>
  )
}
