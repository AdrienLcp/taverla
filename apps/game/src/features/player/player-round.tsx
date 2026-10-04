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
  hasAnybodyScored,
  standingOf
} from '@taverla/core/scoring/scoreboard'
import {
  type ClockEstimate,
  millisecondsUntil
} from '@taverla/core/time/clock-sync'

import { type PlayerAnswer, TypedAnswer } from '@/features/player/answer-forms'
import { ChoosingRound } from '@/features/player/choosing-round'
import { ReflexBuzzer } from '@/features/player/reflex-buzzer'
import { RoundBoard } from '@/features/player/round-board'
import { RoundClock } from '@/features/player/round-clock'
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
import { EmptySockets } from '@/presentation/components/empty-sockets'
import { FloorClock } from '@/presentation/components/floor-clock'
import { Pawn } from '@/presentation/components/pawn'
import { ReactionBoard } from '@/presentation/components/reaction-board'
import { RoomInvitation } from '@/presentation/components/room-invitation'
import { Scoreboard } from '@/presentation/components/scoreboard'
import { VisuallyHidden } from '@/presentation/components/visually-hidden'
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
      <section className='player-round notice'>
        <NoticeCard title={translate('buzz.blocked.host_away')} />
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
      <section className='player-round lobby'>
        {view.isHostConnected ? (
          <UpNext view={view} />
        ) : (
          <NoticeCard title={translate('buzz.blocked.host_away')} />
        )}
        {/*
          The way in, on the screen of somebody who is already through it. The
          room's code is on the console — which is allowed to be a phone in one
          person's hand, and is exactly the evening where nobody else can read
          it. Between the pitch and the roster rather than under them: it is the
          action this phase is for, and a roster grows.
        */}
        {roomCode !== null && <RoomInvitation roomCode={roomCode} />}

        {/* The seats are a grid counted against the box around them, which a
            container query can only read from an ancestor. */}
        <div className='table'>
          <div className='seats'>
            <Scoreboard
              hasPawns
              label={translate('player.table')}
              players={view.players}
              youId={view.youId}
            />
            <EmptySockets seated={view.players.length} />
          </div>
        </div>
      </section>
    )
  }

  if (view.phase === 'countdown' && round?.startsAt != null) {
    return (
      <section className='player-round notice'>
        <Countdown clock={clock} target={round.startsAt} />
      </section>
    )
  }

  if (view.phase === 'revealed' && round != null) {
    return (
      <section className='player-round revealed'>
        {/* Grouped here rather than placed in the stylesheet, because the wide
            screen lays the two halves side by side and a grid item spanning
            rows it never declared silently resolves back to the first one. */}
        <div className='outcome'>
          <Revealed round={round} view={view} />
          <YourRound round={round} view={view} />
        </div>
        <RoundBoard round={round} view={view} />
        <div className='hold'>
          <RoundClock clock={clock} view={view} />
        </div>
      </section>
    )
  }

  if (view.phase === 'finished') {
    return (
      <section className='player-round finished'>
        <YourPlacing view={view} />
        <Scoreboard
          hasPawns
          isResult
          players={view.players}
          youId={view.youId}
        />
      </section>
    )
  }

  // Below the reveal and the final board on purpose: those are what the round
  // turned out to be, and a player who walked in on it is in the room for them.
  // What it must not be shown is the form, because the server refuses every
  // frame it could send — a field that cannot be submitted is worse than a wait.
  if (round?.joinedAfterStart === true) {
    return (
      <section className='player-round notice'>
        <NoticeCard
          detail={translate('player.midRound.detail')}
          title={translate('player.midRound.title')}
        />
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
        <section className='player-round typed-round'>
          <div className='round-card'>
            <AskedQuestion prompt={prompt} />
            <RoundClock clock={clock} view={view} />
          </div>
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
      <section className='player-round notice'>
        <NoticeCard title={translate('buzz.blocked.round_not_running')} />
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
    return (
      <div className='up-next undecided'>
        <p className='game-name'>{translate('player.choosingGame')}</p>
      </div>
    )
  }

  return (
    <div className='up-next' data-game={game.kind}>
      <p className='game-name'>
        <VisuallyHidden elementType='span'>
          {`${translate('player.upNext')} `}
        </VisuallyHidden>
        {translate(gameNameKey(game.kind))}
      </p>
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
    </div>
  )
}

/**
 * A wait printed on a paper card lying face up on the board: the one thing
 * this screen has to say while nothing on it can be pressed.
 */
const NoticeCard: React.FC<{ detail?: string; title: string }> = ({
  detail,
  title
}) => (
  <div className='notice-card'>
    <p className='notice-title'>{title}</p>
    {detail !== undefined && <p className='notice-detail'>{detail}</p>}
  </div>
)

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
  const points = award?.points ?? 0
  const speedBonus = award?.speedBonus ?? 0
  const standing = standingOf({ players: view.players, youId: view.youId })

  return (
    <div className={`your-round ${points > 0 ? 'scored' : 'missed'}`}>
      <p className='payout'>
        {points > 0 ? translate('round.scored', { points }) : '0'}
      </p>
      <div className='payout-words'>
        {points === 0 && (
          <p className='you-missed'>{translate('round.missed')}</p>
        )}
        {speedBonus > 0 && (
          <p className='speed-bonus'>
            {translate('round.speedBonus', { points: speedBonus })}
          </p>
        )}
        {standing !== null && (
          <p className='standing'>
            {translate('player.standing.ofRoom', {
              count: standing.roomSize,
              rank: standing.rank
            })}
          </p>
        )}
      </div>
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

  const seat = view.players.findIndex((player) => player.id === view.youId)
  const yours = buildScoreboard(view.players).find(
    (entry) => entry.player.id === view.youId
  )

  if (yours === undefined) {
    return null
  }

  return (
    <div className='your-placing'>
      <Pawn seat={Math.max(0, seat)} />
      <p className='your-rank'>
        <VisuallyHidden elementType='span'>
          {`${translate('player.final.placing')} `}
        </VisuallyHidden>
        {translate('player.final.rank', { rank: yours.rank })}
      </p>
      <p className='your-total'>
        <span className='value'>{yours.player.score}</span>{' '}
        {translate('player.points', { points: yours.player.score })}
      </p>
    </div>
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
        The buzzer and the line that belongs to it, grouped so a screen lying
        down can set them beside the question card instead of under it.
      */}
      <div className='press'>
        {/*
            Two objects in one place and never both at once: while the race is
            open this is a button, and for the length of the floor it is the
            holder's pawn and the clock timing them. Swapping rather than
            disabling is what takes `BUZZ` off a piece nobody can press, and it
            takes a dead button out of the tab order on the way.

            `onPressStart`, not `onPress`: a buzzer has to fire the instant the
            thumb lands, and waiting for the release costs tens of milliseconds
            in a race that is decided by exactly that. react-aria normalises it
            across touch, mouse and keyboard, so the keyboard player is not
            penalised.
          */}
        {floorBuzz === null ? (
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
            <span className='word'>{translate('buzz.action')}</span>
          </ReactAriaButton>
        ) : (
          <TakenFloor buzz={floorBuzz} clock={clock} players={view.players} />
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

  // The card the round was played on, turned over: the answer printed on its
  // back, and a track's cover mounted on it beside the words.
  if (track !== null) {
    return (
      <div className='answer-card' data-game='blindtest'>
        {track.coverUrl !== null && (
          <img
            alt=''
            className='cover'
            height={250}
            src={track.coverUrl}
            width={250}
          />
        )}
        <div className='identity'>
          <p
            className='revealed-title'
            style={answerFitting(whatTheRoomNames(track))}
          >
            <VisuallyHidden elementType='span'>
              {`${translate('blindtest.reveal.title')} `}
            </VisuallyHidden>
            {whatTheRoomNames(track)}
          </p>
          <p className='revealed-artist'>{track.artist}</p>
          {cueOf(track) !== null && <p className='note'>{cueOf(track)}</p>}
        </div>
      </div>
    )
  }

  if (question !== null) {
    return (
      <div className='answer-card' data-game='quiz'>
        <div className='identity'>
          <p className='revealed-title' style={answerFitting(question.answer)}>
            <VisuallyHidden elementType='span'>
              {`${translate('quiz.reveal.title')} `}
            </VisuallyHidden>
            {question.answer}
          </p>
          {question.note !== null && <p className='note'>{question.note}</p>}
        </div>
      </div>
    )
  }

  return null
}

/**
 * The floor, where the buzzer stood: the pawn of whoever holds it stood up
 * oversize, the way the console draws it, with the clock on a token beside it.
 * A buzzer whose seat has gone leaves no pawn to stand, and the token alone.
 */
const TakenFloor: React.FC<{
  buzz: ActiveBuzz
  clock: ClockEstimate | null
  players: PlayerRoomView['players']
}> = ({ buzz, clock, players }) => {
  const seat = players.findIndex((player) => player.id === buzz.playerId)

  return (
    <div className='taken-floor'>
      {seat !== -1 && <Pawn seat={seat} />}
      <FloorDial buzz={buzz} clock={clock} />
    </div>
  )
}

/**
 * The token for the length of the floor, when the buzzer has stopped being one:
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
