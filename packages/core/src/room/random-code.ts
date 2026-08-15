export type RandomIndex = (exclusiveMax: number) => number

/**
 * Rejection sampling rather than `% alphabetLength`: 256 is not a multiple of
 * 28, so a plain modulo would make the first four letters of the alphabet
 * measurably more likely than the rest.
 */
export const secureRandomIndex: RandomIndex = (exclusiveMax) => {
  const limit = Math.floor(256 / exclusiveMax) * exclusiveMax
  const byte = new Uint8Array(1)

  do {
    crypto.getRandomValues(byte)
  } while (byte[0] === undefined || byte[0] >= limit)

  return byte[0] % exclusiveMax
}

export const generateCode = ({
  alphabet,
  length,
  randomIndex
}: {
  alphabet: string
  length: number
  randomIndex: RandomIndex
}): string =>
  Array.from({ length }, () =>
    alphabet.charAt(randomIndex(alphabet.length))
  ).join('')
