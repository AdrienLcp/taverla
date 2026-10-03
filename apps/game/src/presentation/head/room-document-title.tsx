import type React from 'react'

import type { GameKind } from '@taverla/protocol/game'

import { DocumentTitle } from '@/presentation/head/document-title'
import { useTranslate } from '@/presentation/i18n/i18n-provider'
import { gameNameKey } from '@/presentation/i18n/translation'

/**
 * The tab of a screen that is in a room. A room's URL is served by the SPA
 * fallback — deliberately, because it carries no locale and nothing indexes it
 * — so the document it gets is the English home page's, and the tab said so
 * until this rendered.
 *
 * It says what the front doors say, `Blind test — Taverla`, because a tab is
 * chrome rather than a game screen: it is one of the three places the product
 * is named, beside the wordmark and what a shared link unfurls into. The room
 * code is *not* in it — it is already the largest thing on the console and the
 * line above the player's own name, and a tab is not where anybody reads it
 * back.
 */
export const RoomDocumentTitle: React.FC<{
  /** What the room is playing; `null` before the table has chosen, which names the product alone. */
  game: GameKind | null
}> = ({ game }) => {
  const translate = useTranslate()

  return (
    <DocumentTitle>
      {game === null
        ? translate('room.documentTitleLobby')
        : translate('room.documentTitle', {
            game: translate(gameNameKey(game))
          })}
    </DocumentTitle>
  )
}
