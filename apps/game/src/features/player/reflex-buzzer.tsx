import type React from 'react'
import { useState } from 'react'
import { Button as ReactAriaButton } from 'react-aria-components'

import type { PlayerId } from '@taverla/protocol/identifiers'
import type { RoundView } from '@taverla/protocol/room'

import { reactionMsOf } from '@taverla/core/reflex/reaction'
import type { ClockEstimate } from '@taverla/core/time/clock-sync'

import { reflexContent } from '@/helpers/round-content'
import { buzzFeedback } from '@/infrastructure/env'
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
 * The phone during a heat, and three screens rather than one.
 *
 * The button is live throughout the wait on purpose: going early is a move this
 * game allows and then charges for, so a thumb that jumps must land on a
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

  // In this game a lockout has exactly one cause, which is what lets the phone
  // name it instead of saying "you are out" and leaving them to work out why.
  if (round.lockedOutPlayerIds.includes(youId)) {
    return (
      <section className='player-round reflex-buzzer centred'>
        <div className='false-start'>
          <p className='verdict'>{translate('reflex.falseStart.title')}</p>
          <p className='detail'>{translate('reflex.falseStart.detail')}</p>
        </div>
      </section>
    )
  }

  const yourTap = content?.taps.find((tap) => tap.playerId === youId)

  // Their own race, over. The number is the server's two halves subtracted here
  // rather than a third field carried down the wire, and it is the payout of a
  // game that has no answer to reveal.
  if (yourTap !== undefined && content?.flipsAt != null) {
    return (
      <section className='player-round reflex-buzzer centred'>
        <p className='framing'>{translate('reflex.tapped')}</p>
        <p className='your-reaction'>
          {translate('reflex.reaction', {
            milliseconds: reactionMsOf({
              flipsAt: content.flipsAt,
              tappedAt: yourTap.atServerTime
            })
          })}
        </p>
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
      <ReactAriaButton
        className={`buzzer ${hasFlipped ? '' : 'armed'} ${isClaimed ? 'claimed' : ''}`}
        onPressStart={() => {
          setClaimedRoundId(round.id)
          buzzFeedback()
          onBuzz(round.id)
        }}
      >
        {translate('buzz.action')}
      </ReactAriaButton>
    </section>
  )
}
