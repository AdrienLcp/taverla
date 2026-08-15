import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { hostServerMessageSchema } from '@taverla/protocol/server-message'
import { PROTOCOL_VERSION } from '@taverla/protocol/version'

import {
  errorsIn,
  hostView,
  playerView,
  type RoomHarness,
  startRoomHarness,
  waitFor
} from './room-harness'

vi.mock('@/infrastructure/music/deezer-client', async () => {
  const { deezerClientStub } = await import('./room-harness')

  return deezerClientStub()
})

describe('who owns a room', () => {
  let harness: RoomHarness

  beforeEach(async () => {
    harness = await startRoomHarness()
  })

  afterEach(async () => {
    await harness.stop()
  })

  it('[host-ownership] refuses a console arriving in the seconds after the room lost its own', async () => {
    const { code, host } = await harness.openRoom()
    const watcher = await harness.seat({ code, nickname: 'Zoe' })

    host.close()
    await waitFor(
      () => playerView(watcher)?.isHostConnected === false,
      'the room to lose its console'
    )

    const passerby = await harness.connect(code, hostServerMessageSchema)

    passerby.send({
      protocolVersion: PROTOCOL_VERSION,
      role: 'host',
      type: 'hello'
    })

    expect(await passerby.whenClosed).toBe(1008)
    expect(errorsIn(passerby)[0]).toMatchObject({
      code: 'host_reconnecting',
      fatal: true
    })
  })

  it('[host-ownership] hands the room to a screen holding the token, and ends the one that had it', async () => {
    const { code, host, hostToken } = await harness.openRoom()
    const television = await harness.connect(code, hostServerMessageSchema)

    television.send({
      hostToken,
      protocolVersion: PROTOCOL_VERSION,
      role: 'host',
      type: 'hello'
    })

    await waitFor(() => hostView(television) !== null, 'the token to be taken')
    await waitFor(
      () => errorsIn(host).length > 0,
      'the screen that had the room to be told'
    )

    expect(errorsIn(host)[0]).toMatchObject({
      code: 'host_already_connected',
      fatal: true
    })
  })

  it('[host-ownership] refuses a token that is not the room own', async () => {
    const { code, host } = await harness.openRoom()
    const watcher = await harness.seat({ code, nickname: 'Zoe' })

    host.close()
    await waitFor(
      () => playerView(watcher)?.isHostConnected === false,
      'the room to lose its console'
    )

    const guesser = await harness.connect(code, hostServerMessageSchema)

    guesser.send({
      hostToken: 'ABCDABCD',
      protocolVersion: PROTOCOL_VERSION,
      role: 'host',
      type: 'hello'
    })

    expect(await guesser.whenClosed).toBe(1008)
    expect(errorsIn(guesser)[0]).toMatchObject({ code: 'host_reconnecting' })
  })
})
