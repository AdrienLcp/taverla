import type React from 'react'

import { Button } from '@/presentation/components/button'
import { useTranslate } from '@/presentation/i18n/i18n-provider'

import type { HostActionsProps } from './host-actions'
import { useSettingsSummary } from './use-settings-summary'

export const FinishedActions: React.FC<HostActionsProps> = ({
  draftSource,
  isLive,
  onOpenRound,
  send,
  slateKeys,
  view
}) => {
  const translate = useTranslate()
  const summary = useSettingsSummary({ draftSource, settings: view.settings })

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
          send({ slateKeys, type: 'host.startRound' })
        }}
        size='large'
      >
        {translate('host.playAgain')}
      </Button>
      {/*
        What *again* means, under the button that means it. This press does not
        stop at the lobby: it sends the room straight into a countdown of the
        same game, in the same mode, for the same number of rounds — and the
        setup fold's closed summary was the only thing saying which, until
        `finished` stopped drawing a footer that could act on a game in flight.

        It is also what tells the two buttons apart: anything in this line the
        table wants changed is reached through the one below it.
      */}
      <p className='replays'>{summary}</p>
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
