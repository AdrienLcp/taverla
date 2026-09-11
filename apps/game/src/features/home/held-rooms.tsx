import { hostPathFor, playPathFor } from '@/infrastructure/router/navigation'
import { Link } from '@/presentation/components/link'
import { useTranslate } from '@/presentation/i18n/i18n-provider'

import { useHeldRooms } from './use-held-rooms'

import './held-rooms.sass'

/**
 * The way back, and the front door's third one. A console that closed its tab
 * still holds the token that always wins a claim, and a player who reloaded
 * still holds their seat — what neither had was a lock to put the key in.
 *
 * It is offered **to the device that holds the key** and to nobody else, which
 * is what lets the console's door stay URL-only: a public list of open rooms
 * would hand a stranger not a seat but the console.
 *
 * A row is one line rather than the two a shelf card takes, because a room has
 * one fact — its code — and the word beside it says which door the press opens.
 * `outlined` puts it at the standing of the two doors below rather than above
 * them, and `large` is a press.
 */
export const HeldRooms: React.FC = () => {
  const rooms = useHeldRooms()
  const translate = useTranslate()

  if (rooms.length === 0) {
    return null
  }

  return (
    <section className='held-rooms'>
      <h2>{translate('home.heldRooms.title')}</h2>
      {rooms.map(({ role, roomCode }) => (
        <Link
          href={role === 'host' ? hostPathFor(roomCode) : playPathFor(roomCode)}
          key={roomCode}
          size='large'
          variant='outlined'
        >
          <span className='code'>{roomCode}</span>
          <span className='door'>
            {translate(
              role === 'host' ? 'home.heldRooms.host' : 'home.heldRooms.player'
            )}
          </span>
        </Link>
      ))}
    </section>
  )
}
