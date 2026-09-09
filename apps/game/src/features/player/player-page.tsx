import type React from 'react'
import { type FormEvent, useCallback, useEffect, useState } from 'react'
import { Form } from 'react-aria-components'

import type { ProtocolErrorCode } from '@taverla/protocol/error-code'
import { roundDurationMsOf } from '@taverla/protocol/game'
import {
  NICKNAME_MAX_LENGTH,
  type RoomCode
} from '@taverla/protocol/identifiers'
import type { PlayerRoomView } from '@taverla/protocol/room'

import { standingOf } from '@taverla/core/scoring/scoreboard'
import type { ClockEstimate } from '@taverla/core/time/clock-sync'

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
import {
  RevealHold,
  RoundProgress
} from '@/presentation/components/round-progress'
import { TextField } from '@/presentation/components/text-field'
import { useReportConnection } from '@/presentation/connection/connection-provider'
import { useRoomDocumentTitle } from '@/presentation/head/use-room-document-title'
import { useTranslate } from '@/presentation/i18n/i18n-provider'
import { protocolErrorKey } from '@/presentation/i18n/translation'
import { useReportRoomActions } from '@/presentation/room-actions/room-actions-provider'
import { usePhaseField } from '@/presentation/theme/use-phase-field'
import { useScreenAwake } from '@/presentation/use-screen-awake'

import { PlayerRound } from './player-round'

import './player-page.sass'

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
  const [nickname, setNickname] = useState<string | null>(readStoredNickname)
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

  useRoomDocumentTitle(view?.settings.game?.kind ?? null)

  useReportRoomActions({
    closeRoom: null,
    endGame: null,
    leaveSeat: nickname === null ? null : leave,
    refusedNickname:
      requestedNickname !== null && connection.error?.code === 'nickname_taken'
        ? requestedNickname
        : null,
    rename: seatNickname === null ? null : rename,
    seatNickname
  })

  // A refused join is non-fatal, so the socket stays open and the form comes
  // back with the reason rather than stranding the player on a dead screen.
  // Once a seat is held the same code answers a rename instead, and the menu is
  // where it belongs — a phone bounced back to the join form mid-round would
  // have lost the game to a name clash.
  const rejection =
    seatNickname === null &&
    (connection.error?.code === 'nickname_taken' ||
      connection.error?.code === 'room_full')
      ? connection.error.code
      : null

  return nickname === null || rejection !== null ? (
    <NicknameForm
      onSubmit={setNickname}
      refusedNickname={nickname}
      rejection={rejection}
      roomCode={roomCode}
    />
  ) : (
    <Lobby connection={connection} roomCode={roomCode} />
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
  const [draft, setDraft] = useState(() => readStoredNickname() ?? '')
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
    <main className='player-page'>
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
    </main>
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
  useScreenAwake(status !== 'refused' && view?.phase !== 'finished')

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

        {/* In the chrome rather than inside the round, because it is true at
            every phase — and the phone that needs it is the one whose owner
            cannot see the screen that has been carrying it all evening. */}
        {view?.round != null && view.phase !== 'finished' && (
          <p className='round-index'>
            {view.settings.roundCount === null
              ? translate('round.indexOpen', { index: view.round.index })
              : translate('round.index', {
                  index: view.round.index,
                  total: view.settings.roundCount
                })}
          </p>
        )}
      </header>

      {view === null ? (
        <p className='waiting'>{translate('player.seating')}</p>
      ) : (
        <>
          <Scoreline view={view} />
          <RoundClock clock={clock} view={view} />
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
 * it — and then the wait until the next round, which is the same question one
 * phase later. One bar in one place rather than two: a measure that moved when
 * the phase turned would read as a second object arriving.
 *
 * Absent whenever nothing is counting. For the round that is the host being
 * away, because the server has it frozen and a bar still draining would be
 * timing nobody; for the hold `advancesAt` says the same thing on its own,
 * covering a host who advances by hand and a host who has gone at once.
 */
const RoundClock: React.FC<{
  clock: ClockEstimate | null
  view: PlayerRoomView
}> = ({ clock, view }) => {
  const holdMs = view.settings.autoAdvanceMs
  const advancesAt = view.round?.advancesAt ?? null

  if (view.phase === 'revealed' && advancesAt !== null && holdMs !== null) {
    return <RevealHold advancesAt={advancesAt} clock={clock} holdMs={holdMs} />
  }

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
const Scoreline: React.FC<{ view: PlayerRoomView }> = ({ view }) => {
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
