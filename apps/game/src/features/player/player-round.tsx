import type React from 'react'
import { useState } from 'react'
import { Button as ReactAriaButton } from 'react-aria-components'

import type {
  ActiveBuzz,
  PlayerRoomView,
  RoomPhase,
  RoundView
} from '@taverla/protocol/room'

import { cueOf, whatTheRoomNames } from '@taverla/core/blindtest/typed-answer'
import { isShelvedGame } from '@taverla/core/room/shelved-game'
import {
  type BuzzBlocker,
  findBuzzBlocker
} from '@taverla/core/round/buzz-eligibility'
import {
  buildScoreboard,
  hasAnybodyScored
} from '@taverla/core/scoring/scoreboard'
import {
  type ClockEstimate,
  millisecondsUntil
} from '@taverla/core/time/clock-sync'

import { type PlayerAnswer, TypedAnswer } from '@/features/player/answer-forms'
import { ChoosingRound } from '@/features/player/choosing-round'
import { ReflexBuzzer } from '@/features/player/reflex-buzzer'
import { RoundBoard } from '@/features/player/round-board'
import {
  SlateOnTheWall,
  SlateSheet,
  SlateWholeSheet
} from '@/features/player/slate-sheet'
import { answerFitting } from '@/helpers/answer-fitting'
import {
  blindtestContent,
  quizContent,
  reflexContent
} from '@/helpers/round-content'
import { slateLabelsOf } from '@/helpers/slate-labels'
import { buzzFeedback } from '@/infrastructure/browser'
import { nowMs } from '@/infrastructure/clock'
import { useRoomCodeParam } from '@/infrastructure/router/navigation'
import { AskedQuestion } from '@/presentation/components/asked-question'
import { Countdown } from '@/presentation/components/countdown'
import { FloorClock } from '@/presentation/components/floor-clock'
import { ReactionBoard } from '@/presentation/components/reaction-board'
import { RoomInvitation } from '@/presentation/components/room-invitation'
import { Scoreboard } from '@/presentation/components/scoreboard'
import {
  floorOutcome,
  reflexOutcome,
  useBuzzOutcome
} from '@/presentation/haptics/buzz-outcome'
import { useTranslate } from '@/presentation/i18n/i18n-provider'
import {
  buzzBlockerKey,
  gameNameKey,
  scoringKey,
  type Translate
} from '@/presentation/i18n/translation'

import './player-round.sass'

const ROUND_IS_RUNNING = new Set<RoomPhase>(['buzzed', 'countdown', 'playing'])

type PlayerRoundProps = {
  clock: ClockEstimate | null
  /** `false` from the socket means the frame was never written. */
  onAnswer: (answer: PlayerAnswer, roundId: string) => boolean
  /** `false` from the socket means the frame was never written. */
  onBuzz: (roundId: string) => boolean
  /** `false` from the socket means the frame was never written. */
  onWriteLine: (itemIndex: number, answer: string, roundId: string) => boolean
  view: PlayerRoomView
}

export const PlayerRound: React.FC<PlayerRoundProps> = ({
  clock,
  onAnswer,
  onBuzz,
  onWriteLine,
  view
}) => {
  const translate = useTranslate()
  const roomCode = useRoomCodeParam()
  const round = view.round

  useBuzzOutcome(reflexOutcome({ round, youId: view.youId }))

  // Ahead of every mode, because the server has frozen the round and none of
  // the three screens below would say why. The buzzer carries its own reason
  // through `findBuzzBlocker`; a grid of choices and a pair of text fields have
  // nowhere to put one, and would sit there looking answerable.
  // A sheet is the exception: a line moves nothing along, so the server keeps
  // taking them while the console is away, and the pen stays in the hand.
  const isWritingASheet =
    view.phase === 'playing' && round?.content.kind === 'slate'

  if (
    !view.isHostConnected &&
    !isWritingASheet &&
    ROUND_IS_RUNNING.has(view.phase)
  ) {
    return (
      <section className='player-round centred'>
        <p className='paused'>{translate('buzz.blocked.host_away')}</p>
      </section>
    )
  }

  // The room fills up while the table decides, so this is where a player's
  // screen waits longest — and the only moment nobody is against a clock, which
  // is why it is where what the evening pays is explained and where the room
  // the player walked into is drawn. Nobody has scored yet, so the board is a
  // column of names: no rank, no score, and the one screen with the space to
  // spend on it.
  //
  // The host being away replaces the pitch rather than the screen. A lobby has
  // nothing to block — who is at the table stays true while the console is
  // gone — but *the innkeeper is choosing a game* would be a lie about the one
  // thing the player is waiting on.
  if (view.phase === 'lobby') {
    return (
      <section className='player-round centred lobby'>
        {/* Grouped here for the reason the reveal below groups its own half,
            and for one more: above the split the pitch shares a column with the
            roster, and three loose paragraphs would be three grid items. */}
        <div className='pitch'>
          {view.isHostConnected ? (
            <UpNext view={view} />
          ) : (
            <p className='paused'>{translate('buzz.blocked.host_away')}</p>
          )}
        </div>
        {/*
          The way in, on the screen of somebody who is already through it. The
          room's code is on the console — which is allowed to be a phone in one
          person's hand, and is exactly the evening where nobody else can read
          it. Between the pitch and the roster rather than under them: it is the
          action this phase is for, and a roster grows.
        */}
        {roomCode !== null && <RoomInvitation roomCode={roomCode} />}

        <Scoreboard
          label={translate('player.table')}
          players={view.players}
          youId={view.youId}
        />
      </section>
    )
  }

  if (view.phase === 'countdown' && round?.startsAt != null) {
    return (
      <section className='player-round centred'>
        <Countdown clock={clock} target={round.startsAt} />
      </section>
    )
  }

  if (view.phase === 'revealed' && round != null) {
    return (
      <section className='player-round centred revealed'>
        {/* Grouped here rather than placed in the stylesheet, because the wide
            screen lays the two halves side by side and a grid item spanning
            rows it never declared silently resolves back to the first one. */}
        <div className='outcome'>
          <Revealed round={round} view={view} />
          <YourRound round={round} view={view} />
        </div>
        <RoundBoard round={round} view={view} />
      </section>
    )
  }

  if (view.phase === 'finished') {
    return (
      <section className='player-round centred finished'>
        <YourPlacing view={view} />
        <Scoreboard isResult players={view.players} youId={view.youId} />
      </section>
    )
  }

  // Below the reveal and the final board on purpose: those are what the round
  // turned out to be, and a player who walked in on it is in the room for them.
  // What it must not be shown is the form, because the server refuses every
  // frame it could send — a field that cannot be submitted is worse than a wait.
  if (round?.joinedAfterStart === true) {
    return (
      <section className='player-round centred'>
        <p className='next-round'>{translate('player.midRound.title')}</p>
        <p className='seat-kept'>{translate('player.midRound.detail')}</p>
      </section>
    )
  }

  if (view.phase === 'playing' && round?.content.kind === 'slate') {
    const labels = slateLabelsOf(view.settings)
    const hasOpenItem = round.content.itemStates.includes('open')

    return (
      <section className='player-round'>
        <SlateOnTheWall isCompact={hasOpenItem} labels={labels} round={round} />
        {hasOpenItem && (
          <SlateSheet
            labels={labels}
            onWrite={(itemIndex, answer) =>
              onWriteLine(itemIndex, answer, round.id)
            }
            round={round}
          />
        )}
        {round.content.currentItemIndex !== null && (
          <SlateWholeSheet labels={labels} round={round} />
        )}
      </section>
    )
  }

  if (view.phase === 'playing' && view.round !== null) {
    const round = view.round

    const answerWithRound = (answer: PlayerAnswer): boolean =>
      onAnswer(answer, round.id)

    // Here rather than inside the forms: the host console renders those too
    // when its owner has taken a seat, and it is already showing the question.
    const prompt = quizContent(round)?.prompt ?? null

    if (round.content.kind === 'reflex') {
      return (
        <ReflexBuzzer
          clock={clock}
          onBuzz={onBuzz}
          round={round}
          youId={view.youId}
        />
      )
    }

    if (view.settings.mode.kind === 'choice') {
      return (
        <ChoosingRound
          onAnswer={answerWithRound}
          round={round}
          youId={view.youId}
        />
      )
    }

    if (view.settings.mode.kind === 'typed') {
      return (
        <section className='player-round'>
          <AskedQuestion prompt={prompt} />
          <TypedAnswer
            // The player is never sent the track, so the settings are the
            // only place it can read what the round is asking for.
            asksForAFilm={
              view.settings.game?.kind === 'blindtest' &&
              view.settings.game.source.kind === 'film'
            }
            key={round.id}
            onAnswer={answerWithRound}
            round={round}
            verdict={view.yourVerdict}
          />
        </section>
      )
    }
  }

  // A player's screen between two rounds in a typed or choice game used to be
  // shown a dead buzzer, which is a promise the round will not keep.
  if (view.settings.mode.kind !== 'buzzer') {
    return (
      <section className='player-round centred'>
        <p className='waiting'>{translate('buzz.blocked.round_not_running')}</p>
      </section>
    )
  }

  return <Buzzer clock={clock} onBuzz={onBuzz} view={view} />
}

/**
 * What this player's screen is about to play, which is the honest answer to a
 * lobby: the room is opened before the table decides, so "the host is choosing"
 * is a state and not a gap. Once they have, the game names itself and says what
 * it pays — the same pitch the shelf shows, on the screen the player is
 * holding.
 */
const UpNext: React.FC<{ view: PlayerRoomView }> = ({ view }) => {
  const translate = useTranslate()
  const game = view.settings.game

  if (game === null || !isShelvedGame(game.kind)) {
    return <p className='waiting'>{translate('player.choosingGame')}</p>
  }

  return (
    <>
      <p className='framing'>{translate('player.upNext')}</p>
      <p className='up-next'>{translate(gameNameKey(game.kind))}</p>
      <p className='how-it-scores'>
        {translate(
          scoringKey({
            answerMode: view.settings.mode.kind,
            asksForAFilm:
              game.kind === 'blindtest' && game.source.kind === 'film',
            game: game.kind
          })
        )}
      </p>
    </>
  )
}

/**
 * What the round did to this player — the moment, above the board that holds
 * the room's version of the same thing. It is what the eye lands on first and
 * the only number here somebody reads without looking for it, so it stays the
 * loudest thing on the screen and says nothing the row below repeats.
 *
 * It renders whether or not they gained, because *nothing* is a result too —
 * a screen that only appears for the ones who scored leaves everybody else to
 * infer from an absence whether the round was even scored. The two halves are
 * sized against that: a gain is the loudest thing on the screen, a miss is a
 * quiet line, and the ink says which without a colour saying *wrong*.
 *
 * Who there is to catch used to be carried here as a line of prose. `RoundBoard`
 * says it by name, by points and for everybody rather than for the one player
 * above, so the line is gone rather than printed twice.
 */
const YourRound: React.FC<{
  round: RoundView
  view: PlayerRoomView
}> = ({ round, view }) => {
  const translate = useTranslate()
  const award = round.awards.find((entry) => entry.playerId === view.youId)

  return (
    <div className='your-round'>
      {award != null && award.points > 0 ? (
        <>
          <p className='you-scored'>
            {translate('round.scored', { points: award.points })}
          </p>
          {award.speedBonus > 0 && (
            <p className='speed-bonus'>
              {translate('round.speedBonus', { points: award.speedBonus })}
            </p>
          )}
        </>
      ) : (
        <p className='you-missed'>{translate('round.missed')}</p>
      )}
    </div>
  )
}

/**
 * Where this player finished, which the console only ever says for the winner.
 * Ties share a place, the way the board itself ranks them — a room of two on
 * the same score reads "1st" on both players' screens, and `host.final.tied` is
 * already saying so across the room.
 */
const YourPlacing: React.FC<{ view: PlayerRoomView }> = ({ view }) => {
  const translate = useTranslate()

  if (!hasAnybodyScored(view.players)) {
    return null
  }

  const yours = buildScoreboard(view.players).find(
    (entry) => entry.player.id === view.youId
  )

  if (yours === undefined) {
    return null
  }

  return (
    <>
      <p className='framing'>{translate('player.final.placing')}</p>
      <p className='your-rank'>
        {translate('player.final.rank', { rank: yours.rank })}
      </p>
    </>
  )
}

const Buzzer: React.FC<{
  clock: ClockEstimate | null
  onBuzz: (roundId: string) => boolean
  view: PlayerRoomView
}> = ({ clock, onBuzz, view }) => {
  const translate = useTranslate()
  const [hasFailed, setHasFailed] = useState(false)
  const [claimedRoundId, setClaimedRoundId] = useState<string | null>(null)

  const blocker = findBuzzBlocker(view)
  const roundId = view.round?.id ?? null

  // The round trip is 20–80 ms and a button that waits for the server to agree
  // feels broken, so the press is believed until the next snapshot either
  // confirms it or takes it back.
  const isClaimed = claimedRoundId === roundId && roundId !== null
  const buzz = view.round?.activeBuzz ?? null
  const isWon = buzz?.playerId === view.youId

  useBuzzOutcome(
    floorOutcome({ buzz, hasPressed: isClaimed, youId: view.youId })
  )

  const line = statusLine({ blocker, hasFailed, isWon, translate, view })

  // The floor is the room's and not the buzzing player's, so this is read off
  // the phase: every screen waits the same window out, the ones that never
  // entered the race included.
  const floorBuzz = view.phase === 'buzzed' ? buzz : null

  return (
    <section className='player-round buzzer-area'>
      <AskedQuestion prompt={quizContent(view.round)?.prompt ?? null} />
      {/*
        The circle and the two lines that belong to it, grouped so a wide screen
        can set them beside the question instead of under it — the reveal's own
        move, for the reveal's own reason: a grid item told to span rows nobody
        declared resolves back to the first one, so the grouping has to be in
        the markup. Below the split it is one child of a column and nothing
        about the spacing changes.
      */}
      <div className='press'>
        {/*
          Two objects in one place and never both at once: while the race is
          open this is a button, and for the length of the floor it is the dial
          timing it. Swapping rather than disabling is what takes `BUZZ` off a
          circle nobody can press — a control still naming an action it refuses
          was the one thing on this screen saying something untrue — and it
          takes a dead button out of the tab order on the way.
        */}
        {floorBuzz === null ? (
          /*
            `onPressStart`, not `onPress`: a buzzer has to fire the instant the
            thumb lands, and waiting for the release costs tens of milliseconds
            in a race that is decided by exactly that. react-aria normalises it
            across touch, mouse and keyboard, so the keyboard player is not
            penalised.
          */
          <ReactAriaButton
            className={`buzzer ${isClaimed || isWon ? 'claimed' : ''}`}
            isDisabled={blocker !== null || roundId === null}
            onPressStart={() => {
              if (roundId === null) {
                return
              }

              setClaimedRoundId(roundId)
              buzzFeedback('press')
              setHasFailed(!onBuzz(roundId))
            }}
          >
            {/*
              A box of its own, because the circle has to be the container the
              word is measured against and a container cannot be asked about
              its own width. It is what keeps `BUZZ` inside the ink now that a
              question can take height from the circle.
            */}
            <span className='word'>{translate('buzz.action')}</span>
          </ReactAriaButton>
        ) : (
          <FloorDial buzz={floorBuzz} clock={clock} />
        )}

        <p className={`blocker ${line.isFloor ? 'floor' : ''}`} role='status'>
          {line.text}
        </p>
      </div>
    </section>
  )
}

/**
 * What the round turned out to be, on the player's screen — and `null` for a
 * game whose question the room owns, because a charade has no answer to print.
 * What that game's reveal is instead lands under this: the scoreline, which is
 * what a reveal *is* where the room owns the question.
 *
 * The cover is the product's only real image and this is the one moment in the
 * loop when nobody is racing, so it goes where the eye lands first. It is drawn
 * only when there is one, where the room's screen keeps an empty block: that
 * panel is two columns and needs the column held, and this is a stack where a
 * reserved box for an image that will never arrive is a hole in the screen.
 */
const Revealed: React.FC<{
  round: RoundView
  view: PlayerRoomView
}> = ({ round, view }) => {
  const translate = useTranslate()
  const track = blindtestContent(round)?.revealedTrack ?? null
  const question = quizContent(round)?.revealedQuestion ?? null
  // The times, which a player reads for the same reason the room does: this is
  // the one game whose reveal is not an answer, so the finishing order is what
  // there is to know — and everyone's own number is on it.
  if (reflexContent(round) !== null) {
    return <ReactionBoard players={view.players} round={round} />
  }

  if (track !== null) {
    return (
      <>
        {track.coverUrl !== null && (
          <img
            alt=''
            className='cover'
            height={250}
            src={track.coverUrl}
            width={250}
          />
        )}
        <p className='framing'>{translate('blindtest.reveal.title')}</p>
        <p
          className='revealed-title'
          style={answerFitting(whatTheRoomNames(track))}
        >
          {whatTheRoomNames(track)}
        </p>
        <p className='revealed-artist'>{track.artist}</p>
        {cueOf(track) !== null && <p className='note'>{cueOf(track)}</p>}
      </>
    )
  }

  if (question !== null) {
    return (
      <>
        <p className='framing'>{translate('quiz.reveal.title')}</p>
        <p className='revealed-title' style={answerFitting(question.answer)}>
          {question.answer}
        </p>
        {question.note !== null && <p className='note'>{question.note}</p>}
      </>
    )
  }

  return null
}

/**
 * The circle for the length of the floor, when it has stopped being a button:
 * the ring it already had becomes the window, and the number the whole room is
 * waiting on goes inside it. Three objects were stacked here — a dead button, a
 * name and a number — and only two of them were the phase.
 *
 * **The ring drains where there is a window and stands still where there is
 * not**, which is the duality `FloorClock` already reads from either end: a
 * host judging by hand has set no deadline, so there is no fraction to draw
 * and the number counts up inside a ring that is only the object's own edge.
 *
 * Drained by a CSS animation off the server's deadline and re-keyed on each
 * snapshot, because the round's bar settled all of that already — see
 * `RoundProgress`. `nowMs()` in the render body is the bargain `RevealHold`
 * makes for the same reason: the reading is taken once per snapshot and the
 * animation carries it in between.
 */
const FloorDial: React.FC<{
  buzz: ActiveBuzz
  clock: ClockEstimate | null
}> = ({ buzz, clock }) => {
  const windowMs =
    buzz.expiresAt === null ? null : buzz.expiresAt - buzz.atServerTime
  const remainingMs =
    buzz.expiresAt === null
      ? null
      : millisecondsUntil(clock, buzz.expiresAt, nowMs())

  return (
    <div className='floor-dial'>
      {/*
        Both arcs are one circle's geometry rather than a border and an overlay
        that would have to be kept concentric at every diameter — and the
        stroke is in the viewBox's own units, which makes it a constant share
        of the dial the way a row is a multiple of its own type.
      */}
      <svg aria-hidden='true' className='ring' viewBox='0 0 100 100'>
        <circle className='track' cx='50' cy='50' r='47' />
        {remainingMs !== null && windowMs !== null && windowMs > 0 && (
          <circle
            className='left'
            cx='50'
            cy='50'
            key={remainingMs}
            pathLength='1'
            r='47'
            style={{
              '--drain-duration': `${remainingMs}ms`,
              '--drained': (1 - Math.min(1, remainingMs / windowMs)).toFixed(3)
            }}
          />
        )}
      </svg>
      <FloorClock buzz={buzz} clock={clock} />
    </div>
  )
}

/**
 * The one line under the buzzer, and which of two things it is. Most of what it
 * says is a *reason the control is dead* — that is what `--ink-muted` at
 * `caption` is for, and three of these are exactly that. The floor's own line
 * is not: *it is yours* and *who took it* are what the phase **is**, on the
 * screen the player is sure to have and the one they must act on now. The
 * console bills the same fact as an `h2` in `billboard` and says why — the size
 * a host reads while looking up at the room; this screen drew it at 16px in the
 * ink reserved for what you cannot do.
 *
 * Folding the name into this slot is also what stops the room being told twice:
 * `buzz.blocked.someone_else_buzzed` and `buzz.theyBuzzed` are one fact twenty
 * pixels apart at one size, and the named one is strictly the better of them.
 * The anonymous one survives where it is not a duplicate — a buzzer whose seat
 * has gone leaves no nickname to name.
 */
const statusLine = ({
  blocker,
  hasFailed,
  isWon,
  translate,
  view
}: {
  blocker: BuzzBlocker | null
  hasFailed: boolean
  isWon: boolean
  translate: Translate
  view: PlayerRoomView
}): { isFloor: boolean; text: string } => {
  if (hasFailed) {
    return { isFloor: false, text: translate('buzz.sendFailed') }
  }

  if (isWon) {
    return { isFloor: true, text: translate('buzz.won') }
  }

  const nickname = view.players.find(
    (player) => player.id === view.round?.activeBuzz?.playerId
  )?.nickname

  if (view.phase === 'buzzed' && nickname !== undefined) {
    return {
      isFloor: true,
      text: translate('buzz.theyBuzzed', { nickname })
    }
  }

  return {
    isFloor: false,
    text:
      blocker === null
        ? translate('buzz.ready')
        : translate(buzzBlockerKey(blocker))
  }
}
