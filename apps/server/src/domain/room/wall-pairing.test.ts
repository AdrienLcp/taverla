import { describe, expect, it } from 'vitest'

import {
  collectWall,
  newWallPairing,
  vouchForWall,
  WALL_PAIRING_TTL_MS
} from './wall-pairing'

const NOW = 1_786_215_000_000
const SECRET = 'wall-secret'

const waiting = () => newWallPairing({ now: NOW, secret: SECRET })

const paired = () => {
  const vouched = vouchForWall({
    hostToken: 'ABCDEFGH',
    now: NOW,
    pairing: waiting(),
    roomCode: 'K3M9'
  })

  if (vouched.status === 'failure') {
    throw new Error('a live pairing refused a vouch')
  }

  return vouched.data
}

describe('wall pairing', () => {
  it('[wall-pairing] keeps a screen waiting until the host vouches for it', () => {
    const pairing = waiting()

    expect(collectWall({ now: NOW, pairing, secret: SECRET })).toEqual({
      data: { remaining: pairing, response: { status: 'waiting' } },
      status: 'success'
    })
  })

  it('[wall-pairing] hands the token over once, to the screen holding the secret', () => {
    const pairing = paired()

    expect(
      collectWall({ now: NOW, pairing, secret: 'x'.repeat(24) }).status
    ).toBe('failure')
    expect(collectWall({ now: NOW, pairing, secret: SECRET })).toEqual({
      data: {
        remaining: null,
        response: { hostToken: 'ABCDEFGH', roomCode: 'K3M9', status: 'paired' }
      },
      status: 'success'
    })
  })

  it('[wall-pairing] forgets a code nobody paired in time', () => {
    const later = NOW + WALL_PAIRING_TTL_MS

    expect(
      vouchForWall({
        hostToken: 'ABCDEFGH',
        now: later,
        pairing: waiting(),
        roomCode: 'K3M9'
      }).status
    ).toBe('failure')
    expect(
      collectWall({ now: later, pairing: waiting(), secret: SECRET }).status
    ).toBe('failure')
  })
})
