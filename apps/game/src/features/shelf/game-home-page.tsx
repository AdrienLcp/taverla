import type { ShelvedGame } from '@taverla/protocol/game'

import { useCreateRoom } from '@/features/home/use-create-room'
import { NotFoundPage } from '@/features/not-found/not-found-page'
import { useGameParam } from '@/infrastructure/router/navigation'
import { Button } from '@/presentation/components/button'
import { PAGE_HEADS } from '@/presentation/head/document-head'
import { DocumentTitle } from '@/presentation/head/document-title'
import { useI18n, useTranslate } from '@/presentation/i18n/i18n-provider'
import {
  gameDescriptionKey,
  gameNameKey,
  gameTaglineKey
} from '@/presentation/i18n/translation'

import './game-home-page.sass'

/**
 * A game's own front door, and a shortcut rather than the way in: the room is
 * opened here *for* this game, so a host who already knows what they came to
 * play lands on a console with the question answered.
 *
 * It is a page with a button rather than a link that opens a room, because a
 * GET that mutates is a link preview in a group chat opening rooms.
 *
 * One component for every game, because they have the same shape: a name, a
 * pitch and one button. Split it when one genuinely needs something the others
 * do not, and not to pre-empt that.
 */
export const GameHomePage: React.FC = () => {
  const game = useGameParam()

  return game === null ? <NotFoundPage /> : <GameHome game={game} />
}

const GameHome: React.FC<{ game: ShelvedGame }> = ({ game }) => {
  const { locale } = useI18n()
  const translate = useTranslate()
  const { isOpening, open, refusal } = useCreateRoom()

  return (
    <main className='game-home-page'>
      <DocumentTitle>{PAGE_HEADS[locale][game].title}</DocumentTitle>
      <header>
        <p className='wordmark'>{translate(gameNameKey(game))}</p>
        <h1>{translate(gameTaglineKey(game))}</h1>
      </header>

      <div className='actions'>
        <p className='pitch'>{translate(gameDescriptionKey(game))}</p>

        <div className='start'>
          <Button
            isPending={isOpening(game)}
            onPress={() => {
              void open(game)
            }}
            size='large'
          >
            {translate('join.host.action')}
          </Button>
          <p className='aside'>{translate('join.host.description')}</p>
        </div>

        {refusal !== null && (
          <p className='error' role='alert'>
            {translate(refusal.error)}
          </p>
        )}
      </div>
    </main>
  )
}
