import { Fragment } from 'react'
import { Button as ReactAriaButton } from 'react-aria-components'

import { shelvedGames } from '@taverla/protocol/game'

import { JoinWithCode } from '@/features/join/join-with-code'
import { WallDoor } from '@/features/wall/wall-door'
import { Button } from '@/presentation/components/button'
import { Separator } from '@/presentation/components/separator'
import { Spinner } from '@/presentation/components/spinner'
import { useIndexedPageTitle } from '@/presentation/head/use-document-title'
import { useTranslate } from '@/presentation/i18n/i18n-provider'
import { gameNameKey, gameTaglineKey } from '@/presentation/i18n/translation'

import { HeldRooms } from './held-rooms'
import { useCreateRoom } from './use-create-room'

import './home-page.sass'

/**
 * The product's front door, and the one screen that belongs to no game. The
 * room comes first: the code goes up, the players arrive, and the table decides
 * what to play while they do — which is why creating one asks nothing here and
 * the shelf below is *content* rather than the only way through.
 *
 * A card **opens the room** rather than linking to that game's own page. The
 * page it used to lead to asks for nothing the press does not already know —
 * the game is the card's, the locale is the URL's — so it was a screen whose
 * only content was a second press. It still exists, because it is one of the
 * fourteen prerendered documents and the arrival a search result or a shared
 * link makes; `sitemap.xml` is what keeps those reachable now that no card
 * points at them, and it serves the crawler better than one page's markup did.
 *
 * The card takes react-aria's `Button` rather than the design system's, which
 * is a hard-edged block of one line. A shelf row is a third kind of surface,
 * and the one the design system has not been asked for yet.
 */
export const HomePage: React.FC = () => {
  useIndexedPageTitle('home')

  const translate = useTranslate()
  const { isOpening, open, refusal } = useCreateRoom()

  return (
    <main className='home-page'>
      <header>
        <p className='wordmark'>{translate('home.title')}</p>
        <h1>{translate('home.tagline')}</h1>
      </header>

      {/*
        Everything you can act on, against the name and the promise beside it.
        The grouping is what the poster layout is made of on a wide screen, and
        it costs nothing on a narrow one: the same column, the same gap.
      */}
      <div className='actions'>
        <section className='start'>
          <Button
            isPending={isOpening(null)}
            onPress={() => {
              void open(null)
            }}
            size='large'
          >
            {translate('join.host.action')}
          </Button>
          <p className='aside'>{translate('join.host.description')}</p>
          {refusal?.door === null && (
            <p className='error' role='alert'>
              {translate(refusal.error)}
            </p>
          )}
        </section>

        <Separator label={translate('join.divider')} />

        <JoinWithCode />

        {/*
          Under the two doors rather than over them, and the reason is a
          measurement: the section is drawn only once the server has said which
          of the remembered rooms still resolve, so it *arrives*, and above the
          doors it moved the one a press aims at by 221px. It costs a first-time
          visitor nothing either way — with no key there is no section at all —
          so the only screen that pays is the one it was built for, and what it
          pays is a shelf pushed down.
        */}
        <HeldRooms />

        <section className='shelf'>
          <h2>{translate('home.games')}</h2>
          {shelvedGames.map((game) => (
            <Fragment key={game}>
              <ReactAriaButton
                className='game'
                isPending={isOpening(game)}
                onPress={() => {
                  void open(game)
                }}
              >
                <span className='name'>
                  {translate(gameNameKey(game))}
                  {isOpening(game) && <Spinner />}
                </span>
                <span className='pitch'>{translate(gameTaglineKey(game))}</span>
              </ReactAriaButton>

              {/*
                Under the card that was pressed, and it costs the cards below it
                a row: a player reading the shelf sees five of them, so one
                message at the end of the list is a message half a screen from
                the press that earned it.
              */}
              {refusal?.door === game && (
                <p className='error' role='alert'>
                  {translate(refusal.error)}
                </p>
              )}
            </Fragment>
          ))}
        </section>

        {/*
          Folded and last, because it is a rare job beside the two above it and
          the shelf is what the page is otherwise spending its length on. It is
          a door to a screen, not a way into a room: it shows a table and runs
          nothing.
        */}
        <WallDoor />
      </div>
    </main>
  )
}
