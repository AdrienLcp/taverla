import { Link } from 'react-aria-components'

import { shelvedGames } from '@taverla/protocol/game'

import { JoinWithCode } from '@/features/join/join-with-code'
import { gameHomePathFor } from '@/infrastructure/router/navigation'
import { Button } from '@/presentation/components/button'
import { Separator } from '@/presentation/components/separator'
import { useDocumentTitle } from '@/presentation/head/use-document-title'
import { useI18n, useTranslate } from '@/presentation/i18n/i18n-provider'
import { gameNameKey, gameTaglineKey } from '@/presentation/i18n/translation'

import { useCreateRoom } from './use-create-room'

import './home-page.sass'

/**
 * The product's front door, and the one screen that belongs to no game. The
 * room comes first: the code goes up, the phones arrive, and the table decides
 * what to play while they do — which is why creating one asks nothing here and
 * the shelf below is *content* rather than the only way through.
 *
 * A card is still a link to that game's own page, which opens a room already
 * answered. That page exists rather than creating the room on arrival, because
 * a GET that opens a room is a link preview in a group chat opening rooms.
 *
 * The card takes react-aria's `Link` rather than the design system's, which is
 * "a navigation shaped like a control" and would paint this as a filled button.
 * A shelf row is a third kind of surface, and the one the design system has not
 * been asked for yet.
 */
export const HomePage: React.FC = () => {
  const { locale } = useI18n()

  useDocumentTitle('home')

  const translate = useTranslate()
  const { error, isCreating, open } = useCreateRoom()

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
            isPending={isCreating}
            onPress={() => {
              void open()
            }}
            size='large'
          >
            {translate('join.host.action')}
          </Button>
          <p className='aside'>{translate('join.host.description')}</p>
          {error !== null && (
            <p className='error' role='alert'>
              {translate(error)}
            </p>
          )}
        </section>

        <Separator label={translate('join.divider')} />

        <JoinWithCode />

        <section className='shelf'>
          <h2>{translate('home.games')}</h2>
          {shelvedGames.map((game) => (
            <Link
              className='game'
              href={gameHomePathFor({ game, locale })}
              key={game}
            >
              <span className='name'>{translate(gameNameKey(game))}</span>
              <span className='pitch'>{translate(gameTaglineKey(game))}</span>
            </Link>
          ))}
        </section>
      </div>
    </main>
  )
}
