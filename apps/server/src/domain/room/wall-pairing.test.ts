import { describe, expect, it } from 'vitest'

import {
  collectWallPairing,
  openWallPairing,
  pairWall,
  WALL_PAIRING_TTL_MS
} from './wall-pairing'

const NOW = 1_786_215_000_000

const opened = () => {
  const pairing = openWallPairing(NOW)

  if (pairing === null) {
    throw new Error('the store refused to allocate a pairing code')
  }

  return pairing
}

describe('wall pairing', () => {
  it('[wall-pairing] keeps a screen waiting until the host vouches for it', () => {
    const { pairingCode, secret } = opened()

    expect(collectWallPairing({ now: NOW, pairingCode, secret })).toEqual({
      data: { status: 'waiting' },
      status: 'success'
    })
  })

  it('[wall-pairing] hands the token over once, to the screen holding the secret', () => {
    const { pairingCode, secret } = opened()

    pairWall({ hostToken: 'ABCDEFGH', now: NOW, pairingCode, roomCode: 'K3M9' })

    expect(
      collectWallPairing({ now: NOW, pairingCode, secret: 'x'.repeat(24) })
        .status
    ).toBe('failure')
    expect(collectWallPairing({ now: NOW, pairingCode, secret })).toEqual({
      data: { hostToken: 'ABCDEFGH', roomCode: 'K3M9', status: 'paired' },
      status: 'success'
    })
    expect(collectWallPairing({ now: NOW, pairingCode, secret }).status).toBe(
      'failure'
    )
  })

  it('[wall-pairing] forgets a code nobody paired in time', () => {
    const { pairingCode, secret } = opened()
    const later = NOW + WALL_PAIRING_TTL_MS

    expect(
      pairWall({
        hostToken: 'ABCDEFGH',
        now: later,
        pairingCode,
        roomCode: 'K3M9'
      }).status
    ).toBe('failure')
    expect(collectWallPairing({ now: later, pairingCode, secret }).status).toBe(
      'failure'
    )
  })
})
