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
  const hasNoGame = view.settings.game === null

  return (
    <>
      <Button
        isDisabled={!isLive || isRoomEmpty || hasNoGame}
        onPress={() => {
          onOpenRound()
          send({ type: 'host.startRound' })
        }}
        size='large'
      >
        {translate('host.startGame')}
      </Button>
      {/*
        The game first when both are missing: it is the decision on the stage
        the host is already looking at, where the roster fills itself as
        players arrive. The server refuses either way — see `no_game_chosen`.
      */}
      {hasNoGame ? (
        <p className='reason'>{translate('host.needsGame')}</p>
      ) : (
        isRoomEmpty && <p className='reason'>{translate('host.needsPlayer')}</p>
      )}
    </>
  )
}
