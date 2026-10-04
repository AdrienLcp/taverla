import { Result } from '@adrienlcp/result'

import type { WallPairingPollResponse } from '@taverla/protocol/http'
import type { HostToken, RoomCode } from '@taverla/protocol/identifiers'

/**
 * Long enough to walk from the television to wherever the host's phone is, and
 * short enough that a code left on a screen nobody paired stops meaning anything
 * before the evening is over.
 */
export const WALL_PAIRING_TTL_MS = 10 * 60 * 1000

/** One code shown on one waiting screen. Where pairings are kept is the runtime's. */
export type WallPairing = {
  expiresAt: number
  paired: { hostToken: HostToken; roomCode: RoomCode } | null
  secret: string
}

export const newWallPairing = ({
  now,
  secret
}: {
  now: number
  secret: string
}): WallPairing => ({
  expiresAt: now + WALL_PAIRING_TTL_MS,
  paired: null,
  secret
})

export const isWallPairingLive = (pairing: WallPairing, now: number): boolean =>
  pairing.expiresAt > now

/**
 * The host's device vouching for a waiting screen. The token is checked by the
 * caller against the room, because a pairing knows no rooms; this only refuses
 * a code that is not waiting. A second vouch overwrites the first, which is the
 * host correcting a wrong room before the screen collected it.
 */
export const vouchForWall = ({
  hostToken,
  now,
  pairing,
  roomCode
}: {
  hostToken: HostToken
  now: number
  pairing: WallPairing | null
  roomCode: RoomCode
}): Result<WallPairing, 'unknown_pairing'> =>
  pairing === null || !isWallPairingLive(pairing, now)
    ? Result.failure('unknown_pairing')
    : Result.success({ ...pairing, paired: { hostToken, roomCode } })

/**
 * Collected once: `remaining` is `null` on the read that hands the token over,
 * so a screen that polls again afterwards is told the pairing is gone rather
 * than handed the token a second time.
 */
export const collectWall = ({
  now,
  pairing,
  secret
}: {
  now: number
  pairing: WallPairing | null
  secret: string
}): Result<
  { remaining: WallPairing | null; response: WallPairingPollResponse },
  'unknown_pairing'
> => {
  if (
    pairing === null ||
    !isWallPairingLive(pairing, now) ||
    pairing.secret !== secret
  ) {
    return Result.failure('unknown_pairing')
  }

  if (pairing.paired === null) {
    return Result.success({
      remaining: pairing,
      response: { status: 'waiting' }
    })
  }

  return Result.success({
    remaining: null,
    response: { ...pairing.paired, status: 'paired' }
  })
}
