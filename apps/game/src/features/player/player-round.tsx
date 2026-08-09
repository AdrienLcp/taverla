import type React from 'react'
import { useState } from 'react'
import { Button as ReactAriaButton } from 'react-aria-components'

import type { PlayerRoomView } from '@taverla/protocol/room'

import { findBuzzBlocker } from '@taverla/core/round/buzz-eligibility'
import type { ClockEstimate } from '@taverla/core/time/clock-sync'

import { buzzFeedback } from '@/infrastructure/env'
import { Countdown } from '@/presentation/components/countdown'
import { Scoreboard } from '@/presentation/components/scoreboard'
import { useTranslate } from '@/presentation/i18n/i18n-provider'
import { buzzBlockerKey } from '@/presentation/i18n/translation'

import './player-round.sass'

type PlayerRoundProps = {
  clock: ClockEstimate | null
  /** `false` from the socket means the frame was never written. */
  onBuzz: (roundId: string) => boolean
  view: PlayerRoomView
}

export const PlayerRound: React.FC<PlayerRoundProps> = ({
  clock,
  onBuzz,
  view
}) => {
  const translate = useTranslate()
  const round = view.round

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
        <p className='revealed-title'>{round.revealedTrack.title}</p>
        <p className='revealed-artist'>{round.revealedTrack.artist}</p>
        <p className='framing'>{translate('blindtest.reveal.title')}</p>
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
