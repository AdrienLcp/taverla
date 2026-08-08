import { type FormEvent, useState } from 'react'
import { Form } from 'react-aria-components'
import { useNavigate } from 'react-router'

import { ROOM_CODE_LENGTH } from '@blindtest/protocol/identifiers'

import { normalizeRoomCode } from '@blindtest/core/room/room-code'

import { createRoom, roomExists } from '@/infrastructure/api/blindtest-api'
import { hostPathFor, playPathFor } from '@/infrastructure/router/navigation'
import { Button } from '@/presentation/components/button'
import { TextField } from '@/presentation/components/text-field'

import './join-page.sass'

export const JoinPage = () => {
  const navigate = useNavigate()
  const [code, setCode] = useState('')
  const [codeError, setCodeError] = useState<string | null>(null)
  const [isCreating, setIsCreating] = useState(false)
  const [isJoining, setIsJoining] = useState(false)

  const startHosting = async (): Promise<void> => {
    setIsCreating(true)
    setCodeError(null)

    const created = await createRoom()

    setIsCreating(false)

    if (created.status === 'failure') {
      setCodeError('Could not reach the server. Try again in a moment.')

      return
    }

    await navigate(hostPathFor(created.data.code))
  }

  const joinExisting = async (event: FormEvent): Promise<void> => {
    event.preventDefault()

    const normalized = normalizeRoomCode(code)

    if (normalized === null) {
      setCodeError(`A room code is ${ROOM_CODE_LENGTH} letters and digits.`)

      return
    }

    setIsJoining(true)
    setCodeError(null)

    const found = await roomExists(normalized)

    setIsJoining(false)

    if (found.status === 'failure') {
      setCodeError('Could not reach the server. Try again in a moment.')

      return
    }

    if (!found.data) {
      setCodeError('No game is running under that code.')

      return
    }

    await navigate(playPathFor(normalized))
  }

  return (
    <main className='join-page'>
      <header>
        <p className='eyebrow'>Blind test</p>
        <h1>Name the track before anyone else.</h1>
      </header>

      <section className='action'>
        <h2>Run the game</h2>
        <p>Opens the console with the QR code your friends scan.</p>
        <Button
          isPending={isCreating}
          onPress={() => {
            void startHosting()
          }}
          size='large'
        >
          Create a room
        </Button>
      </section>

      <div aria-hidden='true' className='divider'>
        <span>or</span>
      </div>

      <section className='action'>
        <h2>Join a game</h2>
        <Form
          onSubmit={(event) => {
            void joinExisting(event)
          }}
        >
          <TextField
            autoCapitalize='characters'
            autoComplete='off'
            description='Shown on the host screen.'
            errorMessage={codeError ?? undefined}
            isInvalid={codeError !== null}
            label='Room code'
            maxLength={ROOM_CODE_LENGTH + 2}
            name='roomCode'
            onChange={(next) => {
              setCode(next)
              setCodeError(null)
            }}
            value={code}
          />
          <Button
            isPending={isJoining}
            size='large'
            type='submit'
            variant='outlined'
          >
            Join
          </Button>
        </Form>
      </section>
    </main>
  )
}
