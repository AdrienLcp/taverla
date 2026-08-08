import {
  ROOM_CODE_ALPHABET,
  ROOM_CODE_LENGTH,
  type RoomCode,
  roomCodeSchema
} from '@blindtest/protocol/identifiers'

/**
 * Rejection sampling rather than `% alphabetLength`: 256 is not a multiple of
 * 28, so a plain modulo would make the first four letters of the alphabet
 * measurably more likely than the rest.
 */
const secureRandomIndex = (exclusiveMax: number): number => {
  const limit = Math.floor(256 / exclusiveMax) * exclusiveMax
  const byte = new Uint8Array(1)

  do {
    crypto.getRandomValues(byte)
  } while (byte[0] === undefined || byte[0] >= limit)

  return byte[0] % exclusiveMax
}

export const generateRoomCode = (
  randomIndex: (exclusiveMax: number) => number = secureRandomIndex
): RoomCode =>
  Array.from({ length: ROOM_CODE_LENGTH }, () =>
    ROOM_CODE_ALPHABET.charAt(randomIndex(ROOM_CODE_ALPHABET.length))
  ).join('')

/**
 * Accepts a code the way a human hands it over — lowercase, with the spaces or
 * dashes they added to read it aloud — and returns `null` for anything the
 * alphabet cannot contain. Every confusable pair is excluded on *both* sides
 * (`O`/`0`, `I`/`1`, `S`/`5`, `Z`/`2`), so there is nothing to fold: a `0` is
 * simply not a room code character, and guessing which letter was meant would
 * send someone into the wrong room.
 */
export const normalizeRoomCode = (input: string): RoomCode | null => {
  const candidate = input.replace(/[\s-]/g, '').toUpperCase()
  const parsed = roomCodeSchema.safeParse(candidate)

  return parsed.success ? parsed.data : null
}
