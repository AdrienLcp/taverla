import { describe, expect, it } from 'vitest'

import { API_ROUTES, fillRoute, ROOM_SOCKET_ROUTE } from './routes'

describe('fillRoute', () => {
  it('[routes] fills every parameter the pattern names', () => {
    expect(fillRoute(API_ROUTES.wallPair, { pairingCode: 'K3M9QX' })).toBe(
      '/api/walls/K3M9QX/pair'
    )
    expect(fillRoute(ROOM_SOCKET_ROUTE, { code: 'K3M9' })).toBe(
      '/ws/rooms/K3M9'
    )
  })

  it('[routes] encodes a parameter so it cannot add a segment', () => {
    expect(
      fillRoute(API_ROUTES.playlistTracks, { playlistId: '12/../34' })
    ).toBe('/api/playlists/12%2F..%2F34/tracks')
  })

  it('[routes] leaves a route without parameters as it is', () => {
    expect(fillRoute(API_ROUTES.health, {})).toBe('/api/health')
  })
})
