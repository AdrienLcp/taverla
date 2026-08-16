import type { RoomPhase } from '@taverla/protocol/room'

/**
 * Below this a reload landed close enough to the start that seeking would be
 * noise — the clip is already where the room is.
 */
const SEEK_THRESHOLD_MS = 750

/**
 * Where to move the clip to, or `null` to leave it alone. It answers two cases
 * with one rule: a clip paused by a buzz is already at the right second, and a
 * console that reloaded into a running round is at nought while the room is
 * twenty seconds in.
 *
 * Only ever forward. A clip *ahead* of the round is a rounding error or a
 * device whose decoder ran on, and yanking it back is audible where letting it
 * run is not.
 */
export const seekTargetMs = ({
  elapsedMs,
  playedMs
}: {
  /** How far into the round the server says the room is. */
  elapsedMs: number
  /** How far into the clip this screen has actually played. */
  playedMs: number
}): number | null =>
  playedMs < elapsedMs - SEEK_THRESHOLD_MS ? elapsedMs : null

/**
 * Whether this screen is silent through a round that should be sounding — the
 * one fault in the product a green build and a screenshot both miss, because a
 * silent round is *visually identical* to one that plays: the clip's progress
 * comes from the server, buzzes work, and the reveal lands.
 *
 * It is not an autoplay refusal. An autoplay policy grants permission to the
 * **element**, and this screen has none: the element is minted inside the press
 * that opens a round, so a console that reloaded mid-round, restored a tab or
 * had the address pasted into it never asked the browser anything at all. That
 * is why the answer is a gesture rather than a volume.
 */
export const isClipUnheard = ({
  canPlay,
  hasClip,
  phase
}: {
  /** Whether a press has blessed an audio element on this screen. */
  canPlay: boolean
  /** Whether the round this screen is on serves audio at all. */
  hasClip: boolean
  phase: RoomPhase | null
}): boolean =>
  !canPlay && hasClip && (phase === 'countdown' || phase === 'playing')

/**
 * Why a screen could not play, in the three answers the room needs rather than
 * the browser's own list: press again, host from something else, or we broke it.
 */
export type ClipRefusal = 'blocked' | 'broken' | 'unsupported'

/**
 * What a rejected `play()` means for the screen. `null` is the one rejection
 * that is not a refusal at all: an `AbortError` is the next `load()` cutting
 * this one short, the round is driven by the server either way, and saying
 * anything about it would put a message on a screen that is working.
 *
 * It takes the name rather than the exception so this stays free of the DOM —
 * `null` for a rejection that was not a `DOMException`, which tells the room as
 * little as an unrecognised name does.
 */
export const clipRefusalFor = (name: string | null): ClipRefusal | null => {
  switch (name) {
    case 'AbortError':
      return null
    case 'NotAllowedError':
      return 'blocked'
    case 'NotSupportedError':
      return 'unsupported'
    default:
      return 'broken'
  }
}
