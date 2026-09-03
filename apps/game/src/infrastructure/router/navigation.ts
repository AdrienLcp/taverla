import {
  generatePath,
  type PathParam,
  useLocation,
  useNavigate,
  useParams
} from 'react-router'

import type { ShelvedGame } from '@taverla/protocol/game'
import type { RoomCode } from '@taverla/protocol/identifiers'
import type { Locale } from '@taverla/protocol/locale'

import { isLocale } from '@taverla/core/i18n/locale'
import { normalizeRoomCode } from '@taverla/core/room/room-code'
import { isShelvedGame } from '@taverla/core/room/shelved-game'

/**
 * Every page a crawler is meant to reach names the language it is written in,
 * because a search index holds one document per URL and does not vary
 * `Accept-Language`: an app that decides its language at runtime has exactly one
 * of them indexed, whatever a visitor sees.
 *
 * `/:game` sits on the segment after it, and the namespace it shares moved with
 * it. A page added beside `credits` takes that word out of the shelf's reach for
 * good, and nothing would say so: `isShelvedGame` would still answer yes, the
 * static route would still win, and that game's front door would simply be
 * unreachable with no error anywhere. Adding a page under a locale means reading
 * `shelvedGames` first, and adding a game means reading this.
 */
export const localizedPaths = {
  credits: '/:locale/credits',
  game: '/:locale/:game',
  home: '/:locale'
} as const

/**
 * A room is addressed by its code and nothing else. Nobody indexes an evening —
 * both of these are already `Disallow`ed — so a locale segment would buy no
 * language back and would lengthen the two things a room is passed around by:
 * what the QR code encodes, and what somebody reads out across the table. They
 * keep negotiating at runtime, which is correct precisely because no crawler is
 * watching.
 */
export const roomPaths = {
  host: '/host/:roomCode',
  play: '/play/:roomCode'
} as const

/**
 * `root` carries no language and is the one URL that cannot: it is what
 * `hreflang="x-default"` points at, so it answers by negotiating and redirecting
 * rather than by rendering.
 */
export const paths = {
  ...localizedPaths,
  ...roomPaths,
  root: '/'
} as const

/**
 * The names a route pattern carries — what a path below is built from, and what
 * `useParams` is narrowed by.
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
 * `generatePath`'s own params type intersects an index signature over every
 * string, so a name the pattern does not carry type-checks and is dropped in
 * silence, and the argument stays optional where the pattern needs one. A plain
 * record over the names shuts both, at the cost of making an optional
 * `:param?` mandatory — which no pattern here has.
 *
 * `<string>` collapses that loose type to the index signature alone, which is
 * what the record satisfies with no cast.
 */
const pathFor = <TPath extends string>(
  path: TPath,
  params: Record<RouteParamOf<TPath>, string>
): string => generatePath<string>(path, params)

export const homePathFor = (locale: Locale): string =>
  pathFor(paths.home, { locale })

export const creditsPathFor = (locale: Locale): string =>
  pathFor(paths.credits, { locale })

export const gameHomePathFor = ({
  game,
  locale
}: {
  game: ShelvedGame
  locale: Locale
}): string => pathFor(paths.game, { game, locale })

export const hostPathFor = (code: RoomCode): string =>
  pathFor(paths.host, { roomCode: code })

export const playPathFor = (code: RoomCode): string =>
  pathFor(paths.play, { roomCode: code })

/**
 * What the QR code encodes. Same origin as the page showing it, so a phone that
 * scans it lands on the machine the host is already reachable at — over the LAN
 * in dev, over the public host in production — with no second domain to
 * configure and no CORS to arrange.
 */
export const playUrlFor = (code: RoomCode): string =>
  `${location.origin}${playPathFor(code)}`

/** Where an unprefixed page belongs, once a language has been negotiated for it. */
export const localizedPathFor = ({
  locale,
  pathname
}: {
  locale: Locale
  pathname: string
}): string =>
  pathname === paths.root ? homePathFor(locale) : `/${locale}${pathname}`

/**
 * The locale a path names, read without the router — which is what the entry
 * point needs, because `<html lang>` has to be right before there is any text
 * on the page and the router has not mounted yet.
 */
export const localeInPath = (pathname: string): Locale | null =>
  asLocale(pathname.split('/')[1])

/**
 * Moves the page to the same path in another language, and does nothing at all
 * on one that names none. That silence is the point: a room's language is state
 * alone, and navigating out of a room path would drop the socket and hand the
 * seat back.
 */
export const useNavigateToLocale = (): ((locale: Locale) => void) => {
  const navigate = useNavigate()
  const { pathname } = useLocation()

  return (locale) => {
    const [, first, ...rest] = pathname.split('/')

    if (asLocale(first) !== null) {
      void navigate(['', locale, ...rest].join('/'))
    }
  }
}

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

const asLocale = (segment: string | undefined): Locale | null =>
  segment !== undefined && isLocale(segment) ? segment : null
