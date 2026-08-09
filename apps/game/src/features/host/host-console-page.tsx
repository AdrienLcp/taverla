import { QRCodeSVG } from 'qrcode.react'
import { useState } from 'react'

import type { ClientMessage } from '@blindtest/protocol/client-message'
import type { RoomCode } from '@blindtest/protocol/identifiers'
import type { HostRoomView, RoomSettings } from '@blindtest/protocol/room'

import type { ClockEstimate } from '@blindtest/core/time/clock-sync'

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
import { ConnectionStatus } from '@/presentation/components/connection-status'
import { Countdown } from '@/presentation/components/countdown'
import { Scoreboard } from '@/presentation/components/scoreboard'
import { useTranslate } from '@/presentation/i18n/i18n-provider'
import { protocolErrorKey } from '@/presentation/i18n/translation'
import { usePhaseField } from '@/presentation/theme/use-phase-field'

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

  usePhaseField(view?.phase ?? null)
  const { unlock } = useRoundAudio({ clock, view, volume })

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
        <ConnectionStatus clock={clock} status={status} />
      </header>

      {view === null ? (
        <div className='stage' />
      ) : (
        <Stage clock={clock} roomCode={roomCode} send={send} view={view} />
      )}

      <footer>
        {error !== null && (
          <p className='error' role='alert'>
            {translate(protocolErrorKey(error.code))}
          </p>
        )}
        {view !== null && (
          <>
            <Actions
              onStart={() => {
                // Inside the press, never in an effect: the autoplay policy
                // grants permission to the element only from a real gesture,
                // and it cannot be asked for later when the track arrives.
                unlock()
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
  roomCode: RoomCode
  send: (message: ClientMessage) => boolean
  view: HostRoomView
}

const Stage = ({ clock, roomCode, send, view }: StageProps) => {
  const translate = useTranslate()
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

  return <Lobby roomCode={roomCode} send={send} view={view} />
}

const Lobby = ({
  roomCode,
  send,
  view
}: {
  roomCode: RoomCode
  send: (message: ClientMessage) => boolean
  view: HostRoomView
}) => {
  const translate = useTranslate()
  const joinUrl = playUrlFor(view.code)

  return (
    <div className='stage lobby'>
      <section className='invitation'>
        <p className='room-code'>{roomCode}</p>
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
          onChange={(settings: RoomSettings) => {
            send({ settings, type: 'host.updateSettings' })
          }}
          settings={view.settings}
        />
      </section>
    </div>
  )
}

const Actions = ({
  onStart,
  send,
  view
}: {
  onStart: () => void
  send: (message: ClientMessage) => boolean
  view: HostRoomView
}) => {
  const translate = useTranslate()

  if (view.phase === 'lobby') {
    return (
      <Button
        isDisabled={view.players.length === 0}
        onPress={onStart}
        size='large'
      >
        {translate('host.startGame')}
      </Button>
    )
  }

  if (view.phase === 'countdown' || view.phase === 'playing') {
    return (
      <Button
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
          onPress={() => {
            send({ type: 'host.nextRound' })
          }}
          size='large'
        >
          {translate('host.nextRound')}
        </Button>
        <Button
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
