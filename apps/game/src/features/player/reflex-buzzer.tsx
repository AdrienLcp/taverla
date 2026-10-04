import type React from 'react'
import { useState } from 'react'
import { Button as ReactAriaButton } from 'react-aria-components'

import type { PlayerId } from '@taverla/protocol/identifiers'
import type { RoundView } from '@taverla/protocol/room'

import { reactionMsOf } from '@taverla/core/reflex/reaction'
import type { ClockEstimate } from '@taverla/core/time/clock-sync'

import { reflexContent } from '@/helpers/round-content'
import { buzzFeedback } from '@/infrastructure/browser'
import { useTranslate } from '@/presentation/i18n/i18n-provider'
import { useFlipField } from '@/presentation/theme/use-flip-field'

import './reflex-buzzer.sass'

type ReflexBuzzerProps = {
  clock: ClockEstimate | null
  /** `false` from the socket means the frame was never written. */
  onBuzz: (roundId: string) => boolean
  round: RoundView
  youId: PlayerId
}

/**
 * The player's screen during a heat, and three screens rather than one.
 *
 * The button is live throughout the wait on purpose: going early is a move this
 * game allows and then charges for, so a player who jumps must land on a
 * *press* and be refused by the server — a control disabled until the flip
 * would make the false start unreachable, and the floor under `flipsAt`
 * pointless.
 */
export const ReflexBuzzer: React.FC<ReflexBuzzerProps> = ({
  clock,
  onBuzz,
  round,
  youId
}) => {
  const translate = useTranslate()
  const [claimedRoundId, setClaimedRoundId] = useState<string | null>(null)

  const content = reflexContent(round)
  const hasFlipped = useFlipField({ clock, flipsAt: content?.flipsAt ?? null })

  // In this game a lockout has exactly one cause, which is what lets the
  // player's screen name it instead of saying "you are out" and leaving them
  // to work out why.
  if (round.lockedOutPlayerIds.includes(youId)) {
    return (
      <section className='player-round reflex-buzzer buzzer-area'>
        <div className='press'>
          <div className='false-start'>
            <p className='verdict'>{translate('reflex.falseStart.title')}</p>
            <p className='detail'>{translate('reflex.falseStart.detail')}</p>
          </div>
        </div>
      </section>
    )
  }

  const yourPress = content?.presses.find((press) => press.playerId === youId)

  // Their own race, over. The number is the server's two halves subtracted here
  // rather than a third field carried down the wire, and it is the payout of a
  // game that has no answer to reveal.
  if (yourPress !== undefined && content?.flipsAt != null) {
    return (
      <section className='player-round reflex-buzzer buzzer-area'>
        <div className='press'>
          <div className='reaction'>
            <p className='framing'>{translate('reflex.pressed')}</p>
            <p className='your-reaction'>
              {translate('reflex.reaction', {
                milliseconds: reactionMsOf({
                  flipsAt: content.flipsAt,
                  pressedAt: yourPress.atServerTime
                })
              })}
            </p>
          </div>
          {/*
            How much of the heat is still out there, which is the same count the
            room's screen carries and the only thing this player can still learn.
            It is on this screen alone: the two others are the wait before the
            flip and the bench, and a tally ticking on either is how a table
            counts the flip out loud.
          */}
          <p className='landed' role='status'>
            {translate('reflex.landed', { count: content.presses.length })}
          </p>
        </div>
      </section>
    )
  }

  const isClaimed = claimedRoundId === round.id

  return (
    <section className='player-round reflex-buzzer buzzer-area'>
      {/*
        `onPressStart` for the same reason the shared buzzer uses it, and more
        so here: the release costs tens of milliseconds in a race decided by
        exactly that.
      */}
      <div className='press'>
        <ReactAriaButton
          className={`buzzer ${hasFlipped ? '' : 'armed'} ${isClaimed ? 'claimed' : ''}`}
          onPressStart={() => {
            setClaimedRoundId(round.id)
            buzzFeedback('press')
            onBuzz(round.id)
          }}
        >
          <span className='word'>{translate('buzz.action')}</span>
        </ReactAriaButton>
        {/*
          The one thing this screen has to say, and the only screen that was not
          saying it: the button is live through the whole wait, so the game's own
          trap is reachable by a player already poised over it. The room's screen
          carries `reflex.waiting`; the player's screen carries what going early
          costs, because that is the half a player cannot work out from a button.

          It is the cost rather than *watch the screen*, so the line is true on
          both sides of the flip and never has to change under a player waiting
          on it — the field inverting is the signal, and a second one moving here
          would be a way for the table to read the flip off somebody's screen.
        */}
        <p className='hint'>{translate('reflex.hold')}</p>
      </div>
    </section>
  )
}
