import { Result } from '@adrienlcp/result'

import type { WallPairingCode } from '@taverla/protocol/http'

import {
  collectWall,
  isWallPairingLive,
  newWallPairing,
  vouchForWall,
  type WallPairing
} from '@/domain/room/wall-pairing'
import { nowMs } from '@/infrastructure/clock'
import type { WallPairings } from '@/infrastructure/http/http-ports'
import { newWallPairingCode, newWallSecret } from '@/infrastructure/ids'

const MAX_CODE_ATTEMPTS = 20

const pairings = new Map<WallPairingCode, WallPairing>()

const forgetExpired = (now: number): void => {
  for (const [code, pairing] of pairings) {
    if (!isWallPairingLive(pairing, now)) {
      pairings.delete(code)
    }
  }
}

export const inProcessWallPairings: WallPairings = {
  collect: async ({ pairingCode, secret }) => {
    const now = nowMs()

    forgetExpired(now)

    const collected = collectWall({
      now,
      pairing: pairings.get(pairingCode) ?? null,
      secret
    })

    if (collected.status === 'failure') {
      return collected
    }

    if (collected.data.remaining === null) {
      pairings.delete(pairingCode)
    }

    return Result.success(collected.data.response)
  },

  open: async () => {
    const now = nowMs()

    forgetExpired(now)

    for (let attempt = 0; attempt < MAX_CODE_ATTEMPTS; attempt++) {
      const pairingCode = newWallPairingCode()

      if (!pairings.has(pairingCode)) {
        const pairing = newWallPairing({ now, secret: newWallSecret() })

        pairings.set(pairingCode, pairing)

        return { pairingCode, secret: pairing.secret }
      }
    }

    return null
  },

  pair: async ({ hostToken, pairingCode, roomCode }) => {
    const now = nowMs()

    forgetExpired(now)

    const vouched = vouchForWall({
      hostToken,
      now,
      pairing: pairings.get(pairingCode) ?? null,
      roomCode
    })

    if (vouched.status === 'failure') {
      return vouched
    }

    pairings.set(pairingCode, vouched.data)

    return Result.success()
  }
}
