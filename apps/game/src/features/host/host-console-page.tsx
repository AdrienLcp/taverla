import { QRCodeSVG } from 'qrcode.react'
import { useState } from 'react'

import type { ClientMessage } from '@taverla/protocol/client-message'
import type { RoomCode } from '@taverla/protocol/identifiers'
import type { HostRoomView } from '@taverla/protocol/room'
import type { TrackSource } from '@taverla/protocol/track'

import type { ClockEstimate } from '@taverla/core/time/clock-sync'

import { NotFoundPage } from '@/features/not-found/not-found-page'
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
import { Scoreboard } from '@/presentation/components/scoreboard'
import { useReportConnection } from '@/presentation/connection/connection-provider'
import { useTranslate } from '@/presentation/i18n/i18n-provider'
import { protocolErrorKey } from '@/presentation/i18n/translation'
import { usePhaseField } from '@/presentation/theme/use-phase-field'

import { CopyButton } from './copy-button'
import { GameSettings } from './game-settings'
import { HostControls } from './host-controls'
import { PlaylistPicker } from './playlist-picker'
import { RevealPanel } from './reveal-panel'
import { useRoundAudio } from './round-audio'
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
  const { clock, error, send, status, view } = useHostConnection(roomCode)
  const [volume, setVolume] = useState(readStoredVolume)
  const [draftSource, setDraftSource] = useState<TrackSource | null>(null)

  useReportConnection({ clock, status })
  usePhaseField(view?.phase ?? null)
  const { unlock } = useRoundAudio({ clock, view, volume })

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
      </header>

      <Stage
        clock={clock}
        onDraftSource={setDraftSource}
        roomCode={roomCode}
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
              isLive={status === 'open'}
              onStart={() => {
                // Inside the press, never in an effect: the autoplay policy
                // grants permission to the element only from a real gesture,
                // and it cannot be asked for later when the track arrives.
                unlock()

                // What the picker is showing is what the host chose, so the
                // launch commits it. Re-sending an unchanged source is free:
                // the server drops the pool only when it actually differs.
                if (draftSource !== null) {
                  send({
                    settings: { ...view.settings, source: draftSource },
                    type: 'host.updateSettings'
                  })
                }

                send({ type: 'host.startRound' })
              }}
              send={send}
              view={view}
            />
            <HostControls
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
  onDraftSource: (source: TrackSource | null) => void
  roomCode: RoomCode
  send: (message: ClientMessage) => boolean
  view: HostRoomView | null
}

const Stage = ({ clock, onDraftSource, roomCode, send, view }: StageProps) => {
  const translate = useTranslate()

  if (view === null) {
    return <div className='stage' />
  }

  const round = view.round

  if (view.phase === 'countdown' && round?.audioStartsAt != null) {
    return (
      <div className='stage solo'>
        <Countdown clock={clock} target={round.audioStartsAt} />
      </div>
    )
  }

  if (view.phase === 'playing' && round != null) {
    return (
      <div className='stage listening'>
        <p className='now'>{translate('blindtest.listening')}</p>
        <div
          className='clip-progress'
          key={`${round.id}-${round.awards.length}`}
          style={{
            '--clip-remaining': `${Math.max(
              0,
              view.settings.playbackDurationMs - view.playbackElapsedMs
            )}ms`
          }}
        />
        <Scoreboard players={view.players} />
      </div>
    )
  }

  if (view.phase === 'buzzed' && round?.activeBuzz != null) {
    const buzzerId = round.activeBuzz.playerId
    const buzzer = view.players.find((player) => player.id === buzzerId)

    return (
      <div className='stage solo'>
        {view.currentTrack !== null && (
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
            track={view.currentTrack}
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
      <div className='stage solo'>
        <h1 className='final-title'>{translate('host.final.title')}</h1>
        <Scoreboard players={view.players} />
      </div>
    )
  }

  return (
    <Lobby
      onDraftSource={onDraftSource}
      roomCode={roomCode}
      send={send}
      view={view}
    />
  )
}

const Lobby = ({
  onDraftSource,
  roomCode,
  send,
  view
}: {
  onDraftSource: (source: TrackSource | null) => void
  roomCode: RoomCode
  send: (message: ClientMessage) => boolean
  view: HostRoomView
}) => {
  const translate = useTranslate()
  const joinUrl = playUrlFor(view.code)

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
          <p className='join-url'>{joinUrl}</p>
        </div>
      </section>

      <section className='roster'>
        <h2>
          {translate('host.players.title')} {view.players.length}
        </h2>
        {view.players.length === 0 ? (
          <p className='empty'>{translate('host.players.empty')}</p>
        ) : (
          <Scoreboard players={view.players} />
        )}
        <PlaylistPicker
          onDraftChange={onDraftSource}
          settings={view.settings}
        />
        <GameSettings
          onChange={(settings) => {
            send({ settings, type: 'host.updateSettings' })
          }}
          settings={view.settings}
        />
      </section>
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
      <Button
        isDisabled={!isLive}
        onPress={() => {
          send({ type: 'host.playAgain' })
        }}
        size='large'
      >
        {translate('host.playAgain')}
      </Button>
    )
  }

  return null
}
