import { useScreenAwake } from '@adrienlcp/browser/react'
import type React from 'react'
import { useCallback, useEffect, useState } from 'react'
import { useNavigate } from 'react-router'

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

import { isJudgedByHost } from '@taverla/core/room/game-modes'
import {
  type HostPreferences,
  rememberSettings
} from '@taverla/core/room/host-preferences'
import { isGameInPlay } from '@taverla/core/room/room-phase'
import { withPreparedKey } from '@taverla/core/slate/prepared-keys'

import { NotFoundPage } from '@/features/not-found/not-found-page'
import { ChoosingRound } from '@/features/player/choosing-round'
import { useHostConnection } from '@/infrastructure/messaging/use-host-connection'
import {
  useCameFromWall,
  useRoomCodeParam,
  wallPathFor
} from '@/infrastructure/router/navigation'
import {
  readStoredHostPreferences,
  writeStoredHostPreferences,
  writeStoredNickname
} from '@/infrastructure/storage/preferences-storage'
import {
  readPreparedSlateKeys,
  writePreparedSlateKeys
} from '@/infrastructure/storage/prepared-keys-storage'
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
import { RoundChrome } from '@/presentation/components/round-chrome'
import { RoundProgress } from '@/presentation/components/round-progress'
import { useReportConnection } from '@/presentation/connection/connection-provider'
import {
  reflexOutcome,
  useBuzzOutcome
} from '@/presentation/haptics/buzz-outcome'
import { RoomDocumentTitle } from '@/presentation/head/room-document-title'
import { useTranslate } from '@/presentation/i18n/i18n-provider'
import { protocolErrorKey } from '@/presentation/i18n/translation'
import { useReportRoomActions } from '@/presentation/room-actions/room-actions-provider'
import { useMarkingField } from '@/presentation/theme/use-marking-field'
import { usePhaseField } from '@/presentation/theme/use-phase-field'

import { AutoAdvanceChoice } from './auto-advance-choice'
import { ClipOffer } from './clip-offer'
import { HostActions } from './host-actions'
import { HostRefused } from './host-refused'
import { JoinReminder } from './join-reminder'
import { RoomStage } from './room-stage'
import { useRoundAudio } from './round-audio'
import { SetupFold } from './setup-fold'
import { useRestoreStoredSetup } from './use-restore-stored-setup'
import { useSlateWall } from './use-slate-wall'

import './host-console-page.sass'

const storedHostPreferencesOrNone = (): HostPreferences | null => {
  const stored = readStoredHostPreferences()

  return stored.status === 'success' ? stored.data : null
}

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
  const [preferences, setPreferences] = useState(storedHostPreferencesOrNone)
  const [preparedKeys, setPreparedKeys] = useState(readPreparedSlateKeys)

  useReportConnection({ clock, status })
  usePhaseField(view?.phase ?? null)
  const slateWall = useSlateWall(view)
  useMarkingField(view?.phase === 'playing' && slateWall.isOnWall)
  useScreenAwake(status !== 'refused' && view?.phase !== 'finished')

  // A wall in the room is its speaker, and two screens a few milliseconds apart
  // are the flange stage 10 measured — so the console falls silent while one is
  // there, and picks the clip up again where the room's clock says it is.
  const isSpeaker = view?.isWallConnected !== true
  const { canPlay, refusal, unlock } = useRoundAudio({
    clock,
    view: isSpeaker ? view : null,
    volume
  })

  useBuzzCue(isSpeaker ? (view?.round?.activeBuzz?.atServerTime ?? null) : null)
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
        preferences: storedHostPreferencesOrNone(),
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

  const rememberPreparedKey = (itemIndex: number, key: string) => {
    const remembered = withPreparedKey({
      itemIndex,
      key,
      keys: readPreparedSlateKeys()
    })

    writePreparedSlateKeys(remembered)
    setPreparedKeys(remembered)
  }

  const preparedSlateKeys =
    view?.settings.game?.kind === 'slate' ? preparedKeys : undefined

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

  const choosing = view === null ? null : seatedChoosingRound(view)
  const choosingRoundId = choosing?.round.id ?? null

  const revealRound = useCallback(() => {
    if (choosingRoundId !== null) {
      send({ roundId: choosingRoundId, type: 'host.reveal' })
    }
  }, [choosingRoundId, send])

  useReportRoomActions({
    closeRoom,
    endGame: view !== null && isGameInPlay(view.phase) ? endGame : null,
    leaveSeat: view?.youId == null ? null : leaveSeat,
    playsSound: isSpeaker,
    refusedNickname:
      requestedNickname !== null && error?.code === 'nickname_taken'
        ? requestedNickname
        : null,
    rename: seatedAs === null ? null : renameSeat,
    revealRound: choosing === null ? null : revealRound,
    seatNickname: seatedAs
  })

  // Written before the socket carries it, because the hello is built from
  // storage: the retry is what sends it, and it reads what was just kept.
  const offerHostToken = (hostToken: HostToken) => {
    writeHostToken({ hostToken, roomCode })
    setHasOfferedToken(true)
    retry()
  }

  // A console the wall turned into steps back the moment the host's own screen
  // takes the room again, rather than showing that screen's owner a refusal.
  const cameFromWall = useCameFromWall()
  const navigate = useNavigate()
  const isDisplacedWall =
    cameFromWall &&
    status === 'refused' &&
    error?.code === 'host_already_connected'

  useEffect(() => {
    if (isDisplacedWall) {
      void navigate(wallPathFor(roomCode), { replace: true })
    }
  }, [isDisplacedWall, navigate, roomCode])

  if (status === 'refused') {
    return (
      <main className='host-console-page'>
        <RoomDocumentTitle game={view?.settings.game?.kind ?? null} />
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

  if (view !== null && choosing !== null) {
    const roundDurationMs = roundDurationMsOf(view.settings.game)

    return (
      <main className='host-console-page framed'>
        <RoomDocumentTitle game={view.settings.game?.kind ?? null} />
        <RoundChrome
          players={view.players}
          roundCount={view.settings.roundCount}
          roundIndex={choosing.round.index}
          youId={choosing.youId}
        />
        <div className='card-clock'>
          {roundDurationMs !== null && (
            <RoundProgress
              durationMs={roundDurationMs}
              elapsedMs={view.roundElapsedMs}
            />
          )}
        </div>
        <ChoosingRound
          onAnswer={(answer) =>
            send({ answer, roundId: choosing.round.id, type: 'player.answer' })
          }
          round={choosing.round}
          youId={choosing.youId}
        />
        <div className='notice'>
          {error !== null && (
            <p className='error' role='alert'>
              {translate(protocolErrorKey(error.code))}
            </p>
          )}
          <ClipOffer
            canPlay={canPlay}
            isSpeaker={isSpeaker}
            onUnlockAudio={armAudio}
            refusal={refusal}
            view={view}
          />
        </div>
      </main>
    )
  }

  return (
    <main className='host-console-page'>
      <RoomDocumentTitle game={view?.settings.game?.kind ?? null} />
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
        when somebody says *one more, I'll call Marc*, and the room
        still answers.
      */}
        {view !== null && view.phase !== 'lobby' && (
          <JoinReminder roomCode={roomCode} />
        )}
      </header>

      <RoomStage
        canPlay={canPlay}
        clock={clock}
        controls={{
          isAnswerFolded: cameFromWall,
          isLive,
          onRememberSlateKey: rememberPreparedKey,
          onRemovePlayer: removePlayer,
          onSettingsChange: changeSettings,
          onTakeSeat: takeSeat,
          preferences,
          preparedSlateKeys: preparedKeys,
          send
        }}
        isSpeaker={isSpeaker}
        onUnlockAudio={armAudio}
        refusal={refusal}
        roomCode={roomCode}
        slateWall={slateWall}
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
              slateKeys={preparedSlateKeys}
              slateWall={slateWall}
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
                {/*
                  The reveal's alone, because the reveal is what it holds:
                  under a round in play it was a row of a screen the question
                  and its four tiles could not spare, for a choice the reveal
                  puts back in reach the moment it applies.
                */}
                {view.phase === 'revealed' &&
                  view.settings.game?.kind !== 'slate' && (
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
                  onRememberSlateKey={rememberPreparedKey}
                  onSettingsChange={changeSettings}
                  onTakeSeat={takeSeat}
                  preferences={preferences}
                  preparedSlateKeys={preparedKeys}
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

/**
 * The seated host's four tiles, which take the screen the way a player's do:
 * the header, the footer and the standings fold away for as long as the round
 * runs, and the one control a round in play offers moves into the menu. A seat
 * that arrived after the round opened is refused the round anyway, so it keeps
 * the console's own screen.
 */
const seatedChoosingRound = (
  view: HostRoomView
): { round: RoundView; youId: PlayerId } | null =>
  view.phase === 'playing' &&
  view.settings.mode.kind === 'choice' &&
  view.youId !== null &&
  view.round !== null &&
  !view.round.joinedAfterStart
    ? { round: view.round, youId: view.youId }
    : null
