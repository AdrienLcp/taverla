import { Fragment } from 'react'
import { Button } from 'react-aria-components'

import { type ShelvedGame, shelvedGames } from '@taverla/protocol/game'

import { GameIcon } from '@/presentation/components/icons'
import { Spinner } from '@/presentation/components/spinner'
import { useTranslate } from '@/presentation/i18n/i18n-provider'
import { gameNameKey, gameTaglineKey } from '@/presentation/i18n/translation'

import type { CreateRoom } from './use-create-room'

import './game-spines.sass'

type GameSpinesProps = {
  /** The front door's one room opener, so the shelf and the lid share a press. */
  createRoom: CreateRoom
}

/**
 * The five games as boxes stacked on a shelf, each seen by its spine: the
 * box's colour, its name, and one line of what it is. A spine **opens the
 * room** for that game rather than linking to its own page — that page asks
 * for nothing the press does not already know, so it would be a screen whose
 * only content is a second press. It stays the arrival a shared link or a
 * search result makes, and `sitemap.xml` keeps it reachable.
 *
 * react-aria's `Button` rather than the design system's: a spine is a piece of
 * the box with two lines on it, not a control with a label.
 */
export const GameSpines: React.FC<GameSpinesProps> = ({ createRoom }) => {
  const translate = useTranslate()
  const { isOpening, isOpeningAny, open, refusal } = createRoom

  return (
    <section className='game-spines'>
      <h2>{translate('home.games')}</h2>
      <div className='stack'>
        {shelvedGames.map((game) => (
          <Fragment key={game}>
            <Button
              className='spine'
              isDisabled={isOpeningAny && !isOpening(game)}
              isPending={isOpening(game)}
              onPress={() => {
                void open(game)
              }}
              style={spineStyle(game)}
            >
              <span className='name'>
                <GameIcon game={game} />
                {translate(gameNameKey(game))}
                {isOpening(game) && <Spinner />}
              </span>
              <span className='tagline'>{translate(gameTaglineKey(game))}</span>
            </Button>

            {/*
              Under the spine that was pressed: five spines tall, a message at
              the foot of the shelf is a message away from the press that
              earned it.
            */}
            {refusal?.door === game && (
              <p className='error' role='alert'>
                {translate(refusal.error)}
              </p>
            )}
          </Fragment>
        ))}
      </div>
      <p className='one-room'>{translate('home.oneRoom')}</p>
    </section>
  )
}

const spineStyle = (game: ShelvedGame): React.CSSProperties => ({
  '--spine': `var(--spine-${game})`,
  '--spine-ink': `var(--on-spine-${game})`
})
