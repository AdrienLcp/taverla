import { type FormEvent, useState } from 'react'
import { Form } from 'react-aria-components'

import type { ProtocolErrorCode } from '@blindtest/protocol/error-code'
import type { RoomCode } from '@blindtest/protocol/identifiers'
import type { PlayerRoomView } from '@blindtest/protocol/room'

import { NotFoundPage } from '@/features/not-found/not-found-page'
import {
  type PlayerConnection,
  usePlayerConnection
} from '@/infrastructure/messaging/use-player-connection'
import { useRoomCodeParam } from '@/infrastructure/router/navigation'
import {
  readStoredNickname,
  writeStoredNickname
} from '@/infrastructure/storage/preferences-storage'
import { Button } from '@/presentation/components/button'
import { ConnectionStatus } from '@/presentation/components/connection-status'
import { TextField } from '@/presentation/components/text-field'
import { useTranslate } from '@/presentation/i18n/i18n-provider'
import { protocolErrorKey } from '@/presentation/i18n/translation'

import { PlayerRound } from './player-round'

import './player-page.sass'

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
  const rejection =
    connection.error?.code === 'nickname_taken' ||
    connection.error?.code === 'room_full'
      ? connection.error.code
      : null

  return nickname === null || rejection !== null ? (
    <NicknameForm
      onSubmit={setNickname}
      rejection={rejection}
      roomCode={roomCode}
    />
  ) : (
    <Lobby connection={connection} roomCode={roomCode} />
  )
}

const NicknameForm = ({
  onSubmit,
  rejection,
  roomCode
}: {
  onSubmit: (nickname: string) => void
  rejection: ProtocolErrorCode | null
  roomCode: RoomCode
}) => {
  const translate = useTranslate()
  const [draft, setDraft] = useState(() => readStoredNickname() ?? '')

  const submit = (event: FormEvent): void => {
    event.preventDefault()

    const trimmed = draft.trim()

    if (trimmed.length === 0) {
      return
    }

    writeStoredNickname(trimmed)
    onSubmit(trimmed)
  }

  return (
    <main className='player-page'>
      <header>
        <p className='eyebrow'>
          {translate('player.room', { code: roomCode })}
        </p>
        <h1>{translate('player.nickname.title')}</h1>
      </header>
      <Form onSubmit={submit}>
        <TextField
          autoComplete='nickname'
          errorMessage={
            rejection === null
              ? undefined
              : translate(protocolErrorKey(rejection))
          }
          isInvalid={rejection !== null}
          label={translate('player.nickname.label')}
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
          {translate('player.nickname.action')}
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
  const translate = useTranslate()
  const { clock, send, status, view } = connection

  return (
    <main className='player-page playing'>
      <header>
        <p className='eyebrow'>
          {translate('player.room', { code: roomCode })}
        </p>
        <ConnectionStatus clock={clock} status={status} />
      </header>

      {view === null ? (
        <p className='waiting'>{translate('player.seating')}</p>
      ) : (
        <>
          <Scoreline view={view} />
          <PlayerRound
            clock={clock}
            onBuzz={(roundId) => send({ roundId, type: 'player.buzz' })}
            view={view}
          />
        </>
      )}
    </main>
  )
}

const Scoreline = ({ view }: { view: PlayerRoomView }) => {
  const translate = useTranslate()
  const you = view.players.find((player) => player.id === view.youId)

  return (
    <section className='scoreline'>
      <p className='you'>{you?.nickname ?? translate('player.you')}</p>
      <p className='score'>
        <span className='value'>{you?.score ?? 0}</span>
        <span className='unit'>{translate('player.points')}</span>
      </p>
      <p className='others'>
        {translate('player.roomSize', { count: view.players.length })}
      </p>
    </section>
  )
}
