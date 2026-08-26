import { generatePath, type ParamParseKey, useParams } from 'react-router'

import type { ShelvedGame } from '@taverla/protocol/game'
import type { RoomCode } from '@taverla/protocol/identifiers'

import { normalizeRoomCode } from '@taverla/core/room/room-code'
import { isShelvedGame } from '@taverla/core/room/shelved-game'

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
 * `null` when the URL carries something that cannot be a room code, which a
 * page renders as "no such room" rather than opening a socket that would be
 * refused anyway.
 */
export const useRoomCodeParam = (): RoomCode | null => {
  const { roomCode } =
    useParams<ParamParseKey<typeof paths.host | typeof paths.play>>()

  return roomCode === undefined ? null : normalizeRoomCode(roomCode)
}

export const useGameParam = (): ShelvedGame | null => {
  const { game } = useParams<ParamParseKey<typeof paths.game>>()

  return game !== undefined && isShelvedGame(game) ? game : null
}
