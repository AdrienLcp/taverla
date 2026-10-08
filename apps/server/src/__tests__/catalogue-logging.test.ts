import { Result } from '@adrienlcp/result'
import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  type MockInstance,
  vi
} from 'vitest'

import { API_ROUTES } from '@taverla/protocol/routes'

import { logger } from '@/infrastructure/logging/logger'
import type { MusicSourceFault } from '@/infrastructure/music/music-source'

import { startRoomHarness } from './node-room-harness'
import { CATALOGUE, type RoomHarness, waitFor } from './room-harness'

// A static import of the client hands this file a different instance from the
// app's, and the app then talks to the real Deezer.
const fetchTracks = vi.hoisted(() => vi.fn())

vi.mock('@/infrastructure/music/deezer-client', async () => {
  const { deezerClientStub } = await import('./room-harness')
  const stub = deezerClientStub()

  fetchTracks.mockImplementation(stub.fetchTracksFor)

  return { ...stub, fetchTracksFor: fetchTracks }
})

const OUTAGE: MusicSourceFault = {
  detail: '503',
  kind: 'http_error',
  path: '/chart/0/tracks'
}

const TYPO: MusicSourceFault = {
  detail: null,
  kind: 'not_found',
  path: '/playlist/404'
}

const catalogueDown = () =>
  Result.failure({
    code: 'music_source_unavailable' as const,
    faults: [OUTAGE]
  })

const oneUnknownPath = () =>
  Result.success({ faults: [TYPO], tracks: CATALOGUE })

let harness: RoomHarness
let error: MockInstance<typeof logger.error>
let warn: MockInstance<typeof logger.warn>

beforeEach(async () => {
  error = vi.spyOn(logger, 'error').mockImplementation(() => {})
  warn = vi.spyOn(logger, 'warn').mockImplementation(() => {})
  harness = await startRoomHarness()
})

afterEach(async () => {
  await harness.stop()
  vi.restoreAllMocks()
})

const listFilmTracks = () =>
  fetch(`http://${harness.origin}${API_ROUTES.filmTracks}`)

describe('a catalogue failure is logged once, where it is decided', () => {
  it('[logging] reports an outage behind a track listing as an error with its route', async () => {
    fetchTracks.mockResolvedValueOnce(catalogueDown())

    const response = await listFilmTracks()

    expect(response.status).toBe(502)
    expect(warn).not.toHaveBeenCalled()
    expect(error).toHaveBeenCalledExactlyOnceWith('Could not list tracks', {
      faults: [OUTAGE],
      path: API_ROUTES.filmTracks
    })
  })

  it('[logging] reports a listing served past an unknown path as a warning', async () => {
    fetchTracks.mockResolvedValueOnce(oneUnknownPath())

    const response = await listFilmTracks()

    expect(response.status).toBe(200)
    expect(error).not.toHaveBeenCalled()
    expect(warn).toHaveBeenCalledExactlyOnceWith(
      'Listed tracks past failing catalogue paths',
      { faults: [TYPO], path: API_ROUTES.filmTracks }
    )
  })

  it('[logging] reports a round the catalogue refused as an error with its room', async () => {
    fetchTracks.mockResolvedValueOnce(catalogueDown())
    const { code, host } = await harness.openRoom()

    host.send({ type: 'host.startRound' })
    await waitFor(() => error.mock.calls.length > 0, 'the refusal to be logged')

    expect(warn).not.toHaveBeenCalled()
    expect(error).toHaveBeenCalledExactlyOnceWith('Could not draw a track', {
      code,
      faults: [OUTAGE],
      reason: 'music_source_unavailable'
    })
  })

  it('[logging] reports a round drawn past an unknown path as a warning with its room', async () => {
    fetchTracks.mockResolvedValueOnce(oneUnknownPath())
    const { code, host } = await harness.openRoom()

    host.send({ type: 'host.startRound' })
    await waitFor(
      () => warn.mock.calls.length > 0,
      'the thin pool to be logged'
    )

    expect(error).not.toHaveBeenCalled()
    expect(warn).toHaveBeenCalledExactlyOnceWith(
      'Drew a track past failing catalogue paths',
      { code, faults: [TYPO] }
    )
  })
})
