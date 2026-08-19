import type React from 'react'
import { useState } from 'react'
import { Button as ReactAriaButton } from 'react-aria-components'

import type { ProtocolErrorCode } from '@taverla/protocol/error-code'
import type {
  PlayerRoomView,
  RoomPhase,
  RoundView
} from '@taverla/protocol/room'

import { cueOf, whatTheRoomNames } from '@taverla/core/blindtest/typed-answer'
import { isShelvedGame } from '@taverla/core/room/shelved-game'
import { findBuzzBlocker } from '@taverla/core/round/buzz-eligibility'
import {
  buildScoreboard,
  hasAnybodyScored
} from '@taverla/core/scoring/scoreboard'
import type { ClockEstimate } from '@taverla/core/time/clock-sync'

import {
  ChoiceAnswer,
  type PlayerAnswer,
  TypedAnswer
} from '@/features/player/answer-forms'
import { LieForm, VoteBoard } from '@/features/player/lefake-forms'
import { ReflexBuzzer } from '@/features/player/reflex-buzzer'
import { RoundBoard } from '@/features/player/round-board'
import {
  blindtestContent,
  lefakeContent,
  quizContent,
  reflexContent
} from '@/helpers/round-content'
import { buzzFeedback } from '@/infrastructure/env'
import { AskedQuestion } from '@/presentation/components/asked-question'
import { Countdown } from '@/presentation/components/countdown'
import { FloorClock } from '@/presentation/components/floor-clock'
import { ReactionBoard } from '@/presentation/components/reaction-board'
import { RevealedLieBoard } from '@/presentation/components/revealed-lie-board'
import { Scoreboard } from '@/presentation/components/scoreboard'
import { useTranslate } from '@/presentation/i18n/i18n-provider'
import {
  buzzBlockerKey,
  gameNameKey,
  scoringKey
} from '@/presentation/i18n/translation'

import './player-round.sass'

const ROUND_IS_RUNNING = new Set<RoomPhase>([
  'buzzed',
  'countdown',
  'playing',
  'voting'
])

type PlayerRoundProps = {
  clock: ClockEstimate | null
  /**
   * The last refusal the socket carried. Only the two Le Fake forms read it: a
   * buzz says why it is blocked through `findBuzzBlocker`, and a graded answer
   * cannot be refused for anything the player could act on.
   */
  error: ProtocolErrorCode | null
  /** `false` from the socket means the frame was never written. */
  onAnswer: (answer: PlayerAnswer, roundId: string) => boolean
  /** `false` from the socket means the frame was never written. */
  onBuzz: (roundId: string) => boolean
  /** `false` from the socket means the frame was never written. */
  onSubmitLie: (lie: string, roundId: string) => boolean
  /** `false` from the socket means the frame was never written. */
  onVote: (candidateId: string, roundId: string) => boolean
  view: PlayerRoomView
}

export const PlayerRound: React.FC<PlayerRoundProps> = ({
  clock,
  error,
  onAnswer,
  onBuzz,
  onSubmitLie,
  onVote,
  view
}) => {
  const translate = useTranslate()
  const round = view.round

  // Ahead of every mode, because the server has frozen the round and none of
  // the three screens below would say why. The buzzer carries its own reason
  // through `findBuzzBlocker`; a grid of choices and a pair of text fields have
  // nowhere to put one, and would sit there looking answerable.
  if (!view.isHostConnected && ROUND_IS_RUNNING.has(view.phase)) {
    return (
      <section className='player-round centred'>
        <p className='paused'>{translate('buzz.blocked.host_away')}</p>
      </section>
    )
  }

  // The room fills up while the table decides, so this is where a phone waits
  // longest — and the only moment nobody is against a clock, which is why it is
  // where what the evening pays is explained.
  if (view.phase === 'lobby') {
    return (
      <section className='player-round centred'>
        <UpNext view={view} />
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
      <section className='player-round centred'>
        <YourPlacing view={view} />
        <Scoreboard players={view.players} youId={view.youId} />
      </section>
    )
  }

  // Below the reveal and the final board on purpose: those are what the round
  // turned out to be, and a phone that walked in on it is in the room for them.
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

  if (view.phase === 'voting' && view.round !== null) {
    const round = view.round

    return (
      <section className='player-round'>
        <AskedQuestion prompt={lefakeContent(round)?.prompt ?? null} />
        <VoteBoard
          error={error}
          onVote={(candidateId) => onVote(candidateId, round.id)}
          round={round}
          youId={view.youId}
        />
      </section>
    )
  }

  if (view.phase === 'playing' && view.round !== null) {
    const round = view.round

    const answerWithRound = (answer: PlayerAnswer): boolean =>
      onAnswer(answer, round.id)

    // Here rather than inside the forms: the host console renders those too
    // when its owner has taken a seat, and it is already showing the question.
    const prompt =
      quizContent(round)?.prompt ?? lefakeContent(round)?.prompt ?? null

    if (round.content.kind === 'lefake') {
      return (
        <section className='player-round'>
          <AskedQuestion prompt={prompt} />
          <LieForm
            error={error}
            key={round.id}
            onSubmitLie={(lie) => onSubmitLie(lie, round.id)}
            round={round}
            youId={view.youId}
          />
        </section>
      )
    }

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
        <section className='player-round'>
          <AskedQuestion prompt={prompt} />
          <ChoiceAnswer
            key={round.id}
            onAnswer={answerWithRound}
            round={round}
            youId={view.youId}
          />
        </section>
      )
    }

    if (view.settings.mode.kind === 'typed') {
      return (
        <section className='player-round'>
          <AskedQuestion prompt={prompt} />
          <TypedAnswer
            // The phone is never sent the track, so the settings are the only
            // place it can read what the round is asking for.
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

  // A phone between two rounds in a typed or choice game used to be shown a
  // dead buzzer, which is a promise the round will not keep.
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
 * What this phone is about to play, which is the honest answer to a lobby: the
 * room is opened before the table decides, so "the host is choosing" is a state
 * and not a gap. Once they have, the game names itself and says what it pays —
 * the same pitch the shelf shows, on the screen the player is holding.
 */
const UpNext = ({ view }: { view: PlayerRoomView }) => {
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
const YourRound = ({
  round,
  view
}: {
  round: RoundView
  view: PlayerRoomView
}) => {
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
 * Where this phone finished, which the big screen only ever says for the
 * winner. Ties share a place, the way the board itself ranks them — a room of
 * two on the same score reads "1st" on both phones, and `host.final.tie` is
 * already saying so across the room.
 */
const YourPlacing = ({ view }: { view: PlayerRoomView }) => {
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

const Buzzer = ({
  clock,
  onBuzz,
  view
}: {
  clock: ClockEstimate | null
  onBuzz: (roundId: string) => boolean
  view: PlayerRoomView
}) => {
  const translate = useTranslate()
  const [hasFailed, setHasFailed] = useState(false)
  const [claimedRoundId, setClaimedRoundId] = useState<string | null>(null)

  const blocker = findBuzzBlocker(view)
  const roundId = view.round?.id ?? null

  // The round trip is 20–80 ms and a button that waits for the server to agree
  // feels broken, so the press is believed until the next snapshot either
  // confirms it or takes it back.
  const isClaimed = claimedRoundId === roundId && roundId !== null
  const isWon = view.round?.activeBuzz?.playerId === view.youId

  return (
    <section className='player-round buzzer-area'>
      <AskedQuestion prompt={quizContent(view.round)?.prompt ?? null} />
      {/*
        `onPressStart`, not `onPress`: a buzzer has to fire the instant the
        thumb lands, and waiting for the release costs tens of milliseconds in a
        race that is decided by exactly that. react-aria normalises it across
        touch, mouse and keyboard, so the keyboard player is not penalised.
      */}
      <ReactAriaButton
        className={`buzzer ${isClaimed || isWon ? 'claimed' : ''}`}
        isDisabled={blocker !== null || roundId === null}
        onPressStart={() => {
          if (roundId === null) {
            return
          }

          setClaimedRoundId(roundId)
          buzzFeedback()
          setHasFailed(!onBuzz(roundId))
        }}
      >
        {translate('buzz.action')}
      </ReactAriaButton>

      {isWon && view.round?.activeBuzz != null && (
        <FloorClock buzz={view.round.activeBuzz} clock={clock} />
      )}

      <p className='blocker' role='status'>
        {hasFailed
          ? translate('buzz.sendFailed')
          : isWon
            ? translate('buzz.won')
            : blocker === null
              ? translate('buzz.ready')
              : translate(buzzBlockerKey(blocker))}
      </p>

      {view.phase === 'buzzed' && !isWon && <TheirName view={view} />}
    </section>
  )
}

/**
 * What the round turned out to be, on the phone — and `null` for a game whose
 * question the room owns, because a charade has no answer to print. What that
 * game's reveal is instead lands under this: the scoreline, which is what a
 * reveal *is* where the room owns the question.
 *
 * The cover is the product's only real image and this is the one moment in the
 * loop when nobody is racing, so it goes where the eye lands first. It is drawn
 * only when there is one, where the room's screen keeps an empty block: that
 * panel is two columns and needs the column held, and this is a stack where a
 * reserved box for an image that will never arrive is a hole in the screen.
 */
const Revealed = ({
  round,
  view
}: {
  round: RoundView
  view: PlayerRoomView
}) => {
  const translate = useTranslate()
  const track = blindtestContent(round)?.revealedTrack ?? null
  const question = quizContent(round)?.revealedQuestion ?? null
  const lieBoard = lefakeContent(round)?.revealedBoard ?? null

  if (lieBoard !== null) {
    return <RevealedLieBoard board={lieBoard} players={view.players} />
  }

  // The times, which the phone reads for the same reason the room does: this is
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
        <p className='revealed-title'>{whatTheRoomNames(track)}</p>
        <p className='revealed-artist'>{track.artist}</p>
        {cueOf(track) !== null && <p className='note'>{cueOf(track)}</p>}
      </>
    )
  }

  if (question !== null) {
    return (
      <>
        <p className='framing'>{translate('quiz.reveal.title')}</p>
        <p className='revealed-title'>{question.answer}</p>
        {question.note !== null && <p className='note'>{question.note}</p>}
      </>
    )
  }

  return null
}

const TheirName = ({ view }: { view: PlayerRoomView }) => {
  const translate = useTranslate()
  const nickname = view.players.find(
    (player) => player.id === view.round?.activeBuzz?.playerId
  )?.nickname

  return nickname === undefined ? null : (
    <p className='their-name'>{translate('buzz.theyBuzzed', { nickname })}</p>
  )
}
