import { describe, expect, it } from 'vitest'

import {
  HOST_TOKEN_LENGTH,
  ROOM_CODE_ALPHABET
} from '@taverla/protocol/identifiers'

import { generateHostToken, normalizeHostToken } from './host-token'

describe('generateHostToken', () => {
  it('[host-token] produces a token the wire schema accepts', () => {
    expect(normalizeHostToken(generateHostToken())).not.toBeNull()
  })

  it('[host-token] draws every character from the alphabet', () => {
    const tokens = Array.from({ length: 200 }, () => generateHostToken())

    for (const token of tokens) {
      expect(token).toHaveLength(HOST_TOKEN_LENGTH)
      expect(
        [...token].every((character) => ROOM_CODE_ALPHABET.includes(character))
      ).toBe(true)
    }
  })

  it('[host-token] maps each drawn index to its alphabet position', () => {
    let call = 0

    expect(generateHostToken(() => call++)).toBe(
      ROOM_CODE_ALPHABET.slice(0, HOST_TOKEN_LENGTH)
    )
  })
})

describe('normalizeHostToken', () => {
  it('[host-token] reads a token through the spacing somebody typed', () => {
    expect(normalizeHostToken(' abcd-efgh ')).toBe('ABCDEFGH')
  })

  it('[host-token] refuses a token of the wrong length', () => {
    expect(normalizeHostToken('ABCDEFG')).toBeNull()
    expect(normalizeHostToken('ABCDEFGHJ')).toBeNull()
  })

  it('[host-token] refuses a character the alphabet excludes', () => {
    expect(normalizeHostToken('ABCDEFG0')).toBeNull()
    expect(normalizeHostToken('ABCDEFGS')).toBeNull()
  })
})
