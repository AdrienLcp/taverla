import type React from 'react'

import type { HostRoomView } from '@taverla/protocol/room'

import {
  type ClipRefusal,
  isClipUnheard
} from '@taverla/core/blindtest/clip-audio'

import { blindtestHostContent } from '@/helpers/round-content'
import { Button } from '@/presentation/components/button'
import { useTranslate } from '@/presentation/i18n/i18n-provider'
import { clipRefusalKey } from '@/presentation/i18n/translation'

type ClipOfferProps = {
  /** Whether a press has blessed an audio element on this screen. */
  canPlay: boolean
  /** This screen plays the clip, which is the only one that owes the offer. */
  isSpeaker: boolean
  onUnlockAudio: () => void
  /** Why the last press did not arm this screen, and `null` while none has failed. */
  refusal: ClipRefusal | null
  view: HostRoomView
}

/**
 * A silent round is *visually identical* to one that plays — the clip's
 * progress comes from the server, buzzes work, the reveal lands — so this is
 * the one thing on the speaker that has to be said out loud. Nothing at all
 * while the clip is heard, or while there is none.
 */
export const ClipOffer: React.FC<ClipOfferProps> = ({
  canPlay,
  isSpeaker,
  onUnlockAudio,
  refusal,
  view
}) => {
  const translate = useTranslate()

  if (
    !isSpeaker ||
    !isClipUnheard({
      canPlay,
      hasClip: blindtestHostContent(view)?.audioUrl != null,
      phase: view.phase
    })
  ) {
    return null
  }

  return (
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
  )
}
