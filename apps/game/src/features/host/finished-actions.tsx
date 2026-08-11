import type React from 'react'

import { Button } from '@/presentation/components/button'
import { Link } from '@/presentation/components/link'
import { useTranslate } from '@/presentation/i18n/i18n-provider'

import type { HostActionsProps } from './host-actions'

export const FinishedActions: React.FC<HostActionsProps> = ({
  isLive,
  onOpenRound,
  send,
  view
}) => {
  const translate = useTranslate()

  return (
    <>
      <Button
        isDisabled={!isLive || view.players.length === 0}
        onPress={() => {
          onOpenRound()
          // Two frames rather than a new message: `host.playAgain` already
          // means "same seats, same settings, scores at zero", and the lobby it
          // lands in is a phase nobody needs to look at when the answer to
          // "again?" was yes.
          send({ type: 'host.playAgain' })
          send({ type: 'host.startRound' })
        }}
        size='large'
      >
        {translate('host.playAgain')}
      </Button>
      <Button
        isDisabled={!isLive}
        onPress={() => {
          send({ type: 'host.playAgain' })
        }}
        variant='outlined'
      >
        {translate('host.changeSettings')}
      </Button>
      <Link href='/' variant='underlined'>
        {translate('menu.home')}
      </Link>
    </>
  )
}
