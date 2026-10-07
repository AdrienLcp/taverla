import { useScreenAwake } from '@adrienlcp/browser/react'
import type React from 'react'
import { type FormEvent, useCallback, useEffect, useState } from 'react'
import { Form } from 'react-aria-components'

import type { ProtocolErrorCode } from '@taverla/protocol/error-code'
import {
  NICKNAME_MAX_LENGTH,
  type RoomCode
} from '@taverla/protocol/identifiers'
import type { PlayerRoomView } from '@taverla/protocol/room'

import { NotFoundPage } from '@/features/not-found/not-found-page'
import { slateContent } from '@/helpers/round-content'
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
import { RoundChrome } from '@/presentation/components/round-chrome'
import { TextField } from '@/presentation/components/text-field'
import { useReportConnection } from '@/presentation/connection/connection-provider'
import { RoomDocumentTitle } from '@/presentation/head/room-document-title'
import { useTranslate } from '@/presentation/i18n/i18n-provider'
import { protocolErrorKey } from '@/presentation/i18n/translation'
import { useReportRoomActions } from '@/presentation/room-actions/room-actions-provider'
import { useMarkingField } from '@/presentation/theme/use-marking-field'
import { usePhaseField } from '@/presentation/theme/use-phase-field'

import { PlayerRound } from './player-round'
import { RoundClock } from './round-clock'

import './player-page.sass'
import { Main } from '@/presentation/components/main'

export const PlayerPage: React.FC = () => {
  const roomCode = useRoomCodeParam()

  return roomCode === null ? (
    <NotFoundPage />
  ) : (
    <PlayerScreen roomCode={roomCode} />
  )
}

const PlayerScreen: React.FC<{ roomCode: RoomCode }> = ({ roomCode }) => {
  // A device that has played before has already answered this, so it goes
  // straight to the table. The form is what remains for a screen with nothing
  // stored, and for the one case a stored name cannot settle: a refusal.
  const [nickname, setNickname] = useState<string | null>(() => {
    const stored = readStoredNickname()

    return stored.status === 'success' ? stored.data : null
  })
  const [requestedNickname, setRequestedNickname] = useState<string | null>(
    null
  )
  const connection = usePlayerConnection({ nickname, roomCode })
  const { clearError, send, view } = connection

  // Offered to the menu above, which owns the only way off this screen. The
  // frame goes first: navigating away closes the socket, and a seat given up
  // after that is a seat nobody was told about.
  const leave = useCallback(() => {
    send({ type: 'player.leave' })
    forgetSessionId({ role: 'player', roomCode })
  }, [roomCode, send])

  // Skipping the form means never seeing the name you arrived under, so the
  // menu is where it becomes visible and editable. A frame rather than a new
  // `hello`, which would drop the socket and the round with it.
  const rename = useCallback(
    (next: string) => {
      clearError()
      setRequestedNickname(next)
      send({ nickname: next, type: 'player.rename' })
    },
    [clearError, send]
  )

  const seatNickname =
    view?.players.find((player) => player.id === view.youId)?.nickname ?? null

  // The device remembers the name the room *accepted*, never the one that was
  // typed. Storing it on submit is what filled the next room's form in with a
  // name that had just been refused.
  useEffect(() => {
    if (seatNickname !== null) {
      writeStoredNickname(seatNickname)
    }
  }, [seatNickname])

  useReportRoomActions({
    closeRoom: null,
    endGame: null,
    leaveSeat: nickname === null ? null : leave,
    playsSound: false,
    refusedNickname:
      requestedNickname !== null && connection.error?.code === 'nickname_taken'
        ? requestedNickname
        : null,
    rename: seatNickname === null ? null : rename,
    revealRound: null,
    seatNickname
  })

  // A refused join is non-fatal, so the socket stays open and the form comes
  // back with the reason rather than stranding the player on a dead screen.
  // Once a seat is held the same code answers a rename instead, and the menu is
  // where it belongs — a player bounced back to the join form mid-round would
  // have lost the game to a name clash.
  const rejection =
    seatNickname === null &&
    (connection.error?.code === 'nickname_taken' ||
      connection.error?.code === 'room_full')
      ? connection.error.code
      : null

  return (
    <>
      <RoomDocumentTitle game={view?.settings.game?.kind ?? null} />
      {nickname === null || rejection !== null ? (
        <NicknameForm
          onSubmit={setNickname}
          refusedNickname={nickname}
          rejection={rejection}
          roomCode={roomCode}
        />
      ) : (
        <Lobby connection={connection} roomCode={roomCode} />
      )}
    </>
  )
}

const NicknameForm: React.FC<{
  onSubmit: (nickname: string) => void
  /** The name the refusal was given for, or `null` where none was tried yet. */
  refusedNickname: string | null
  rejection: ProtocolErrorCode | null
  roomCode: RoomCode
}> = ({ onSubmit, refusedNickname, rejection, roomCode }) => {
  const translate = useTranslate()
  const [draft, setDraft] = useState(() => {
    const stored = readStoredNickname()

    return stored.status === 'success' ? (stored.data ?? '') : ''
  })
  // The refusal belongs to the name it was given for, and holding `isInvalid`
  // past that is not a cosmetic slip: the field's native validity stays false,
  // so the form refuses to submit, the button looks alive and nothing is
  // logged. A stored name refused on arrival made that the first thing a
  // returning screen met.
  const isRefused = rejection !== null && draft.trim() === refusedNickname

  const submit = (event: FormEvent): void => {
    event.preventDefault()

    const trimmed = draft.trim()

    if (trimmed.length === 0) {
      return
    }

    onSubmit(trimmed)
  }

  return (
    <Main className='player-page nickname-form'>
      <div className='lid'>
        <header>
          <h1>{translate('player.nickname.title')}</h1>
          <p className='room'>{translate('player.room', { code: roomCode })}</p>
        </header>
        <Form onSubmit={submit}>
          <TextField
            autoComplete='nickname'
            errorMessage={
              isRefused && rejection !== null
                ? translate(protocolErrorKey(rejection))
                : undefined
            }
            isInvalid={isRefused}
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
      </div>
    </Main>
  )
}

const Lobby: React.FC<{
  connection: PlayerConnection
  roomCode: RoomCode
}> = ({ connection, roomCode }) => {
  const translate = useTranslate()
  const { clock, error, send, status, view } = connection

  useReportConnection({ clock, status })
  usePhaseField(view?.phase ?? null)
  const slate = slateContent(view?.round)
  useMarkingField(
    view?.phase === 'playing' &&
      slate?.currentItemIndex != null &&
      !slate.itemStates.includes('open')
  )
  useScreenAwake(status !== 'refused' && view?.phase !== 'finished')

  if (status === 'refused') {
    return (
      <Main className='player-page'>
        <ConnectionRefused error={error} />
      </Main>
    )
  }

  if (view !== null && isFramed(view)) {
    return (
      <Main className='player-page playing framed'>
        <RoundChrome
          players={view.players}
          roundCount={view.settings.roundCount}
          roundIndex={view.round?.index ?? 0}
          youId={view.youId}
        />
        <div className='card-clock'>
          <RoundClock clock={clock} view={view} />
        </div>
        <PlayerRound
          clock={clock}
          onAnswer={(answer, roundId) =>
            send({ answer, roundId, type: 'player.answer' })
          }
          onBuzz={(roundId) => send({ roundId, type: 'player.buzz' })}
          onWriteLine={(itemIndex, answer, roundId) =>
            send({ answer, itemIndex, roundId, type: 'slate.write' })
          }
          view={view}
        />
      </Main>
    )
  }

  return (
    <Main className='player-page playing'>
      {view === null ? (
        <p className='waiting'>{translate('player.seating')}</p>
      ) : (
        <>
          <RoundChrome
            players={view.players}
            roomCode={roomCode}
            roundCount={view.settings.roundCount}
            roundIndex={
              view.round === null ||
              view.phase === 'lobby' ||
              view.phase === 'finished'
                ? null
                : view.round.index
            }
            youId={view.youId}
          />
          <PlayerRound
            clock={clock}
            onAnswer={(answer, roundId) =>
              send({ answer, roundId, type: 'player.answer' })
            }
            onBuzz={(roundId) => send({ roundId, type: 'player.buzz' })}
            onWriteLine={(itemIndex, answer, roundId) =>
              send({ answer, itemIndex, roundId, type: 'slate.write' })
            }
            view={view}
          />
        </>
      )}
    </Main>
  )
}

/**
 * The screens held to the viewport: four tiles, or the buzzer and the floor it
 * hands over, visible at once on any screen at any ratio. Everything else on a
 * player's screen may scroll; these may not, because the tile or the buzzer
 * that scrolled away is the round.
 */
const isFramed = (view: PlayerRoomView): boolean =>
  view.isHostConnected &&
  view.round !== null &&
  !view.round.joinedAfterStart &&
  ((view.phase === 'playing' && view.settings.mode.kind === 'choice') ||
    ((view.phase === 'playing' || view.phase === 'buzzed') &&
      view.settings.mode.kind === 'buzzer'))
