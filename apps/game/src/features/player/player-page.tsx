import { type FormEvent, useCallback, useState } from 'react'
import { Form } from 'react-aria-components'

import type { ProtocolErrorCode } from '@taverla/protocol/error-code'
import { roundDurationMsOf } from '@taverla/protocol/game'
import {
  NICKNAME_MAX_LENGTH,
  type RoomCode
} from '@taverla/protocol/identifiers'
import type { PlayerRoomView } from '@taverla/protocol/room'

import { standingOf } from '@taverla/core/scoring/scoreboard'

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
import { forgetSessionId } from '@/infrastructure/storage/session-storage'
import { Button } from '@/presentation/components/button'
import { ConnectionRefused } from '@/presentation/components/connection-refused'
import { RoundProgress } from '@/presentation/components/round-progress'
import { TextField } from '@/presentation/components/text-field'
import { useReportConnection } from '@/presentation/connection/connection-provider'
import { useReportRoomExits } from '@/presentation/exits/room-exits-provider'
import { useTranslate } from '@/presentation/i18n/i18n-provider'
import { protocolErrorKey } from '@/presentation/i18n/translation'
import { usePhaseField } from '@/presentation/theme/use-phase-field'

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
  const { send } = connection

  // Offered to the menu above, which owns the only way off this screen. The
  // frame goes first: navigating away closes the socket, and a seat given up
  // after that is a seat nobody was told about.
  const leave = useCallback(() => {
    send({ type: 'player.leave' })
    forgetSessionId({ role: 'player', roomCode })
  }, [roomCode, send])

  useReportRoomExits({
    closeRoom: null,
    endGame: null,
    leaveSeat: nickname === null ? null : leave
  })

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
        <h1>{translate('player.nickname.title')}</h1>
        <p className='room'>{translate('player.room', { code: roomCode })}</p>
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
          maxLength={NICKNAME_MAX_LENGTH}
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
  const { clock, error, send, status, view } = connection

  useReportConnection({ clock, status })
  usePhaseField(view?.phase ?? null)

  if (status === 'refused') {
    return (
      <main className='player-page'>
        <ConnectionRefused error={error} />
      </main>
    )
  }

  return (
    <main className='player-page playing'>
      <header>
        <p className='room'>{translate('player.room', { code: roomCode })}</p>
      </header>

      {view === null ? (
        <p className='waiting'>{translate('player.seating')}</p>
      ) : (
        <>
          <Scoreline view={view} />
          <RoundClock view={view} />
          <PlayerRound
            clock={clock}
            error={error?.code ?? null}
            onAnswer={(answer, roundId) =>
              send({ answer, roundId, type: 'player.answer' })
            }
            onBuzz={(roundId) => send({ roundId, type: 'player.buzz' })}
            onSubmitLie={(lie, roundId) =>
              send({ lie, roundId, type: 'lefake.submit' })
            }
            onVote={(candidateId, roundId) =>
              send({ candidateId, roundId, type: 'lefake.vote' })
            }
            view={view}
          />
        </>
      )}
    </main>
  )
}

/**
 * The clock the big screen is showing, on the phone that is answering against
 * it. Absent while the host is away: the server has the round frozen then, and
 * a bar that kept draining would be timing nobody.
 */
const RoundClock = ({ view }: { view: PlayerRoomView }) => {
  const durationMs = roundDurationMsOf(view.settings.game)

  if (
    durationMs === null ||
    view.phase !== 'playing' ||
    !view.isHostConnected
  ) {
    return null
  }

  return (
    <RoundProgress durationMs={durationMs} elapsedMs={view.roundElapsedMs} />
  )
}

/**
 * The one thing this screen carries between rounds, and the reason the reveal
 * does not have to: a place among the room costs the same line the room's size
 * was already spending, and says the thing that line never did. Before the
 * first point there is nothing to place, so it falls back to the count — every
 * ranked surface in the product goes quiet at the same threshold.
 */
const Scoreline = ({ view }: { view: PlayerRoomView }) => {
  const translate = useTranslate()
  const you = view.players.find((player) => player.id === view.youId)
  const score = you?.score ?? 0
  const standing = standingOf({ players: view.players, youId: view.youId })

  return (
    <section className='scoreline'>
      <p className='you'>{you?.nickname ?? translate('player.you')}</p>
      <p className='score'>
        <span className='value'>{score}</span>
        <span className='unit'>
          {translate('player.points', { points: score })}
        </span>
      </p>
      <p className='others'>
        {standing === null
          ? translate('player.roomSize', { count: view.players.length })
          : translate('player.standing.ofRoom', {
              count: standing.roomSize,
              rank: standing.rank
            })}
      </p>
    </section>
  )
}
