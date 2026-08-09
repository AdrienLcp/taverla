import { describe, expect, it } from 'vitest'

import {
  ROOM_CODE_ALPHABET,
  ROOM_CODE_LENGTH
} from '@taverla/protocol/identifiers'

import { generateRoomCode, normalizeRoomCode } from './room-code'

describe('generateRoomCode', () => {
  it('[room-code] produces a code the wire schema accepts', () => {
    expect(normalizeRoomCode(generateRoomCode())).not.toBeNull()
  })

  it('[room-code] draws every character from the alphabet', () => {
    const codes = Array.from({ length: 200 }, () => generateRoomCode())

    for (const code of codes) {
      expect(code).toHaveLength(ROOM_CODE_LENGTH)
      expect(
        [...code].every((character) => ROOM_CODE_ALPHABET.includes(character))
      ).toBe(true)
    }
  })

  it('[room-code] maps each drawn index to its alphabet position', () => {
    let call = 0
    const code = generateRoomCode(() => call++)

    expect(code).toBe(ROOM_CODE_ALPHABET.slice(0, ROOM_CODE_LENGTH))
  })
})

describe('normalizeRoomCode', () => {
  it.each([
    ['k3m9', 'K3M9'],
    ['K3-M9', 'K3M9'],
    [' k3 m9 ', 'K3M9']
  ])('[room-code] accepts %s as it was handed over', (input, expected) => {
    expect(normalizeRoomCode(input)).toBe(expected)
  })

  // Both halves of every confusable pair are outside the alphabet, so these are
  // rejections rather than corrections — the whole point of the alphabet.
  it.each(['K0M9', 'K1M9', 'KSM9', 'KZM9'])(
    '[room-code] rejects the confusable %s',
    (input) => {
      expect(normalizeRoomCode(input)).toBeNull()
    }
  )

  it.each(['K3M', 'K3M99', ''])(
    '[room-code] rejects the wrong length %s',
    (input) => {
      expect(normalizeRoomCode(input)).toBeNull()
    }
  )
})
