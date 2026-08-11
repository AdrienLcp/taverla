import { useState } from 'react'

import type { ClientMessage } from '@taverla/protocol/client-message'
import { roundDurationMsOf } from '@taverla/protocol/game'
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
import { holdsTheAnswer, quizContent } from '@/helpers/round-content'
import { useHostConnection } from '@/infrastructure/messaging/use-host-connection'
import { useRoomCodeParam } from '@/infrastructure/router/navigation'
import {
  readStoredVolume,
  writeStoredVolume
} from '@/infrastructure/storage/preferences-storage'
import { AskedQuestion } from '@/presentation/components/asked-question'
import { ConnectionRefused } from '@/presentation/components/connection-refused'
import { Countdown } from '@/presentation/components/countdown'
import { Scoreboard } from '@/presentation/components/scoreboard'
import { useReportConnection } from '@/presentation/connection/connection-provider'
import { useTranslate } from '@/presentation/i18n/i18n-provider'
import { protocolErrorKey } from '@/presentation/i18n/translation'
import { usePhaseField } from '@/presentation/theme/use-phase-field'

import { FinalBoard } from './final-board'
import { HostActions } from './host-actions'
import { HostControls } from './host-controls'
import { JoinReminder } from './join-reminder'
import { LobbyStage } from './lobby-stage'
import { RevealPanel } from './reveal-panel'
import { useRoundAudio } from './round-audio'
import { SetupFold } from './setup-fold'
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
            {view.settings.roundCount === null
              ? translate('round.indexOpen', { index: view.round.index })
              : translate('round.index', {
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
        isSeated={seatNickname !== null}
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
            <HostActions
              isLive={isLive}
              onOpenRound={() => {
                // Inside the press, never in an effect: the autoplay policy
                // grants permission to the element only from a real gesture,
                // and it cannot be asked for later when the track arrives.
                unlock()

                // What the picker is showing is what the host chose, and a
                // round about to be drawn is the moment that means something —
                // which is why every control that opens one comes through here
                // rather than the launch alone. Re-sending an unchanged source
                // is free: the server drops the pool only when it differs.
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
            <SetupFold
              draftSource={draftSource}
              isLive={isLive}
              onDraftSource={setDraftSource}
              onSettingsChange={(settings) => {
                send({ settings, type: 'host.updateSettings' })
              }}
              onTakeSeat={setSeatNickname}
              seatNickname={seatNickname}
              view={view}
            />
          </>
        )}
      </footer>
    </main>
  )
}

type StageProps = {
  clock: ClockEstimate | null
  isSeated: boolean
  roomCode: RoomCode
  send: (message: ClientMessage) => boolean
  view: HostRoomView | null
}

const Stage = ({ clock, isSeated, roomCode, send, view }: StageProps) => {
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
    const roundDurationMs = roundDurationMsOf(game)

    return (
      <div className='stage playing'>
        {game.kind === 'quiz' ? (
          <AskedQuestion prompt={quizContent(round)?.prompt ?? null} />
        ) : (
          <p className='now'>
            {translate(
              game.kind === 'buzzer' ? 'buzzer.running' : 'blindtest.listening'
            )}
          </p>
        )}
        {roundDurationMs !== null && (
          <div
            className='round-progress'
            key={`${round.id}-${round.awards.length}`}
            style={{
              '--round-remaining': `${Math.max(
                0,
                roundDurationMs - view.roundElapsedMs
              )}ms`
            }}
          />
        )}
        {isSeated && view.settings.mode.kind === 'choice' && (
          <ChoiceAnswer onAnswer={answerWithRound} round={round} />
        )}
        {isSeated && view.settings.mode.kind === 'typed' && (
          <TypedAnswer
            key={round.id}
            onAnswer={answerWithRound}
            round={round}
            verdict={view.yourVerdict}
          />
        )}
        <Scoreboard players={view.players} />
      </div>
    )
  }

  if (view.phase === 'buzzed' && round?.activeBuzz != null) {
    const buzzerId = round.activeBuzz.playerId
    const buzzer = view.players.find((player) => player.id === buzzerId)
    const content = view.currentContent

    return (
      <div className='stage solo'>
        {content !== null && holdsTheAnswer(content) && (
          <VerdictPanel
            buzz={round.activeBuzz}
            clock={clock}
            content={content}
            nickname={buzzer?.nickname ?? '—'}
            onJudge={(verdict) => {
              send({
                playerId: buzzerId,
                roundId: round.id,
                type: 'host.judge',
                verdict
              })
            }}
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

  return <LobbyStage roomCode={roomCode} view={view} />
}
