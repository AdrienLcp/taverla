import { createServer } from 'node:http'

/**
 * Stands in for `api.deezer.com` during an end-to-end run, so a journey never
 * depends on what is charting today — or on the network being there at all.
 * The server reaches it through `DEEZER_API_URL`, which is the same seam a real
 * catalogue swap would use.
 */
const PORT = Number(process.env.DEEZER_STUB_PORT) || 3199

/** A hundredth of a second of silence: the host only has to be able to load it. */
const AUDIBLE_NOTHING =
  'data:audio/wav;base64,UklGRiwAAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQgAAACAgICAgICAgA=='

/** Above the client's `MINIMUM_TRACK_RANK`, or the pool would drop every one. */
const RANK = 900_000

const TRACKS = [
  {
    album: { cover_medium: null },
    artist: { name: 'Daft Punk' },
    id: '1',
    preview: AUDIBLE_NOTHING,
    rank: RANK,
    title: 'Around the World'
  },
  {
    album: { cover_medium: null },
    artist: { name: 'Justice' },
    id: '2',
    preview: AUDIBLE_NOTHING,
    rank: RANK,
    title: 'Genesis'
  },
  {
    album: { cover_medium: null },
    artist: { name: 'Air' },
    id: '3',
    preview: AUDIBLE_NOTHING,
    rank: RANK,
    title: 'Sexy Boy'
  }
]

const bodyFor = (path: string): unknown => {
  const trackId = /^\/track\/([^/?]+)/.exec(path)?.[1]

  if (trackId === undefined) {
    return { data: TRACKS }
  }

  const found = TRACKS.find((track) => track.id === trackId)

  // Deezer answers an unknown id with HTTP 200 and an error body, and the
  // client is written against that; a stub that 404s would exercise a path
  // production never takes.
  return (
    found ?? { error: { code: 800, message: 'no data', type: 'DataException' } }
  )
}

createServer((request, response) => {
  response.writeHead(200, { 'content-type': 'application/json' })
  response.end(JSON.stringify(bodyFor(request.url ?? '/')))
}).listen(PORT, () => {
  process.stdout.write(`Catalogue stub listening on ${PORT}\n`)
})
