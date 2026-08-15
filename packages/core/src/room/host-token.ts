import {
  HOST_TOKEN_LENGTH,
  type HostToken,
  hostTokenSchema,
  ROOM_CODE_ALPHABET
} from '@taverla/protocol/identifiers'

import {
  generateCode,
  type RandomIndex,
  secureRandomIndex
} from './random-code'

export const generateHostToken = (
  randomIndex: RandomIndex = secureRandomIndex
): HostToken =>
  generateCode({
    alphabet: ROOM_CODE_ALPHABET,
    length: HOST_TOKEN_LENGTH,
    randomIndex
  })

/**
 * Read the way a token is handed over — out of one screen's menu, into another's
 * field, with whatever spacing made it readable. Unlike a room code there is
 * nothing to tell the user about *how* it is wrong: a token is either the room's
 * or it is somebody else's guess.
 */
export const normalizeHostToken = (input: string): HostToken | null => {
  const parsed = hostTokenSchema.safeParse(
    input.replace(/[\s-]/g, '').toUpperCase()
  )

  return parsed.success ? parsed.data : null
}
