import { Link } from 'react-aria-components'

import { shelvedGames } from '@taverla/protocol/game'

import { JoinWithCode } from '@/features/join/join-with-code'
import { gameHomePathFor } from '@/infrastructure/router/navigation'
import { Separator } from '@/presentation/components/separator'
import { useTranslate } from '@/presentation/i18n/i18n-provider'
import { gameNameKey, gameTaglineKey } from '@/presentation/i18n/translation'

import './home-page.sass'

/**
 * The product's front door, and the one screen that belongs to no game. It
 * names Taverla and shows the shelf, straight off `shelvedGames` — so a game
 * that becomes playable appears here without this file being opened.
 *
 * What it deliberately does **not** do is *configure* a room. The card is a
 * link to the game's own home, which is where the room is created and which
 * game it opens on is decided.
 *
 * The card takes react-aria's `Link` rather than the design system's, which is
 * "a navigation shaped like a control" and would paint this as a filled button.
 * A shelf row is a third kind of surface, and the one the design system has not
 * been asked for yet.
 */
export const HomePage = () => {
  const translate = useTranslate()

  return (
    <main className='home-page'>
      <header>
        <p className='wordmark'>{translate('home.title')}</p>
        <h1>{translate('home.tagline')}</h1>
      </header>

      <section className='shelf'>
        <h2>{translate('home.games')}</h2>
        {shelvedGames.map((game) => (
          <Link className='game' href={gameHomePathFor(game)} key={game}>
            <span className='name'>{translate(gameNameKey(game))}</span>
            <span className='pitch'>{translate(gameTaglineKey(game))}</span>
          </Link>
        ))}
      </section>

      <Separator label={translate('join.divider')} />

      <JoinWithCode />
    </main>
  )
}
