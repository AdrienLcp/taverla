import { describe, expect, it } from 'vitest'

import {
  clientMessageSchema,
  HOST_ONLY_MESSAGE_TYPES,
  playerClientMessageSchema
} from './client-message'

const allMessageTypes = clientMessageSchema.options.map(
  (option) => option.shape.type.value
)

describe('HOST_ONLY_MESSAGE_TYPES', () => {
  // The server gates privileged actions on this set, so a new `host.*` message
  // that nobody adds to it is silently executable by any player socket. The
  // naming convention is the invariant; this test is what makes it load-bearing
  // instead of decorative.
  it('[protocol] holds exactly the host-prefixed messages', () => {
    const hostPrefixed = allMessageTypes.filter((type) =>
      type.startsWith('host.')
    )

    expect([...HOST_ONLY_MESSAGE_TYPES].sort()).toEqual(hostPrefixed.sort())
  })
})

describe('playerClientMessageSchema', () => {
  it('[protocol] omits every host-only message', () => {
    const playerTypes = playerClientMessageSchema.options.map(
      (option) => option.shape.type.value
    )

    expect(
      playerTypes.filter((type) => HOST_ONLY_MESSAGE_TYPES.has(type))
    ).toEqual([])
  })

  it('[protocol] rejects a host frame sent from a player socket', () => {
    const judge = {
      playerId: 'p1',
      roundId: 'r1',
      type: 'host.judge',
      verdict: { artistCorrect: true, titleCorrect: true }
    }

    expect(playerClientMessageSchema.safeParse(judge).success).toBe(false)
    expect(clientMessageSchema.safeParse(judge).success).toBe(true)
  })
})

describe('buzz', () => {
  // Documented as a guarantee, so it gets a test: accepting a client-supplied
  // timestamp is what would make buzz order forgeable.
  it('[protocol] carries no client timestamp', () => {
    const buzzSchema = clientMessageSchema.options.find(
      (option) => option.shape.type.value === 'player.buzz'
    )

    expect(buzzSchema).toBeDefined()
    expect(Object.keys(buzzSchema?.shape ?? {}).sort()).toEqual([
      'roundId',
      'type'
    ])
  })
})
