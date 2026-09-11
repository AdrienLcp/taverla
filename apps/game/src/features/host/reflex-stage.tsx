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

import './reflex-stage.sass'

type ReflexStageProps = {
  clock: ClockEstimate | null
  /** `false` from the socket means the frame was never written. */
  onTap: (roundId: string) => boolean
  round: RoundView
  /** The seat this console holds, and `null` when it is only running the room. */
  youId: PlayerId | null
}

/**
 * The screen the room is staring at, and the only one in the product that is
 * deliberately, completely still. Everything else here moves once per event;
 * this waits, and anything that ticked or drained during the wait would hand
 * the table a way to count the flip out loud.
 *
 * That stillness is also why no round clock is drawn: `roundDurationMsOf`
 * answers `null` for this game, so the bar is already absent — and it must stay
 * absent, because a bar draining to a known end says how long is left, and the
 * flip is three seconds before it.
 *
 * A console holding a seat plays on this same screen rather than beside it: the
 * field it is watching *is* its buzzer, so the whole stage takes the press and
 * the room is given nothing extra to look at.
 */
export const ReflexStage: React.FC<ReflexStageProps> = ({
  clock,
  onTap,
  round,
  youId
}) => {
  const translate = useTranslate()
  const [claimedRoundId, setClaimedRoundId] = useState<string | null>(null)

  const content = reflexContent(round)
  const hasFlipped = useFlipField({ clock, flipsAt: content?.flipsAt ?? null })

  const yourTap =
    youId === null
      ? undefined
      : content?.taps.find((tap) => tap.playerId === youId)
  const isOut = youId !== null && round.lockedOutPlayerIds.includes(youId)
  const hasActed = isOut || yourTap !== undefined || claimedRoundId === round.id

  return (
    <div className='reflex-stage'>
      {hasFlipped ? (
        <>
          <p className='signal'>{translate('reflex.flip')}</p>
          <p className='landed' role='status'>
            {translate('reflex.landed', { count: content?.taps.length ?? 0 })}
          </p>
        </>
      ) : (
        <p className='waiting'>{translate('reflex.waiting')}</p>
      )}
      {youId !== null && (
        <p className='yours' role='status'>
          {isOut ? (
            // The one cause a lockout has here, said on the screen that caused
            // it. The detail line a player's screen carries is the room's to
            // read aloud.
            <span className='false-start'>
              {translate('reflex.falseStart.title')}
            </span>
          ) : yourTap !== undefined && content?.flipsAt != null ? (
            translate('reflex.reaction', {
              milliseconds: reactionMsOf({
                flipsAt: content.flipsAt,
                tappedAt: yourTap.atServerTime
              })
            })
          ) : (
            claimedRoundId === round.id && translate('reflex.tapped')
          )}
        </p>
      )}
      {/*
        Live through the wait for the same reason the player's buzzer is: going
        early is a move this game allows and then charges for, so a player who
        jumps has to land on a press the server refuses. It carries no chrome of
        its own — the stage under it is what was pressed.
      */}
      {youId !== null && !hasActed && (
        <ReactAriaButton
          aria-label={translate('buzz.action')}
          className='tap'
          onPressStart={() => {
            buzzFeedback()
            setClaimedRoundId(onTap(round.id) ? round.id : null)
          }}
        />
      )}
    </div>
  )
}
