import { Link } from 'react-aria-components'

import { JoinWithCode } from '@/features/join/join-with-code'
import { blindtestPath } from '@/infrastructure/router/navigation'
import { Separator } from '@/presentation/components/separator'
import { useTranslate } from '@/presentation/i18n/i18n-provider'

import './home-page.sass'

/**
 * The product's front door, and the one screen that is not the blind test. It
 * names Taverla and shows the shelf — one game today, and the layout of a list
 * rather than of a single title, because the second one changes nothing here.
 *
 * What it deliberately does **not** do is choose a game for the room. A room
 * carries no game field, and inventing one for a union of a single member is
 * the abstraction `docs/game-catalogue.md` says to wait for. The card is a
 * link to the game's own home, and that game creates the room itself.
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
        <Link className='game' href={blindtestPath}>
          <span className='name'>{translate('blindtest.name')}</span>
          <span className='pitch'>{translate('blindtest.tagline')}</span>
        </Link>
      </section>

      <Separator label={translate('join.divider')} />

      <JoinWithCode />
    </main>
  )
}
