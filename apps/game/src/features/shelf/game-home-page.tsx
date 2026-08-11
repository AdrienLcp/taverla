import { useParams } from 'react-router'

import type { ShelvedGame } from '@taverla/protocol/game'

import { isShelvedGame } from '@taverla/core/room/shelved-game'

import { useCreateRoom } from '@/features/home/use-create-room'
import { NotFoundPage } from '@/features/not-found/not-found-page'
import { Button } from '@/presentation/components/button'
import { useTranslate } from '@/presentation/i18n/i18n-provider'
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
export const GameHomePage = () => {
  const { game } = useParams()

  return game !== undefined && isShelvedGame(game) ? (
    <GameHome game={game} />
  ) : (
    <NotFoundPage />
  )
}

const GameHome = ({ game }: { game: ShelvedGame }) => {
  const translate = useTranslate()
  const { error, isCreating, open } = useCreateRoom()

  return (
    <main className='game-home-page'>
      <header>
        <p className='wordmark'>{translate(gameNameKey(game))}</p>
        <h1>{translate(gameTaglineKey(game))}</h1>
      </header>

      <p className='pitch'>{translate(gameDescriptionKey(game))}</p>

      <div className='start'>
        <Button
          isPending={isCreating}
          onPress={() => {
            void open(game)
          }}
          size='large'
        >
          {translate('join.host.action')}
        </Button>
        <p className='aside'>{translate('join.host.description')}</p>
      </div>

      {error !== null && (
        <p className='error' role='alert'>
          {translate(error)}
        </p>
      )}
    </main>
  )
}
