import type React from 'react'

import { Button } from '@/presentation/components/button'
import { useTranslate } from '@/presentation/i18n/i18n-provider'

import type { HostActionsProps } from './host-actions'

export const LobbyActions: React.FC<HostActionsProps> = ({
  isLive,
  onOpenRound,
  send,
  view
}) => {
  const translate = useTranslate()
  const isRoomEmpty = view.players.length === 0

  return (
    <>
      <Button
        isDisabled={!isLive || isRoomEmpty}
        onPress={() => {
          onOpenRound()
          send({ type: 'host.startRound' })
        }}
        size='large'
      >
        {translate('host.startGame')}
      </Button>
      {isRoomEmpty && <p className='reason'>{translate('host.needsPlayer')}</p>}
    </>
  )
}
