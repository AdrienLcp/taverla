import { useState } from 'react'
import { useNavigate, useParams } from 'react-router'

import type { ShelvedGame } from '@taverla/protocol/game'

import { NotFoundPage } from '@/features/not-found/not-found-page'
import { createRoom } from '@/infrastructure/api/taverla-api'
import { hostPathFor } from '@/infrastructure/router/navigation'
import { Button } from '@/presentation/components/button'
import { useTranslate } from '@/presentation/i18n/i18n-provider'
import {
  apiErrorKey,
  gameDescriptionKey,
  gameNameKey,
  gameTaglineKey,
  isShelvedGame,
  type PlainTranslationKey
} from '@/presentation/i18n/translation'

import './game-home-page.sass'

/**
 * A game's own front door. Creating a room lives here rather than on the shelf
 * because a room is opened *for* a game, and the request says which — the
 * console the host lands on is already the right one.
 *
 * One component for every game, because two of them have the same shape: a
 * name, a pitch and one button. Split it when one genuinely needs something the
 * other does not, and not to pre-empt that.
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
  const navigate = useNavigate()
  const translate = useTranslate()
  const [error, setError] = useState<PlainTranslationKey | null>(null)
  const [isCreating, setIsCreating] = useState(false)

  const startHosting = async (): Promise<void> => {
    setIsCreating(true)
    setError(null)

    const created = await createRoom(game)

    setIsCreating(false)

    if (created.status === 'failure') {
      setError(apiErrorKey(created.error))

      return
    }

    await navigate(hostPathFor(created.data.code))
  }

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
            void startHosting()
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
