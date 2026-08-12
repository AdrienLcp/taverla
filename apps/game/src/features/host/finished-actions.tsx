import type React from 'react'

import { Button } from '@/presentation/components/button'
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
      {/*
        The lobby it lands on *is* the room's front door — the game picker, the
        settings and the roster, in that order — so the label names the
        destination rather than one of the things you can do once you are there.
        Leaving for good is an exit and lives in the menu, with every other one.
      */}
      <Button
        isDisabled={!isLive}
        onPress={() => {
          send({ type: 'host.playAgain' })
        }}
        variant='outlined'
      >
        {translate('host.backToRoom')}
      </Button>
    </>
  )
}
