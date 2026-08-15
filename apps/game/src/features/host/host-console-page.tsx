import { useCallback, useState } from 'react'

import type { ClientMessage } from '@taverla/protocol/client-message'
import { roundDurationMsOf } from '@taverla/protocol/game'
import type { HostToken, RoomCode } from '@taverla/protocol/identifiers'
import type { HostRoomView, RoomSettings } from '@taverla/protocol/room'
import type { TrackSource } from '@taverla/protocol/track'

import {
  type HostPreferences,
  rememberSettings
} from '@taverla/core/room/host-preferences'
import { isGameInPlay } from '@taverla/core/room/room-phase'
import type { ClockEstimate } from '@taverla/core/time/clock-sync'

import { NotFoundPage } from '@/features/not-found/not-found-page'
import {
  ChoiceAnswer,
  type PlayerAnswer,
  TypedAnswer
} from '@/features/player/answer-forms'
import {
  holdsTheAnswer,
  lefakeContent,
  quizContent
} from '@/helpers/round-content'
import { useHostConnection } from '@/infrastructure/messaging/use-host-connection'
import { useRoomCodeParam } from '@/infrastructure/router/navigation'
import {
  readStoredHostPreferences,
  readStoredVolume,
  writeStoredHostPreferences,
  writeStoredVolume
} from '@/infrastructure/storage/preferences-storage'
import {
  forgetHostToken,
  forgetSessionId,
  writeHostToken
} from '@/infrastructure/storage/session-storage'
import { AskedQuestion } from '@/presentation/components/asked-question'
import { Countdown } from '@/presentation/components/countdown'
import { RoundProgress } from '@/presentation/components/round-progress'
import { Scoreboard } from '@/presentation/components/scoreboard'
import { useReportConnection } from '@/presentation/connection/connection-provider'
import { useReportRoomExits } from '@/presentation/exits/room-exits-provider'
import { useTranslate } from '@/presentation/i18n/i18n-provider'
import { protocolErrorKey } from '@/presentation/i18n/translation'
import { usePhaseField } from '@/presentation/theme/use-phase-field'

import { FinalBoard } from './final-board'
import { HostActions } from './host-actions'
import { HostControls } from './host-controls'
import { HostRefused } from './host-refused'
import { JoinReminder } from './join-reminder'
import { LobbyStage } from './lobby-stage'
import { RevealPanel } from './reveal-panel'
import { RoomInvitation } from './room-invitation'
import { useRoundAudio } from './round-audio'
import { SetupFold } from './setup-fold'
import { useRestoreStoredSetup } from './use-restore-stored-setup'
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
  // Taken once and only ever given back: the socket reopens on a change of
  // nickname, and re-seating mid-round would drop the answer being typed.
  const [seatNickname, setSeatNickname] = useState<string | null>(null)
  const { clock, error, retry, send, status, view } = useHostConnection(
    roomCode,
    seatNickname
  )
  const [hasOfferedToken, setHasOfferedToken] = useState(false)
  const [volume, setVolume] = useState(readStoredVolume)
  const [draftSource, setDraftSource] = useState<TrackSource | null>(null)
  const [preferences, setPreferences] = useState(readStoredHostPreferences)

  useReportConnection({ clock, status })
  usePhaseField(view?.phase ?? null)
  const { unlock } = useRoundAudio({ clock, view, volume })
  const isLive = status === 'open'

  // Every way the console has of changing a setting comes through here, so what
  // the next room opens on is whatever this one was last left on. The stored
  // value is re-read rather than taken from state: two controls pressed in one
  // tick would otherwise have the second overwrite the first's.
  const changeSettings = useCallback(
    (settings: RoomSettings) => {
      const remembered = rememberSettings({
        preferences: readStoredHostPreferences(),
        settings
      })

      writeStoredHostPreferences(remembered)
      setPreferences(remembered)
      send({ settings, type: 'host.updateSettings' })
    },
    [send]
  )

  useRestoreStoredSetup({ onRestore: changeSettings, preferences, view })

  const endGame = useCallback(() => {
    send({ type: 'host.endGame' })
  }, [send])

  // The frame goes first: navigating away closes the socket, and a room closed
  // after that is a room nobody was told about. The stored claim goes with it —
  // it is worth nothing once the code stops resolving.
  const closeRoom = useCallback(() => {
    send({ type: 'host.closeRoom' })
    forgetSessionId({ role: 'host', roomCode })
    forgetHostToken(roomCode)
  }, [roomCode, send])

  // The frame first again, and for a second reason: dropping the nickname
  // reopens the socket, so a seat given up on the reconnect alone would sit on
  // the roster until the server timed it out.
  const leaveSeat = useCallback(() => {
    send({ type: 'player.leave' })
    setSeatNickname(null)
  }, [send])

  // Offered to the menu above, which owns the only way off this screen. What a
  // dead socket takes away is the *press*, which the menu greys out itself —
  // dropping the item would make the menu's contents flap on a Wi-Fi blink.
  useReportRoomExits({
    closeRoom,
    endGame: view !== null && isGameInPlay(view.phase) ? endGame : null,
    leaveSeat: seatNickname === null ? null : leaveSeat
  })

  // Written before the socket carries it, because the hello is built from
  // storage: the retry is what sends it, and it reads what was just kept.
  const offerHostToken = (hostToken: HostToken) => {
    writeHostToken({ hostToken, roomCode })
    setHasOfferedToken(true)
    retry()
  }

  if (status === 'refused') {
    return (
      <main className='host-console-page'>
        <div className='stage solo'>
          <HostRefused
            error={error}
            hasOfferedToken={hasOfferedToken}
            onOfferToken={offerHostToken}
            onRetry={retry}
          />
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
        isLive={isLive}
        isSeated={seatNickname !== null}
        onSettingsChange={changeSettings}
        preferences={preferences}
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

                if (draftSource !== null && game?.kind === 'blindtest') {
                  changeSettings({
                    ...view.settings,
                    game: { ...game, source: draftSource }
                  })
                }
              }}
              send={send}
              view={view}
            />
            <HostControls
              isLive={isLive}
              onSettingsChange={changeSettings}
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
              onSettingsChange={changeSettings}
              onTakeSeat={setSeatNickname}
              preferences={preferences}
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
  isLive: boolean
  isSeated: boolean
  onSettingsChange: (settings: RoomSettings) => void
  /** What this host last left each game set to, for the lobby's picker. */
  preferences: HostPreferences | null
  roomCode: RoomCode
  send: (message: ClientMessage) => boolean
  view: HostRoomView | null
}

const Stage = ({
  clock,
  isLive,
  isSeated,
  onSettingsChange,
  preferences,
  roomCode,
  send,
  view
}: StageProps) => {
  const translate = useTranslate()

  // The invitation is drawn from the code in the address bar and this origin,
  // so the room can start reading it out before the socket has answered. Two
  // columns with one child on purpose: it lands in the column it keeps, and
  // nothing moves when the first snapshot arrives.
  if (view === null) {
    return (
      <div className='stage lobby'>
        <RoomInvitation roomCode={roomCode} />
      </div>
    )
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

    // The round's own content, not the settings: it is the game the round was
    // opened on, where `settings.game` is only what the room is set to now.
    const roundDurationMs = roundDurationMsOf(view.settings.game)

    return (
      <div className='stage playing'>
        {round.content.kind === 'quiz' && (
          <AskedQuestion prompt={quizContent(round)?.prompt ?? null} />
        )}
        {/*
          The prompt *and* a line saying what the room is doing with it: unlike
          every other game, seeing the question here does not tell you what the
          screen is waiting for.
        */}
        {round.content.kind === 'lefake' && (
          <>
            <AskedQuestion prompt={lefakeContent(round)?.prompt ?? null} />
            <p className='now'>
              {translate('lefake.write.waiting', {
                count: lefakeContent(round)?.writtenPlayerIds.length ?? 0
              })}
            </p>
          </>
        )}
        {(round.content.kind === 'blindtest' ||
          round.content.kind === 'buzzer') && (
          <p className='now'>
            {translate(
              round.content.kind === 'buzzer'
                ? 'buzzer.running'
                : 'blindtest.listening'
            )}
          </p>
        )}
        {roundDurationMs !== null && (
          <RoundProgress
            durationMs={roundDurationMs}
            elapsedMs={view.roundElapsedMs}
          />
        )}
        {isSeated && view.settings.mode.kind === 'choice' && (
          <ChoiceAnswer
            key={round.id}
            onAnswer={answerWithRound}
            round={round}
            youId={view.youId}
          />
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

  // The board on the big screen, which is where this game is actually played:
  // the room reads it, argues about it, and votes on their phones.
  if (view.phase === 'voting' && round != null) {
    const board = lefakeContent(round)?.board ?? []

    return (
      <div className='stage voting'>
        {/*
          No scoreboard here, unlike every other stage: it is as tall as the
          room is large, and the board is the one thing everybody has to read at
          once. The standings are a press away, on the reveal this leads to.
        */}
        <div className='asking'>
          <AskedQuestion prompt={lefakeContent(round)?.prompt ?? null} />
          <p className='now'>
            {translate('lefake.vote.waiting', {
              count: lefakeContent(round)?.votedPlayerIds.length ?? 0
            })}
          </p>
        </div>
        <ul className='lie-board' style={{ '--board-lines': board.length }}>
          {board.map((candidate) => (
            <li key={candidate.id}>{candidate.text}</li>
          ))}
        </ul>
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

  return (
    <LobbyStage
      isLive={isLive}
      onSettingsChange={onSettingsChange}
      preferences={preferences}
      roomCode={roomCode}
      send={send}
      view={view}
    />
  )
}
