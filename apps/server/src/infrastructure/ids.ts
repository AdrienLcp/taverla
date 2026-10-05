import { nanoid } from 'nanoid'

import {
  WALL_PAIRING_CODE_LENGTH,
  type WallPairingCode
} from '@taverla/protocol/http'
import {
  type HostToken,
  type PlayerId,
  ROOM_CODE_ALPHABET,
  type RoundId
} from '@taverla/protocol/identifiers'

import { generateHostToken } from '@taverla/core/room/host-token'
import { generateCode, secureRandomIndex } from '@taverla/core/room/random-code'

const PLAYER_ID_LENGTH = 12
const ROUND_ID_LENGTH = 10
const WALL_SECRET_LENGTH = 24

export const newPlayerId = (): PlayerId => nanoid(PLAYER_ID_LENGTH)

export const newRoundId = (): RoundId => nanoid(ROUND_ID_LENGTH)

/** Minted with the room and handed to its creator alone. */
export const newHostToken = (): HostToken => generateHostToken()

/** Proves a polling screen is the one that asked for its pairing code. */
export const newWallSecret = (): string => nanoid(WALL_SECRET_LENGTH)

/** Read off a television across a room, so it is drawn from the room code's unambiguous alphabet. */
export const newWallPairingCode = (): WallPairingCode =>
  generateCode({
    alphabet: ROOM_CODE_ALPHABET,
    length: WALL_PAIRING_CODE_LENGTH,
    randomIndex: secureRandomIndex
  })
