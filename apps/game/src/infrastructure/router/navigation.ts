import { useParams } from 'react-router'

import type { RoomCode } from '@taverla/protocol/identifiers'

import { normalizeRoomCode } from '@taverla/core/room/room-code'

export const joinPath = '/'
export const hostPathFor = (code: RoomCode): string => `/host/${code}`
export const playPathFor = (code: RoomCode): string => `/play/${code}`

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
  const { roomCode } = useParams()

  return roomCode === undefined ? null : normalizeRoomCode(roomCode)
}
