export const API_PREFIX = '/api'
export const SOCKET_PREFIX = '/ws'

/**
 * Every path either end of the wire names. The server registers the pattern and
 * the client fills it in with `fillRoute`, so a renamed route is one edit and a
 * missing parameter is a type error rather than a 404.
 */
export const API_ROUTES = {
  decadeTracks: `${API_PREFIX}/tracks/decades`,
  filmTracks: `${API_PREFIX}/tracks/films`,
  health: `${API_PREFIX}/health`,
  playlistTracks: `${API_PREFIX}/playlists/:playlistId/tracks`,
  room: `${API_PREFIX}/rooms/:code`,
  rooms: `${API_PREFIX}/rooms`,
  trackSearch: `${API_PREFIX}/tracks/search`,
  wall: `${API_PREFIX}/walls/:pairingCode`,
  wallPair: `${API_PREFIX}/walls/:pairingCode/pair`,
  walls: `${API_PREFIX}/walls`
} as const

export const ROOM_SOCKET_ROUTE = `${SOCKET_PREFIX}/rooms/:code` as const

type RouteParam<TRoute extends string> =
  TRoute extends `${string}:${infer Param}/${infer Rest}`
    ? Param | RouteParam<Rest>
    : TRoute extends `${string}:${infer Param}`
      ? Param
      : never

export const fillRoute = <TRoute extends string>(
  route: TRoute,
  params: Readonly<Record<RouteParam<TRoute>, string>>
): string => {
  const values: Readonly<Record<string, string>> = params

  return route.replace(/:(\w+)/g, (_, name: string) =>
    encodeURIComponent(values[name] ?? '')
  )
}
