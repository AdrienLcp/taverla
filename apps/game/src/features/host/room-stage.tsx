import type React from 'react'
import { useState } from 'react'

import type { ClientMessage } from '@taverla/protocol/client-message'
import { roundDurationMsOf } from '@taverla/protocol/game'
import type { PlayerId, RoomCode } from '@taverla/protocol/identifiers'
import type {
  HostRoomView,
  RoomSettings,
  RoundView
} from '@taverla/protocol/room'

import {
  type ClipRefusal,
  isClipUnheard
} from '@taverla/core/blindtest/clip-audio'
import type { HostPreferences } from '@taverla/core/room/host-preferences'
import type { ClockEstimate } from '@taverla/core/time/clock-sync'

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
import { AskedQuestion } from '@/presentation/components/asked-question'
import { Button } from '@/presentation/components/button'
import { Countdown } from '@/presentation/components/countdown'
import { RoomInvitation } from '@/presentation/components/room-invitation'
import {
  RevealHold,
  RoundProgress
} from '@/presentation/components/round-progress'
import { Scoreboard } from '@/presentation/components/scoreboard'
import { useTranslate } from '@/presentation/i18n/i18n-provider'
import { clipRefusalKey } from '@/presentation/i18n/translation'

import { FinalBoard } from './final-board'
import { LobbyStage } from './lobby-stage'
import { ReflexStage } from './reflex-stage'
import { RevealPanel } from './reveal-panel'
import { SlateCorrectionStage, SlateWritingStage } from './slate-stages'
import type { SlateWall } from './use-slate-wall'
import { VerdictPanel } from './verdict-panel'

/** What the console can do to the room from its stage. A wall has none of it. */
export type StageControls = {
  /**
   * The answer is behind a press rather than printed, because this console is
   * the room's own screen, taken over while its host was away.
   */
  isAnswerFolded: boolean
  isLive: boolean
  /** Keeps a key typed mid-sheet for the next sheet this host opens. */
  onRememberSlateKey: (itemIndex: number, key: string) => void
  /** Aimed at the console's own seat too, which is why it is not a bare frame. */
  onRemovePlayer: (playerId: PlayerId) => void
  onSettingsChange: (settings: RoomSettings) => void
  /** Reopens the socket with a name on it, which is what takes the lobby's seat. */
  onTakeSeat: (nickname: string) => void
  /** What this host last left each game set to, for the lobby's picker. */
  preferences: HostPreferences | null
  send: (message: ClientMessage) => boolean
}

type RoomStageProps = {
  /** Whether a press has blessed an audio element on this screen. */
  canPlay: boolean
  clock: ClockEstimate | null
  /** `null` on the wall, which shows the room and changes nothing about it. */
  controls: StageControls | null
  /**
   * This screen plays the clip. A console stops being the speaker while a wall
   * is there, and then owes the room no offer to unmute itself.
   */
  isSpeaker: boolean
  /** The gesture a screen that cannot play a clip has to be offered. */
  onUnlockAudio: () => void
  /** Why the last press did not arm this screen, and `null` while none has failed. */
  refusal: ClipRefusal | null
  roomCode: RoomCode
  slateWall: SlateWall
  view: HostRoomView | null
}

/**
 * The room as the screen everyone reads draws it, phase by phase. The console
 * and the wall render the same stage — one with its hands on it, one without —
 * so what the room reads is the same whichever of them it is looking at.
 */
export const RoomStage: React.FC<RoomStageProps> = ({
  canPlay,
  clock,
  controls,
  isSpeaker,
  onUnlockAudio,
  refusal,
  roomCode,
  slateWall,
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
        <RoomInvitation isUnattended={controls === null} roomCode={roomCode} />
      </div>
    )
  }

  const round = view.round

  // The room's answer, never what this console asked for: a seat can go without
  // this screen deciding it — the host takes it off the roster, or the sweeper
  // gives it up — and a screen still drawing its own answer form owns nothing.
  const isSeated = controls !== null && view.youId !== null

  // A silent round is *visually identical* to one that plays — the clip's
  // progress comes from the server, buzzes work, the reveal lands — so this is
  // the one thing on the speaker that has to be said out loud.
  const clipOffer =
    isSpeaker &&
    isClipUnheard({
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
          onBuzz={(roundId) =>
            controls?.send({ roundId, type: 'player.buzz' }) ?? false
          }
          round={round}
          youId={isSeated ? view.youId : null}
        />
      </div>
    )
  }

  if (view.phase === 'playing' && round?.content.kind === 'slate') {
    return slateWall.isOnWall ? (
      <SlateCorrectionStage controls={controls} view={view} />
    ) : (
      <SlateWritingStage controls={controls} view={view} />
    )
  }

  if (view.phase === 'playing' && round != null) {
    const answerWithRound = (answer: PlayerAnswer): boolean =>
      controls?.send({ answer, roundId: round.id, type: 'player.answer' }) ??
      false

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

  // The board on the screen the room reads, which is where this game is
  // actually played: the room reads it, argues about it, and votes on their own
  // screens.
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

    // The console judges, and has to hold the answer to; the wall only says who
    // has the floor and for how long.
    const judging =
      controls !== null && content !== null && holdsTheAnswer(content)
        ? { content, controls }
        : null

    if (controls !== null && judging === null) {
      return <div className='stage solo' />
    }

    return (
      <div className='stage solo'>
        <VerdictPanel
          buzz={round.activeBuzz}
          clock={clock}
          content={judging?.content ?? null}
          isAnswerFolded={judging?.controls.isAnswerFolded ?? false}
          key={round.activeBuzz.atServerTime}
          nickname={buzzer?.nickname ?? '—'}
          onJudge={
            judging === null
              ? null
              : (verdict) => {
                  judging.controls.send({
                    playerId: buzzerId,
                    roundId: round.id,
                    type: 'host.judge',
                    verdict
                  })
                }
          }
        />
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

  return <LobbyStage controls={controls} roomCode={roomCode} view={view} />
}

/**
 * The round the room is still talking about, which the view stops carrying the
 * moment the next one opens: `openRound` replaces `room.round`, so by the time
 * a countdown is on screen the reveal it interrupted is gone from the snapshot.
 *
 * Held here rather than added to the wire, because it is the screen's own
 * memory of what it drew — the server has nothing to say about a round it has
 * finished with, and a second round on the room view would have to be kept
 * honest through a reload, a takeover and a game change for one screen's sake.
 * A screen that reloads mid-countdown simply gets the number alone, which is
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
