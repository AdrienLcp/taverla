import type React from 'react'
import { useCallback, useState } from 'react'

import type { ClientMessage } from '@taverla/protocol/client-message'
import { roundDurationMsOf } from '@taverla/protocol/game'
import type {
  HostToken,
  PlayerId,
  RoomCode
} from '@taverla/protocol/identifiers'
import type {
  HostRoomView,
  RoomSettings,
  RoundView
} from '@taverla/protocol/room'
import type { TrackSource } from '@taverla/protocol/track'

import {
  type ClipRefusal,
  isClipUnheard
} from '@taverla/core/blindtest/clip-audio'
import { isJudgedByHost } from '@taverla/core/room/game-modes'
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
  blindtestHostContent,
  holdsTheAnswer,
  lefakeContent,
  quizContent
} from '@/helpers/round-content'
import { useHostConnection } from '@/infrastructure/messaging/use-host-connection'
import { useRoomCodeParam } from '@/infrastructure/router/navigation'
import {
  readStoredHostPreferences,
  writeStoredHostPreferences,
  writeStoredNickname
} from '@/infrastructure/storage/preferences-storage'
import {
  forgetHostToken,
  forgetSeatNickname,
  forgetSessionId,
  readSeatNickname,
  writeHostToken,
  writeSeatNickname
} from '@/infrastructure/storage/session-storage'
import { unlockBuzzCue, useBuzzCue } from '@/presentation/audio/buzz-cue'
import { useVolume } from '@/presentation/audio/volume-provider'
import { AskedQuestion } from '@/presentation/components/asked-question'
import { Button } from '@/presentation/components/button'
import { Countdown } from '@/presentation/components/countdown'
import { RoomInvitation } from '@/presentation/components/room-invitation'
import {
  RevealHold,
  RoundProgress
} from '@/presentation/components/round-progress'
import { Scoreboard } from '@/presentation/components/scoreboard'
import { useReportConnection } from '@/presentation/connection/connection-provider'
import {
  reflexOutcome,
  useBuzzOutcome
} from '@/presentation/haptics/buzz-outcome'
import { useRoomDocumentTitle } from '@/presentation/head/use-room-document-title'
import { useTranslate } from '@/presentation/i18n/i18n-provider'
import {
  clipRefusalKey,
  protocolErrorKey
} from '@/presentation/i18n/translation'
import { useReportRoomActions } from '@/presentation/room-actions/room-actions-provider'
import { usePhaseField } from '@/presentation/theme/use-phase-field'
import { useScreenAwake } from '@/presentation/use-screen-awake'

import { AutoAdvanceChoice } from './auto-advance-choice'
import { FinalBoard } from './final-board'
import { HostActions } from './host-actions'
import { HostRefused } from './host-refused'
import { JoinReminder } from './join-reminder'
import { LobbyStage } from './lobby-stage'
import { ReflexStage } from './reflex-stage'
import { RevealPanel } from './reveal-panel'
import { useRoundAudio } from './round-audio'
import { SetupFold } from './setup-fold'
import { SlateCorrectionStage, SlateWritingStage } from './slate-stages'
import { useRestoreStoredSetup } from './use-restore-stored-setup'
import { VerdictPanel } from './verdict-panel'

import './host-console-page.sass'

export const HostConsolePage: React.FC = () => {
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

const HostConsole: React.FC<{ roomCode: RoomCode }> = ({ roomCode }) => {
  const translate = useTranslate()
  // Read from storage rather than started empty, because this is the only thing
  // that puts the name back on the next `hello` — and a console whose tab was
  // discarded on a screen lock reloads rather than blinks, so a seat kept in
  // component state alone came back as no seat at all.
  const [seatNickname, setSeatNickname] = useState(() =>
    readSeatNickname({ role: 'host', roomCode })
  )
  const { clearError, clock, error, retry, send, status, view } =
    useHostConnection(roomCode, seatNickname)
  const [requestedNickname, setRequestedNickname] = useState<string | null>(
    null
  )
  const [hasOfferedToken, setHasOfferedToken] = useState(false)
  const { volume } = useVolume()
  const [draftSource, setDraftSource] = useState<TrackSource | null>(null)
  const [preferences, setPreferences] = useState(readStoredHostPreferences)

  useReportConnection({ clock, status })
  useRoomDocumentTitle(view?.settings.game?.kind ?? null)
  usePhaseField(view?.phase ?? null)
  useScreenAwake(status !== 'refused' && view?.phase !== 'finished')
  const { canPlay, refusal, unlock } = useRoundAudio({ clock, view, volume })

  useBuzzCue(view?.round?.activeBuzz?.atServerTime ?? null)
  useBuzzOutcome(
    reflexOutcome({ round: view?.round ?? null, youId: view?.youId ?? null })
  )

  // One press, two permissions: the clip's element and the cue's audio context
  // are both granted only from a real gesture, and neither can be asked for
  // later — so the console arms them together or not at all.
  const armAudio = () => {
    unlock()
    unlockBuzzCue()
  }

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

      // The server takes the seat back on this frame, and the console follows
      // it here rather than by watching the answer come back: a name still
      // remembered would put the seat on the next reconnect, under a game that
      // would then have to refuse it — and inferring the loss from the room's
      // view cannot tell "refused" from "the reconnect has not answered yet".
      if (
        isJudgedByHost({
          game: settings.game?.kind ?? null,
          mode: settings.mode.kind
        })
      ) {
        forgetSeatNickname({ role: 'host', roomCode })
        setSeatNickname(null)
      }

      send({ settings, type: 'host.updateSettings' })
    },
    [roomCode, send]
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
    forgetSeatNickname({ role: 'host', roomCode })
    setSeatNickname(null)
  }, [roomCode, send])

  // Kept before the socket carries it, for the same reason the token is: the
  // reopen this triggers builds its `hello` out of storage.
  const takeSeat = (nickname: string) => {
    writeStoredNickname(nickname)
    writeSeatNickname({ nickname, role: 'host', roomCode })
    setSeatNickname(nickname)
  }

  // A frame, and the store — never `setSeatNickname`, which is what the socket
  // is keyed on: reopening it to change a label would freeze the round on every
  // player's screen in the room. The stored name is what a reload re-seats
  // under if the seat itself has since expired.
  const renameSeat = useCallback(
    (nickname: string) => {
      clearError()
      setRequestedNickname(nickname)
      writeStoredNickname(nickname)
      writeSeatNickname({ nickname, role: 'host', roomCode })
      send({ nickname, type: 'player.rename' })
    },
    [clearError, roomCode, send]
  )

  // The roster's ✕ sits beside the console's own seat too, and removing
  // yourself is leaving it. Only `player.leave` also drops the nickname, which
  // the socket would otherwise re-seat this screen with on the next reconnect —
  // so an eviction aimed here would not survive a Wi-Fi blink.
  const removePlayer = (playerId: PlayerId) => {
    if (playerId === view?.youId) {
      leaveSeat()

      return
    }

    send({ playerId, type: 'host.removePlayer' })
  }

  // Offered to the menu above, which owns the only way off this screen. What a
  // dead socket takes away is the *press*, which the menu greys out itself —
  // dropping the item would make the menu's contents flap on a Wi-Fi blink.
  const seatedAs =
    view?.players.find((player) => player.id === view.youId)?.nickname ?? null

  useReportRoomActions({
    closeRoom,
    endGame: view !== null && isGameInPlay(view.phase) ? endGame : null,
    leaveSeat: view?.youId == null ? null : leaveSeat,
    refusedNickname:
      requestedNickname !== null && error?.code === 'nickname_taken'
        ? requestedNickname
        : null,
    rename: seatedAs === null ? null : renameSeat,
    seatNickname: seatedAs
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
        {/*
          The lobby is the one phase that excludes it, because the invitation
          is already the stage's larger half there. `finished` used to be
          excluded too and that was backwards: the final board is precisely
          when somebody says *on en refait une, j'appelle Marc*, and the room
          still answers.
        */}
        {view !== null && view.phase !== 'lobby' && (
          <JoinReminder roomCode={roomCode} />
        )}
      </header>

      <Stage
        canPlay={canPlay}
        clock={clock}
        isLive={isLive}
        onRemovePlayer={removePlayer}
        onSettingsChange={changeSettings}
        onTakeSeat={takeSeat}
        onUnlockAudio={armAudio}
        preferences={preferences}
        refusal={refusal}
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
              draftSource={draftSource}
              isLive={isLive}
              onOpenRound={() => {
                // Inside the press, never in an effect: the autoplay policy
                // grants permission only from a real gesture, and it cannot be
                // asked for later when the track arrives.
                armAudio()

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
            {/*
              `finished` is not a phase of a game, it is the result of one, and
              both of these act on a game in flight: how long a reveal is held
              before the room is moved on, and the settings the next round is
              built from. Neither has anything on this screen to act on, and
              both are behind the button beside them — *back to the table* lands
              on the lobby, whose stage is the picker, the roster and the seat,
              with the rest folded under it.

              They cost 158px of a 302px footer, which is what the final board
              was overflowing by: nine players on a 1280×800 put the replay
              half under the fold and the way back entirely below it.
            */}
            {view.phase !== 'finished' && (
              <>
                {view.settings.game?.kind !== 'slate' && (
                  <AutoAdvanceChoice
                    isLive={isLive}
                    onSettingsChange={changeSettings}
                    settings={view.settings}
                  />
                )}
                <SetupFold
                  draftSource={draftSource}
                  isLive={isLive}
                  onDraftSource={setDraftSource}
                  onSettingsChange={changeSettings}
                  onTakeSeat={takeSeat}
                  preferences={preferences}
                  view={view}
                />
              </>
            )}
          </>
        )}
      </footer>
    </main>
  )
}

type StageProps = {
  /** Whether a press has blessed an audio element on this screen. */
  canPlay: boolean
  clock: ClockEstimate | null
  isLive: boolean
  /** Aimed at the console's own seat too, which is why it is not a bare frame. */
  onRemovePlayer: (playerId: PlayerId) => void
  onSettingsChange: (settings: RoomSettings) => void
  /** Reopens the socket with a name on it, which is what takes the lobby's seat. */
  onTakeSeat: (nickname: string) => void
  /** The gesture a screen that cannot play a clip has to be offered. */
  onUnlockAudio: () => void
  /** What this host last left each game set to, for the lobby's picker. */
  preferences: HostPreferences | null
  /** Why the last press did not arm this screen, and `null` while none has failed. */
  refusal: ClipRefusal | null
  roomCode: RoomCode
  send: (message: ClientMessage) => boolean
  view: HostRoomView | null
}

const Stage: React.FC<StageProps> = ({
  canPlay,
  clock,
  isLive,
  onRemovePlayer,
  onSettingsChange,
  onTakeSeat,
  onUnlockAudio,
  preferences,
  refusal,
  roomCode,
  send,
  view
}) => {
  const translate = useTranslate()
  const lastRevealed = useRoundStillBeingTalkedAbout(view)

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

  // The room's answer, never what this console asked for: a seat can go without
  // this screen deciding it — the host takes it off the roster, or the sweeper
  // gives it up — and a screen still drawing its own answer form owns nothing.
  const isSeated = view.youId !== null

  // A silent round is *visually identical* to one that plays — the clip's
  // progress comes from the server, buzzes work, the reveal lands — so this is
  // the one thing on the console that has to be said out loud.
  const clipOffer = isClipUnheard({
    canPlay,
    hasClip: blindtestHostContent(view)?.audioUrl != null,
    phase: view.phase
  }) ? (
    <div className='muted-clip'>
      <p>{translate('blindtest.audio.silent')}</p>
      <Button onPress={onUnlockAudio} size='small' variant='outlined'>
        {translate('blindtest.audio.start')}
      </Button>
      {/* Below the offer, because it is what the last one came back with. */}
      {refusal !== null && (
        <p className='refusal' role='alert'>
          {translate(clipRefusalKey(refusal))}
        </p>
      )}
    </div>
  ) : null

  if (view.phase === 'countdown' && round?.startsAt != null) {
    // The round that just ran, still up while the next one counts in. It is the
    // whole of what made this screen repetitive: a number replacing the answer
    // the room was in the middle of arguing about. The field is the countdown's
    // own — the colour is what says a new round is coming, and the content is
    // what says what the last one was.
    return (
      <div
        className={lastRevealed === null ? 'stage solo' : 'stage counting-in'}
      >
        <Countdown clock={clock} target={round.startsAt} />
        {lastRevealed !== null && (
          <RevealPanel players={view.players} round={lastRevealed} />
        )}
        {clipOffer}
      </div>
    )
  }

  // The one playing stage with nothing beside it. The room is staring at this
  // screen waiting for it to change, and standings under the flip would be a
  // second thing to look at on a screen whose whole job is to carry one event.
  if (view.phase === 'playing' && round?.content.kind === 'reflex') {
    return (
      <div className='stage solo'>
        <ReflexStage
          clock={clock}
          onBuzz={(roundId) => send({ roundId, type: 'player.buzz' })}
          round={round}
          youId={view.youId}
        />
      </div>
    )
  }

  if (view.phase === 'playing' && round?.content.kind === 'slate') {
    return round.content.currentItemIndex === null ? (
      <SlateWritingStage isLive={isLive} send={send} view={view} />
    ) : (
      <SlateCorrectionStage isLive={isLive} send={send} view={view} />
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
            // A seated console is withheld the answer the same way a player
            // is, so it reads what the round asks for off the settings too.
            asksForAFilm={
              view.settings.game?.kind === 'blindtest' &&
              view.settings.game.source.kind === 'film'
            }
            key={round.id}
            onAnswer={answerWithRound}
            round={round}
            verdict={view.yourVerdict}
          />
        )}
        {clipOffer}
        <Scoreboard players={view.players} />
      </div>
    )
  }

  // The board on the console, which is where this game is actually played:
  // the room reads it, argues about it, and votes on their own screens.
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
    const holdMs = view.settings.autoAdvanceMs
    // The pair travels stamped together, so one of them missing means nothing
    // is counting this reveal down and the screen owes the room no bar.
    const hold =
      round.advancesAt === null || holdMs === null
        ? null
        : { advancesAt: round.advancesAt, holdMs }

    // The standings, at the one moment the room asks for them. They are on this
    // screen during `playing` already, where nobody is looking at them — the
    // reveal is when the table wants to know what the round did to the game.
    return (
      // How many rows the standings hold, for the same reason the board carries
      // its own count: beside a board and on half the width, this one buys its
      // height by dividing its box rather than by taking a second column.
      //
      // `holding` is what the height budgets read: a bar spends a row of the
      // screen the three formulas below are dividing, so they have to know
      // whether it is there.
      <div
        className={`stage revealed${hold === null ? '' : ' holding'}`}
        style={{ '--standings-rows': view.players.length }}
      >
        <RevealPanel players={view.players} round={round} />
        <Scoreboard players={view.players} />
        {hold !== null && <RevealHold clock={clock} {...hold} />}
      </div>
    )
  }

  if (view.phase === 'finished') {
    return (
      <div className='stage finished'>
        <FinalBoard players={view.players} />
      </div>
    )
  }

  return (
    <LobbyStage
      isLive={isLive}
      onRemovePlayer={onRemovePlayer}
      onSettingsChange={onSettingsChange}
      onTakeSeat={onTakeSeat}
      preferences={preferences}
      roomCode={roomCode}
      view={view}
    />
  )
}

/**
 * The round the room is still talking about, which the view stops carrying the
 * moment the next one opens: `openRound` replaces `room.round`, so by the time
 * a countdown is on screen the reveal it interrupted is gone from the snapshot.
 *
 * Held here rather than added to the wire, because it is the console's own
 * memory of what it drew — the server has nothing to say about a round it has
 * finished with, and a second round on the room view would have to be kept
 * honest through a reload, a takeover and a game change for one screen's sake.
 * A console that reloads mid-countdown simply gets the number alone, which is
 * the screen this replaced.
 */
const useRoundStillBeingTalkedAbout = (
  view: HostRoomView | null
): RoundView | null => {
  const [lastRevealed, setLastRevealed] = useState<RoundView | null>(null)

  if (
    view?.phase === 'revealed' &&
    view.round !== null &&
    view.round !== lastRevealed
  ) {
    setLastRevealed(view.round)
  }

  // A game that ended and a room back in its lobby have nothing to recap, and
  // the next game must not open on the last one's answer.
  if (
    lastRevealed !== null &&
    (view === null || view.phase === 'lobby' || view.phase === 'finished')
  ) {
    setLastRevealed(null)
  }

  return lastRevealed
}
