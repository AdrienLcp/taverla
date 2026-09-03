import { generatePath, type PathParam, useParams } from 'react-router'

import type { ShelvedGame } from '@taverla/protocol/game'
import type { RoomCode } from '@taverla/protocol/identifiers'

import { normalizeRoomCode } from '@taverla/core/room/room-code'
import { isShelvedGame } from '@taverla/core/room/shelved-game'

/**
 * `/:game` sits on the first segment on purpose: `/quiz` is a thing somebody
 * says out loud, which is the same reason the room code is four characters.
 * react-router ranks a static segment above a dynamic one wherever it is
 * declared, so `/credits` cannot be swallowed by it.
 *
 * What it costs is that the top-level namespace is now **shared**. A page added
 * beside `credits` takes that word out of the shelf's reach for good, and
 * nothing would say so: `isShelvedGame` would still answer yes, the static
 * route would still win, and that game's front door would simply be unreachable
 * with no error anywhere. Adding a top-level page means reading `shelvedGames`
 * first, and adding a game means reading this.
 */
export const paths = {
  credits: '/credits',
  game: '/:game',
  home: '/',
  host: '/host/:roomCode',
  play: '/play/:roomCode'
} as const

export const gameHomePathFor = (game: ShelvedGame): string =>
  generatePath(paths.game, { game })

export const hostPathFor = (code: RoomCode): string =>
  generatePath(paths.host, { roomCode: code })

export const playPathFor = (code: RoomCode): string =>
  generatePath(paths.play, { roomCode: code })

/**
 * What the QR code encodes. Same origin as the page showing it, so a phone that
 * scans it lands on the machine the host is already reachable at — over the LAN
 * in dev, over the public host in production — with no second domain to
 * configure and no CORS to arrange.
 */
export const playUrlFor = (code: RoomCode): string =>
  `${location.origin}${playPathFor(code)}`

/**
 * The names a route pattern carries, and what `useParams` is narrowed by here.
 *
 * `PathParam` rather than react-router's own `ParamParseKey`, which is this
 * with an escape hatch: it answers `string` for a pattern carrying no
 * parameter, so a pattern that lost its `:` buys an index signature and every
 * name still reads as `string | undefined` with nothing to say it stopped
 * matching. This one answers `never`, and the name stops compiling.
 *
 * More than one pattern asks for the names they *share*, which is exactly what
 * a hook read from either route is entitled to.
 */
type RouteParamOf<TPath extends string> = PathParam<TPath>

/**
 * `null` when the URL carries something that cannot be a room code, which a
 * page renders as "no such room" rather than opening a socket that would be
 * refused anyway.
 */
export const useRoomCodeParam = (): RoomCode | null => {
  const { roomCode } =
    useParams<RouteParamOf<typeof paths.host | typeof paths.play>>()

  return roomCode === undefined ? null : normalizeRoomCode(roomCode)
}

export const useGameParam = (): ShelvedGame | null => {
  const { game } = useParams<RouteParamOf<typeof paths.game>>()

  return game !== undefined && isShelvedGame(game) ? game : null
}
