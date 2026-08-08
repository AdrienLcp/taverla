import { type FormEvent, useState } from 'react'
import { Form, Button as ReactAriaButton } from 'react-aria-components'

import type { RoomCode } from '@blindtest/protocol/identifiers'
import type { PlayerRoomView } from '@blindtest/protocol/room'

import {
  type BuzzBlocker,
  findBuzzBlocker
} from '@blindtest/core/round/buzz-eligibility'

import { NotFoundPage } from '@/features/not-found/not-found-page'
import {
  type PlayerConnection,
  usePlayerConnection
} from '@/infrastructure/messaging/use-player-connection'
import { useRoomCodeParam } from '@/infrastructure/router/navigation'
import { Button } from '@/presentation/components/button'
import { ConnectionStatus } from '@/presentation/components/connection-status'
import { TextField } from '@/presentation/components/text-field'

import './player-page.sass'

/** A dead button with no explanation is the worst thing a party game can show. */
const BLOCKER_LABELS: Record<BuzzBlocker, string> = {
  round_not_running: 'Waiting for the host',
  someone_else_buzzed: 'Someone got there first',
  you_already_missed: 'You are out for this round',
  your_answer_is_pending: 'Say your answer out loud'
}

export const PlayerPage = () => {
  const roomCode = useRoomCodeParam()

  return roomCode === null ? (
    <NotFoundPage />
  ) : (
    <PlayerScreen roomCode={roomCode} />
  )
}

const PlayerScreen = ({ roomCode }: { roomCode: RoomCode }) => {
  const [nickname, setNickname] = useState<string | null>(null)
  const connection = usePlayerConnection({ nickname, roomCode })

  // A refused join is non-fatal, so the socket stays open and the form comes
  // back with the reason rather than stranding the player on a dead screen.
  const isRejected =
    connection.error?.code === 'nickname_taken' ||
    connection.error?.code === 'room_full'

  return nickname === null || isRejected ? (
    <NicknameForm
      error={isRejected ? (connection.error?.message ?? null) : null}
      onSubmit={setNickname}
      roomCode={roomCode}
    />
  ) : (
    <Lobby connection={connection} roomCode={roomCode} />
  )
}

const NicknameForm = ({
  error,
  onSubmit,
  roomCode
}: {
  error: string | null
  onSubmit: (nickname: string) => void
  roomCode: RoomCode
}) => {
  const [draft, setDraft] = useState('')

  const submit = (event: FormEvent): void => {
    event.preventDefault()

    const trimmed = draft.trim()

    if (trimmed.length > 0) {
      onSubmit(trimmed)
    }
  }

  return (
    <main className='player-page'>
      <header>
        <p className='eyebrow'>Room {roomCode}</p>
        <h1>What should we call you?</h1>
      </header>
      <Form onSubmit={submit}>
        <TextField
          autoComplete='nickname'
          errorMessage={error ?? undefined}
          isInvalid={error !== null}
          label='Nickname'
          maxLength={20}
          name='nickname'
          onChange={setDraft}
          value={draft}
        />
        <Button
          isDisabled={draft.trim().length === 0}
          size='large'
          type='submit'
        >
          Join the game
        </Button>
      </Form>
    </main>
  )
}

const Lobby = ({
  connection,
  roomCode
}: {
  connection: PlayerConnection
  roomCode: RoomCode
}) => {
  const { clock, send, status, view } = connection

  return (
    <main className='player-page playing'>
      <header>
        <p className='eyebrow'>Room {roomCode}</p>
        <ConnectionStatus clock={clock} status={status} />
      </header>

      {view === null ? (
        <p className='waiting'>Taking your seat…</p>
      ) : (
        <>
          <Scoreline view={view} />
          <Buzzer
            onBuzz={(roundId) => {
              send({ roundId, type: 'player.buzz' })
            }}
            view={view}
          />
        </>
      )}
    </main>
  )
}

const Scoreline = ({ view }: { view: PlayerRoomView }) => {
  const you = view.players.find((player) => player.id === view.youId)

  return (
    <section className='scoreline'>
      <p className='you'>{you?.nickname ?? 'You'}</p>
      <p className='score'>
        <span className='value'>{you?.score ?? 0}</span>
        <span className='unit'>points</span>
      </p>
      <p className='others'>{view.players.length} in the room</p>
    </section>
  )
}

const Buzzer = ({
  onBuzz,
  view
}: {
  onBuzz: (roundId: string) => void
  view: PlayerRoomView
}) => {
  const blocker = findBuzzBlocker(view)
  const roundId = view.round?.id ?? null

  return (
    <section className='buzzer-area'>
      {/*
        `onPressStart`, not `onPress`: a buzzer has to fire the instant the
        thumb lands, and waiting for the release costs tens of milliseconds in a
        race that is decided by exactly that. react-aria normalises it across
        touch, mouse and keyboard, so the keyboard player is not penalised.
      */}
      <ReactAriaButton
        className='buzzer'
        isDisabled={blocker !== null || roundId === null}
        onPressStart={() => {
          if (roundId !== null) {
            onBuzz(roundId)
          }
        }}
      >
        Buzz
      </ReactAriaButton>
      <p className='blocker' role='status'>
        {blocker === null
          ? 'Hit it the moment you know'
          : BLOCKER_LABELS[blocker]}
      </p>
    </section>
  )
}
