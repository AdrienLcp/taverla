import type { CatalogueTrack } from '@taverla/protocol/http'

/**
 * The music catalogue's failure vocabulary, apart from the client that speaks
 * to Deezer so a test that stubs the client keeps it.
 */
export type MusicSourceError =
  | 'music_source_unavailable'
  | 'no_content_available'

/**
 * One Deezer path that failed, and how. `not_found` is an id nobody can look
 * up — a host's typo, not an outage; every other kind is the catalogue failing
 * us.
 */
export type MusicSourceFault = {
  /** The HTTP status, Deezer's own error type, or what the request threw. */
  detail: string | null
  kind:
    | 'declared_error'
    | 'http_error'
    | 'not_found'
    | 'request_threw'
    | 'unexpected_shape'
  path: string
}

/**
 * The code the caller answers with, and the faults behind it for the caller
 * that logs. No faults is Deezer answering and nothing in it being playable —
 * or a request the caller itself abandoned.
 */
export type MusicSourceFailure = {
  code: MusicSourceError
  faults: readonly MusicSourceFault[]
}

export const NOTHING_PLAYABLE: MusicSourceFailure = {
  code: 'no_content_available',
  faults: []
}

/** Whether faults are the catalogue's doing rather than the host's or nobody's. */
export const isOutage = (faults: readonly MusicSourceFault[]): boolean =>
  faults.some((fault) => fault.kind !== 'not_found')

/**
 * What a source answered, with the paths that failed beside it: one chart of
 * several down is a thinner pool rather than a refused round, but still worth
 * the caller's log.
 */
export type CataloguePool = {
  faults: readonly MusicSourceFault[]
  tracks: CatalogueTrack[]
}
