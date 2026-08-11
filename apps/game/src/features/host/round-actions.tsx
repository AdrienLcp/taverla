import type React from 'react'

import { Button } from '@/presentation/components/button'
import { useTranslate } from '@/presentation/i18n/i18n-provider'

import type { HostActionsProps } from './host-actions'

type RoundActionsProps = Omit<HostActionsProps, 'onOpenRound'>

export const RoundActions: React.FC<RoundActionsProps> = ({
  isLive,
  send,
  view
}) => {
  const translate = useTranslate()

  // A blind test round ends when its clip does, so a lockout expires on its
  // own. A charade has no such clock: once the quickest thumbs have all missed,
  // only the host can give the round back to the room.
  const isFieldClosed =
    view.settings.game.kind === 'buzzer' &&
    (view.round?.lockedOutPlayerIds.length ?? 0) > 0

  return (
    <>
      {isFieldClosed && (
        <Button
          isDisabled={!isLive}
          onPress={() => {
            if (view.round !== null) {
              send({ roundId: view.round.id, type: 'host.clearLockouts' })
            }
          }}
          variant='outlined'
        >
          {translate('buzzer.clearLockouts')}
        </Button>
      )}
      <Button
        isDisabled={!isLive}
        onPress={() => {
          if (view.round !== null) {
            send({ roundId: view.round.id, type: 'host.reveal' })
          }
        }}
        variant='underlined'
      >
        {translate('host.reveal')}
      </Button>
    </>
  )
}
