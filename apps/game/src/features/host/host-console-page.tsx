import { QRCodeSVG } from 'qrcode.react'
import { useState } from 'react'

import type { ClientMessage } from '@taverla/protocol/client-message'
import type { RoomCode } from '@taverla/protocol/identifiers'
import type { HostRoomView } from '@taverla/protocol/room'
import type { TrackSource } from '@taverla/protocol/track'

import type { ClockEstimate } from '@taverla/core/time/clock-sync'

import { NotFoundPage } from '@/features/not-found/not-found-page'
import {
  ChoiceAnswer,
  type PlayerAnswer,
  TypedAnswer
} from '@/features/player/answer-forms'
import { blindtestHostContent } from '@/helpers/blindtest-round'
import { useHostConnection } from '@/infrastructure/messaging/use-host-connection'
import {
  playUrlFor,
  useRoomCodeParam
} from '@/infrastructure/router/navigation'
import {
  readStoredVolume,
  writeStoredVolume
} from '@/infrastructure/storage/preferences-storage'
import { Button } from '@/presentation/components/button'
import { ConnectionRefused } from '@/presentation/components/connection-refused'
import { Countdown } from '@/presentation/components/countdown'
import { Disclosure } from '@/presentation/components/disclosure'
import { Link } from '@/presentation/components/link'
import { Scoreboard } from '@/presentation/components/scoreboard'
import { useReportConnection } from '@/presentation/connection/connection-provider'
import { useTranslate } from '@/presentation/i18n/i18n-provider'
import { protocolErrorKey } from '@/presentation/i18n/translation'
import { usePhaseField } from '@/presentation/theme/use-phase-field'

import { CopyButton } from './copy-button'
import { FinalBoard } from './final-board'
import { HostControls } from './host-controls'
import { HostSeat } from './host-seat'
import { JoinReminder } from './join-reminder'
import { PlaylistPicker, sourceKindKey } from './playlist-picker'
import { RevealPanel } from './reveal-panel'
import { useRoundAudio } from './round-audio'
import { answerModeLabelKey, SettingsPanel } from './settings-panel'
import { VerdictPanel } from './verdict-panel'

import './host-console-page.sass'

export const HostConsolePage = () => {
  const roomCode = useRoomCodeParam()

  // The socket hook must not be called with a code the server would refuse, and
  // hooks cannot be conditional — so the guard lives above the component that
  // owns them.
  return roomCode === null ? (
    <NotFoundPage />
  ) : (
    <HostConsole roomCode={roomCode} />
  )
}

const HostConsole = ({ roomCode }: { roomCode: RoomCode }) => {
  const translate = useTranslate()
  // Read once and kept for the life of the console: the socket reopens on a
  // change of nickname, and re-seating mid-round would drop the answer.
  const [seatNickname, setSeatNickname] = useState<string | null>(null)
  const { clock, error, send, status, view } = useHostConnection(
    roomCode,
    seatNickname
  )
  const [volume, setVolume] = useState(readStoredVolume)
  const [draftSource, setDraftSource] = useState<TrackSource | null>(null)

  useReportConnection({ clock, status })
  usePhaseField(view?.phase ?? null)
  const { unlock } = useRoundAudio({ clock, view, volume })
  const isLive = status === 'open'

  if (status === 'refused') {
    return (
      <main className='host-console-page'>
        <div className='stage solo'>
          <ConnectionRefused error={error} />
        </div>
      </main>
    )
  }

  return (
    <main className='host-console-page'>
      <header>
        {view?.round != null && view.phase !== 'finished' && (
          <p className='round-index'>
            {translate('blindtest.round', {
              index: view.round.index,
              total: view.settings.roundCount
            })}
          </p>
        )}
        {view !== null &&
          view.phase !== 'lobby' &&
          view.phase !== 'finished' && <JoinReminder roomCode={roomCode} />}
      </header>

      <Stage
        clock={clock}
        draftSource={draftSource}
        isLive={isLive}
        isSeated={seatNickname !== null}
        onDraftSource={setDraftSource}
        onTakeSeat={setSeatNickname}
        roomCode={roomCode}
        seatNickname={seatNickname}
        send={send}
        view={view}
      />

      <footer>
        {error !== null && (
          <p className='error' role='alert'>
            {translate(protocolErrorKey(error.code))}
          </p>
        )}
        {view !== null && (
          <>
            <Actions
              isLive={isLive}
              onStart={() => {
                // Inside the press, never in an effect: the autoplay policy
                // grants permission to the element only from a real gesture,
                // and it cannot be asked for later when the track arrives.
                unlock()

                // What the picker is showing is what the host chose, so the
                // launch commits it. Re-sending an unchanged source is free:
                // the server drops the pool only when it actually differs.
                const game = view.settings.game

                if (draftSource !== null && game.kind === 'blindtest') {
                  send({
                    settings: {
                      ...view.settings,
                      game: { ...game, source: draftSource }
                    },
                    type: 'host.updateSettings'
                  })
                }

                send({ type: 'host.startRound' })
              }}
              send={send}
              view={view}
            />
            <HostControls
              isLive={isLive}
              onSettingsChange={(settings) => {
                send({ settings, type: 'host.updateSettings' })
              }}
              onVolumeChange={(next) => {
                setVolume(next)
                writeStoredVolume(next)
              }}
              settings={view.settings}
              volume={volume}
            />
          </>
        )}
      </footer>
    </main>
  )
}

type StageProps = {
  clock: ClockEstimate | null
  draftSource: TrackSource | null
  isLive: boolean
  isSeated: boolean
  onDraftSource: (source: TrackSource | null) => void
  onTakeSeat: (nickname: string) => void
  roomCode: RoomCode
  seatNickname: string | null
  send: (message: ClientMessage) => boolean
  view: HostRoomView | null
}

const Stage = ({
  clock,
  draftSource,
  isLive,
  isSeated,
  onDraftSource,
  onTakeSeat,
  roomCode,
  seatNickname,
  send,
  view
}: StageProps) => {
  const translate = useTranslate()

  if (view === null) {
    return <div className='stage' />
  }

  const round = view.round

  if (view.phase === 'countdown' && round?.startsAt != null) {
    return (
      <div className='stage solo'>
        <Countdown clock={clock} target={round.startsAt} />
      </div>
    )
  }

  if (view.phase === 'playing' && round != null) {
    const answerWithRound = (answer: PlayerAnswer): boolean =>
      send({ answer, roundId: round.id, type: 'player.answer' })

    const game = view.settings.game

    return (
      <div className='stage listening'>
        <p className='now'>{translate('blindtest.listening')}</p>
        {game.kind === 'blindtest' && (
          <div
            className='clip-progress'
            key={`${round.id}-${round.awards.length}`}
            style={{
              '--clip-remaining': `${Math.max(
                0,
                game.clipDurationMs - view.roundElapsedMs
              )}ms`
            }}
          />
        )}
        {isSeated && view.settings.answerMode === 'choice' && (
          <ChoiceAnswer onAnswer={answerWithRound} round={round} />
        )}
        {isSeated && view.settings.answerMode === 'typed' && (
          <TypedAnswer onAnswer={answerWithRound} round={round} />
        )}
        <Scoreboard players={view.players} />
      </div>
    )
  }

  if (view.phase === 'buzzed' && round?.activeBuzz != null) {
    const buzzerId = round.activeBuzz.playerId
    const buzzer = view.players.find((player) => player.id === buzzerId)
    const track = blindtestHostContent(view)?.track ?? null

    return (
      <div className='stage solo'>
        {track !== null && (
          <VerdictPanel
            nickname={buzzer?.nickname ?? '—'}
            onJudge={(verdict) => {
              send({
                playerId: buzzerId,
                roundId: round.id,
                type: 'host.judge',
                verdict
              })
            }}
            track={track}
          />
        )}
      </div>
    )
  }

  if (view.phase === 'revealed' && round != null) {
    return (
      <div className='stage'>
        <RevealPanel players={view.players} round={round} />
      </div>
    )
  }

  if (view.phase === 'finished') {
    return (
      <div className='stage'>
        <FinalBoard players={view.players} />
      </div>
    )
  }

  return (
    <Lobby
      draftSource={draftSource}
      isLive={isLive}
      onDraftSource={onDraftSource}
      onTakeSeat={onTakeSeat}
      roomCode={roomCode}
      seatNickname={seatNickname}
      send={send}
      view={view}
    />
  )
}

const Lobby = ({
  draftSource,
  isLive,
  onDraftSource,
  onTakeSeat,
  roomCode,
  seatNickname,
  send,
  view
}: {
  draftSource: TrackSource | null
  isLive: boolean
  onDraftSource: (source: TrackSource | null) => void
  onTakeSeat: (nickname: string) => void
  roomCode: RoomCode
  seatNickname: string | null
  send: (message: ClientMessage) => boolean
  view: HostRoomView
}) => {
  const translate = useTranslate()
  const joinUrl = playUrlFor(view.code)
  const game = view.settings.game

  // The draft, not the committed settings: the source is only sent on launch,
  // and a summary that waited for that would contradict the picker above it.
  const setupSummary = [
    game.kind === 'blindtest'
      ? translate(sourceKindKey((draftSource ?? game.source).kind))
      : null,
    translate(answerModeLabelKey(view.settings.answerMode)),
    translate('host.roundCount', { count: view.settings.roundCount })
  ]
    .filter((part) => part !== null)
    .join(' · ')

  return (
    <div className='stage lobby'>
      <section className='invitation'>
        <div className='code'>
          <p className='room-code'>{roomCode}</p>
          <CopyButton value={roomCode} />
        </div>
        <div className='qr'>
          <QRCodeSVG
            bgColor='transparent'
            fgColor='currentColor'
            marginSize={0}
            size={256}
            value={joinUrl}
          />
          <p className='invite'>{translate('host.invite.title')}</p>
          <p className='join-url'>{joinUrl}</p>
        </div>
      </section>

      {/*
        Who is in, and how it will be played — the two things the host owns
        before starting. Only the first belongs on a screen a room is reading:
        the rest is set once an evening and folds away behind its own summary.
      */}
      <div className='setup'>
        <section className='roster'>
          <h2>
            {translate('host.players.title')} {view.players.length}
          </h2>
          {view.players.length === 0 ? (
            <p className='empty'>{translate('host.players.empty')}</p>
          ) : (
            <Scoreboard players={view.players} />
          )}
        </section>

        <Disclosure label={translate('host.setup')} summary={setupSummary}>
          {game.kind === 'blindtest' && (
            <PlaylistPicker onDraftChange={onDraftSource} settings={game} />
          )}
          <SettingsPanel
            isLive={isLive}
            onChange={(settings) => {
              send({ settings, type: 'host.updateSettings' })
            }}
            settings={view.settings}
          />
          {/*
            Not offered in buzzer mode: that round needs someone reading the
            answer to judge it, and a judge who is also answering is not one.
          */}
          {view.settings.answerMode !== 'buzzer' && (
            <HostSeat onTakeSeat={onTakeSeat} takenAs={seatNickname} />
          )}
        </Disclosure>
      </div>
    </div>
  )
}

/**
 * Every one of these sends a frame, and a frame written to a socket that is not
 * open is dropped with nothing to show for it. Disabled while the connection is
 * away is the honest state: the press would be a no-op, and a control that
 * answers nothing reads as a broken game rather than a broken link.
 */
const Actions = ({
  isLive,
  onStart,
  send,
  view
}: {
  isLive: boolean
  onStart: () => void
  send: (message: ClientMessage) => boolean
  view: HostRoomView
}) => {
  const translate = useTranslate()

  if (view.phase === 'lobby') {
    const isRoomEmpty = view.players.length === 0

    return (
      <>
        <Button
          isDisabled={!isLive || isRoomEmpty}
          onPress={onStart}
          size='large'
        >
          {translate('host.startGame')}
        </Button>
        {isRoomEmpty && (
          <p className='reason'>{translate('host.needsPlayer')}</p>
        )}
      </>
    )
  }

  if (view.phase === 'countdown' || view.phase === 'playing') {
    return (
      <Button
        isDisabled={!isLive}
        onPress={() => {
          if (view.round !== null) {
            send({ roundId: view.round.id, type: 'host.reveal' })
          }
        }}
        variant='ghost'
      >
        {translate('host.reveal')}
      </Button>
    )
  }

  if (view.phase === 'revealed') {
    // The server ends the game rather than opening a round past the last one,
    // so on that reveal "next round" is a button that does something else than
    // it says — and the way out beside it reads as abandoning a game that is
    // already over. One control, named after what it opens.
    const isLastRound = (view.round?.index ?? 0) >= view.settings.roundCount

    if (isLastRound) {
      return (
        <Button
          isDisabled={!isLive}
          onPress={() => {
            send({ type: 'host.nextRound' })
          }}
          size='large'
        >
          {translate('host.seeResults')}
        </Button>
      )
    }

    return (
      <>
        <Button
          isDisabled={!isLive}
          onPress={() => {
            send({ type: 'host.nextRound' })
          }}
          size='large'
        >
          {translate('host.nextRound')}
        </Button>
        <Button
          isDisabled={!isLive}
          onPress={() => {
            send({ type: 'host.endGame' })
          }}
          variant='ghost'
        >
          {translate('host.endGame')}
        </Button>
      </>
    )
  }

  if (view.phase === 'finished') {
    return (
      <>
        <Button
          isDisabled={!isLive || view.players.length === 0}
          onPress={() => {
            // Two frames rather than a new message: `host.playAgain` already
            // means "same seats, same settings, scores at zero", and the lobby
            // it lands in is a phase nobody needs to look at when the answer to
            // "again?" was yes.
            send({ type: 'host.playAgain' })
            send({ type: 'host.startRound' })
          }}
          size='large'
        >
          {translate('host.playAgain')}
        </Button>
        <Button
          isDisabled={!isLive}
          onPress={() => {
            send({ type: 'host.playAgain' })
          }}
          variant='outlined'
        >
          {translate('host.changeSettings')}
        </Button>
        <Link href='/' variant='ghost'>
          {translate('menu.home')}
        </Link>
      </>
    )
  }

  return null
}
