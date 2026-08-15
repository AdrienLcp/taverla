import {
  ROOM_CODE_ALPHABET,
  ROOM_CODE_LENGTH,
  type RoomCode,
  roomCodeSchema
} from '@taverla/protocol/identifiers'

import {
  generateCode,
  type RandomIndex,
  secureRandomIndex
} from './random-code'

export const generateRoomCode = (
  randomIndex: RandomIndex = secureRandomIndex
): RoomCode =>
  generateCode({
    alphabet: ROOM_CODE_ALPHABET,
    length: ROOM_CODE_LENGTH,
    randomIndex
  })

export type RoomCodeInput =
  | { code: RoomCode; status: 'valid' }
  | { characters: string[]; status: 'unsupported_characters' }
  | { status: 'wrong_length' }

/**
 * Reads a code the way a human hands it over — lowercase, with the spaces or
 * dashes they added to read it aloud — and says which of the two ways it can
 * fail happened, because a form telling someone their four characters are not
 * four characters is worse than saying nothing.
 *
 * Every confusable pair is excluded on *both* sides (`O`/`0`, `I`/`1`, `S`/`5`,
 * `Z`/`2`), so an unsupported character is a rejection rather than something to
 * fold: a `5` is not a room code character and neither is the `S` it might have
 * been, and guessing would send someone into the wrong room.
 */
export const parseRoomCodeInput = (input: string): RoomCodeInput => {
  const candidate = input.replace(/[\s-]/g, '').toUpperCase()
  const unsupported = [...new Set(candidate)].filter(
    (character) => !ROOM_CODE_ALPHABET.includes(character)
  )

  if (unsupported.length > 0) {
    return { characters: unsupported, status: 'unsupported_characters' }
  }

  const parsed = roomCodeSchema.safeParse(candidate)

  return parsed.success
    ? { code: parsed.data, status: 'valid' }
    : { status: 'wrong_length' }
}

export const normalizeRoomCode = (input: string): RoomCode | null => {
  const parsed = parseRoomCodeInput(input)

  return parsed.status === 'valid' ? parsed.code : null
}
