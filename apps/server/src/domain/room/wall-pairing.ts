import { Result } from '@adrienlcp/result'
import { nanoid } from 'nanoid'

import {
  WALL_PAIRING_CODE_LENGTH,
  type WallPairingCode,
  type WallPairingPollResponse
} from '@taverla/protocol/http'
import {
  type HostToken,
  ROOM_CODE_ALPHABET,
  type RoomCode
} from '@taverla/protocol/identifiers'

import { generateCode, secureRandomIndex } from '@taverla/core/room/random-code'

/**
 * Long enough to walk from the television to wherever the host's phone is, and
 * short enough that a code left on a screen nobody paired stops meaning anything
 * before the evening is over.
 */
export const WALL_PAIRING_TTL_MS = 10 * 60 * 1000

const MAX_CODE_ATTEMPTS = 20

type Pairing = {
  expiresAt: number
  paired: { hostToken: HostToken; roomCode: RoomCode } | null
  secret: string
}

const pairings = new Map<WallPairingCode, Pairing>()

const forgetExpired = (now: number): void => {
  for (const [code, pairing] of pairings) {
    if (pairing.expiresAt <= now) {
      pairings.delete(code)
    }
  }
}

export const openWallPairing = (
  now: number
): { pairingCode: WallPairingCode; secret: string } | null => {
  forgetExpired(now)

  for (let attempt = 0; attempt < MAX_CODE_ATTEMPTS; attempt++) {
    const pairingCode = generateCode({
      alphabet: ROOM_CODE_ALPHABET,
      length: WALL_PAIRING_CODE_LENGTH,
      randomIndex: secureRandomIndex
    })

    if (!pairings.has(pairingCode)) {
      const secret = nanoid(24)

      pairings.set(pairingCode, {
        expiresAt: now + WALL_PAIRING_TTL_MS,
        paired: null,
        secret
      })

      return { pairingCode, secret }
    }
  }

  return null
}

/**
 * The host's device vouching for a waiting screen. The token is checked by the
 * caller against the room, because the store knows no rooms; this only refuses
 * a code that is not waiting. A second vouch overwrites the first, which is the
 * host correcting a wrong room before the screen collected it.
 */
export const pairWall = ({
  hostToken,
  now,
  pairingCode,
  roomCode
}: {
  hostToken: HostToken
  now: number
  pairingCode: WallPairingCode
  roomCode: RoomCode
}): Result<void, 'unknown_pairing'> => {
  forgetExpired(now)

  const pairing = pairings.get(pairingCode)

  if (pairing === undefined) {
    return Result.failure('unknown_pairing')
  }

  pairing.paired = { hostToken, roomCode }

  return Result.success()
}

/**
 * Collected once: the token leaves the store on the read that hands it over,
 * so a screen that polls again afterwards is told the pairing is gone rather
 * than handed the token a second time.
 */
export const collectWallPairing = ({
  now,
  pairingCode,
  secret
}: {
  now: number
  pairingCode: WallPairingCode
  secret: string
}): Result<WallPairingPollResponse, 'unknown_pairing'> => {
  forgetExpired(now)

  const pairing = pairings.get(pairingCode)

  if (pairing === undefined || pairing.secret !== secret) {
    return Result.failure('unknown_pairing')
  }

  if (pairing.paired === null) {
    return Result.success({ status: 'waiting' })
  }

  pairings.delete(pairingCode)

  return Result.success({ ...pairing.paired, status: 'paired' })
}
