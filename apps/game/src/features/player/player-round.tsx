import type React from 'react'
import { useState } from 'react'
import { Button as ReactAriaButton } from 'react-aria-components'

import type { PlayerRoomView, RoomPhase } from '@taverla/protocol/room'

import { findBuzzBlocker } from '@taverla/core/round/buzz-eligibility'
import type { ClockEstimate } from '@taverla/core/time/clock-sync'

import {
  ChoiceAnswer,
  type PlayerAnswer,
  TypedAnswer
} from '@/features/player/answer-forms'
import { buzzFeedback } from '@/infrastructure/env'
import { Countdown } from '@/presentation/components/countdown'
import { Scoreboard } from '@/presentation/components/scoreboard'
import { useTranslate } from '@/presentation/i18n/i18n-provider'
import { buzzBlockerKey, scoringKey } from '@/presentation/i18n/translation'

import './player-round.sass'

const ROUND_IS_RUNNING = new Set<RoomPhase>(['buzzed', 'countdown', 'playing'])

type PlayerRoundProps = {
  clock: ClockEstimate | null
  /** `false` from the socket means the frame was never written. */
  onAnswer: (answer: PlayerAnswer, roundId: string) => boolean
  /** `false` from the socket means the frame was never written. */
  onBuzz: (roundId: string) => boolean
  view: PlayerRoomView
}

export const PlayerRound: React.FC<PlayerRoundProps> = ({
  clock,
  onAnswer,
  onBuzz,
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
        <p className='paused'>
          {translate('blindtest.buzz.blocked.host_away')}
        </p>
      </section>
    )
  }

  if (view.phase === 'countdown' && round?.audioStartsAt != null) {
    return (
      <section className='player-round centred'>
        <Countdown clock={clock} target={round.audioStartsAt} />
      </section>
    )
  }

  if (view.phase === 'revealed' && round?.revealedTrack != null) {
    const yours = round.awards.find((award) => award.playerId === view.youId)

    return (
      <section className='player-round centred'>
        <p className='framing'>{translate('blindtest.reveal.title')}</p>
        <p className='revealed-title'>{round.revealedTrack.title}</p>
        <p className='revealed-artist'>{round.revealedTrack.artist}</p>
        {yours != null && yours.points > 0 && (
          <p className='you-scored'>
            {translate('blindtest.youScored', { points: yours.points })}
          </p>
        )}
      </section>
    )
  }

  if (view.phase === 'finished') {
    return (
      <section className='player-round centred'>
        <Scoreboard players={view.players} youId={view.youId} />
      </section>
    )
  }

  if (view.phase === 'playing' && view.round !== null) {
    const answerWithRound = (answer: PlayerAnswer): boolean =>
      view.round === null ? false : onAnswer(answer, view.round.id)

    if (view.settings.answerMode === 'choice') {
      return (
        <section className='player-round'>
          <ChoiceAnswer onAnswer={answerWithRound} round={view.round} />
        </section>
      )
    }

    if (view.settings.answerMode === 'typed') {
      return (
        <section className='player-round'>
          <TypedAnswer onAnswer={answerWithRound} round={view.round} />
        </section>
      )
    }
  }

  // A phone waiting in a typed or choice game used to be shown a dead buzzer,
  // which is a promise the round will not keep. The wait is also the only
  // moment nobody is against a clock, so it is where the scoring is explained.
  if (view.settings.answerMode !== 'buzzer') {
    return (
      <section className='player-round centred'>
        <p className='waiting'>
          {translate('blindtest.buzz.blocked.round_not_running')}
        </p>
        <p className='how-it-scores'>
          {translate(scoringKey(view.settings.answerMode))}
        </p>
      </section>
    )
  }

  return <Buzzer onBuzz={onBuzz} view={view} />
}

const Buzzer = ({
  onBuzz,
  view
}: {
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
        {translate('blindtest.buzz.action')}
      </ReactAriaButton>

      <p className='blocker' role='status'>
        {hasFailed
          ? translate('blindtest.buzz.sendFailed')
          : isWon
            ? translate('blindtest.buzz.won')
            : blocker === null
              ? translate('blindtest.buzz.ready')
              : translate(buzzBlockerKey(blocker))}
      </p>

      {view.phase === 'buzzed' && !isWon && <TheirName view={view} />}
    </section>
  )
}

const TheirName = ({ view }: { view: PlayerRoomView }) => {
  const translate = useTranslate()
  const nickname = view.players.find(
    (player) => player.id === view.round?.activeBuzz?.playerId
  )?.nickname

  return nickname === undefined ? null : (
    <p className='their-name'>
      {translate('blindtest.theyBuzzed', { nickname })}
    </p>
  )
}
