import type React from 'react'

import type { RoundView } from '@taverla/protocol/room'

import type { ClockEstimate } from '@taverla/core/time/clock-sync'

import { reflexContent } from '@/helpers/round-content'
import { useTranslate } from '@/presentation/i18n/i18n-provider'
import { useFlipField } from '@/presentation/theme/use-flip-field'

import './reflex-stage.sass'

type ReflexStageProps = {
  clock: ClockEstimate | null
  round: RoundView
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
 */
export const ReflexStage: React.FC<ReflexStageProps> = ({ clock, round }) => {
  const translate = useTranslate()
  const content = reflexContent(round)
  const hasFlipped = useFlipField({ clock, flipsAt: content?.flipsAt ?? null })

  if (!hasFlipped) {
    return <p className='reflex-stage waiting'>{translate('reflex.waiting')}</p>
  }

  return (
    <div className='reflex-stage flipped'>
      <p className='signal'>{translate('reflex.flip')}</p>
      <p className='landed' role='status'>
        {translate('reflex.landed', { count: content?.taps.length ?? 0 })}
      </p>
    </div>
  )
}
