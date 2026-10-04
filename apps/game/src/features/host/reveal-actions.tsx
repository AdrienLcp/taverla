import type React from 'react'

import { Button } from '@/presentation/components/button'
import { useTranslate } from '@/presentation/i18n/i18n-provider'

import type { HostActionsProps } from './host-actions'

export const RevealActions: React.FC<HostActionsProps> = ({
  isLive,
  onOpenRound,
  send,
  view
}) => {
  const translate = useTranslate()
  const total = view.settings.roundCount

  // The server ends the game rather than opening a round past the last one, so
  // on that reveal "next round" is a button that does something else than it
  // says — and the way out beside it reads as abandoning a game that is already
  // over. One control, named after what it opens.
  if (total !== null && (view.round?.index ?? 0) >= total) {
    return (
      <div className='reveal-actions'>
        <Button
          isDisabled={!isLive}
          onPress={() => {
            send({ type: 'host.nextRound' })
          }}
          size='large'
        >
          {translate('host.seeResults')}
        </Button>
      </div>
    )
  }

  return (
    <div className='reveal-actions'>
      <Button
        isDisabled={!isLive}
        onPress={() => {
          onOpenRound()
          send({ type: 'host.nextRound' })
        }}
        size='large'
      >
        {translate('host.nextRound')}
      </Button>
      <Button
        isDisabled={!isLive}
        onPress={() => {
          send({ type: 'host.endGame' })
        }}
        variant='underlined'
      >
        {translate('host.endGame')}
      </Button>
    </div>
  )
}
