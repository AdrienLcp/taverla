import { nanoid } from 'nanoid'

import type {
  PlayerId,
  RoundId,
  SessionId
} from '@taverla/protocol/identifiers'

const PLAYER_ID_LENGTH = 12
const ROUND_ID_LENGTH = 10
const SESSION_ID_LENGTH = 16
const WALL_SECRET_LENGTH = 24

export const newPlayerId = (): PlayerId => nanoid(PLAYER_ID_LENGTH)

export const newRoundId = (): RoundId => nanoid(ROUND_ID_LENGTH)

export const newSessionId = (): SessionId => nanoid(SESSION_ID_LENGTH)

/** Proves a polling screen is the one that asked for its pairing code. */
export const newWallSecret = (): string => nanoid(WALL_SECRET_LENGTH)
