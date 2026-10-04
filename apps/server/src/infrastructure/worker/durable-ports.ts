import { env } from 'cloudflare:workers'

import type { RoomCode } from '@taverla/protocol/identifiers'

import { generateRoomCode } from '@taverla/core/room/room-code'

import type { RoomDoor, WallPairings } from '@/infrastructure/http/http-ports'
import { newWallPairingCode, newWallSecret } from '@/infrastructure/ids'
import { logger } from '@/infrastructure/logging/logger'

/**
 * A code is drawn, and the object it names refuses when it already holds a
 * room, so uniqueness needs no registry. 28^4 codes against a handful of live
 * rooms makes a second attempt a curiosity.
 */
const MAX_CODE_ATTEMPTS = 20

export const roomObjectFor = (code: RoomCode) =>
  env.ROOMS.get(env.ROOMS.idFromName(code))

const wallPairingObjectFor = (pairingCode: string) =>
  env.WALL_PAIRINGS.get(env.WALL_PAIRINGS.idFromName(pairingCode))

export const durableRoomDoor: RoomDoor = {
  isHostedWith: ({ code, hostToken }) =>
    roomObjectFor(code).isHostedWith(hostToken),
  openRoom: async ({ game, locale }) => {
    for (let attempt = 0; attempt < MAX_CODE_ATTEMPTS; attempt++) {
      const code = generateRoomCode()
      const opened = await roomObjectFor(code).open({ code, game, locale })

      if (opened !== null) {
        return opened
      }
    }

    logger.error('Exhausted room code attempts')

    return null
  },
  roomExists: (code) => roomObjectFor(code).exists()
}

export const durableWallPairings: WallPairings = {
  collect: ({ pairingCode, secret }) =>
    wallPairingObjectFor(pairingCode).collect(secret),
  open: async () => {
    const secret = newWallSecret()

    for (let attempt = 0; attempt < MAX_CODE_ATTEMPTS; attempt++) {
      const pairingCode = newWallPairingCode()

      if (await wallPairingObjectFor(pairingCode).open(secret)) {
        return { pairingCode, secret }
      }
    }

    return null
  },
  pair: ({ hostToken, pairingCode, roomCode }) =>
    wallPairingObjectFor(pairingCode).pair({ hostToken, roomCode })
}
