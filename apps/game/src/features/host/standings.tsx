import type React from 'react'
import { useId } from 'react'

import type { PlayerId } from '@taverla/protocol/identifiers'
import type { PublicPlayer } from '@taverla/protocol/room'

import { Scoreboard } from '@/presentation/components/scoreboard'
import { useTranslate } from '@/presentation/i18n/i18n-provider'

type StandingsProps = {
  players: readonly PublicPlayer[]
  /** The seated host's own row, highlighted; `null` on a screen nobody sits at. */
  youId: PlayerId | null
}

/**
 * The game so far, beside the round that just moved it: a titled board whose
 * pawns are the ones standing on the track around it.
 */
export const Standings: React.FC<StandingsProps> = ({ players, youId }) => {
  const translate = useTranslate()
  const titleId = useId()

  return (
    <section aria-labelledby={titleId} className='standings'>
      <h2 className='standings-title' id={titleId}>
        {translate('host.standings')}
      </h2>
      <Scoreboard hasPawns players={players} youId={youId} />
    </section>
  )
}
