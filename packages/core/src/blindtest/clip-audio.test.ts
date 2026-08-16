import { describe, expect, it } from 'vitest'

import { clipRefusalFor, isClipUnheard, seekTargetMs } from './clip-audio'

describe('seekTargetMs', () => {
  it('[clip] leaves a clip that is where the room is', () => {
    expect(seekTargetMs({ elapsedMs: 12_000, playedMs: 11_800 })).toBeNull()
  })

  /**
   * A buzz pauses the clip and the round's clock together, so the two are still
   * on the same second when it resumes. Seeking there would be a jump nobody
   * asked for.
   */
  it('[clip] leaves a clip a buzz paused', () => {
    expect(seekTargetMs({ elapsedMs: 8_400, playedMs: 8_400 })).toBeNull()
  })

  it('[clip] catches up a screen that arrived mid-round', () => {
    expect(seekTargetMs({ elapsedMs: 20_000, playedMs: 0 })).toBe(20_000)
  })

  /**
   * Only ever forward: a clip ahead of the round is a rounding error or a
   * decoder that ran on, and yanking it back is audible where letting it run is
   * not.
   */
  it('[clip] never drags a clip backwards', () => {
    expect(seekTargetMs({ elapsedMs: 9_000, playedMs: 12_000 })).toBeNull()
  })
})

describe('isClipUnheard', () => {
  const RUNNING = { canPlay: false, hasClip: true, phase: 'playing' } as const

  it('[clip] says so when a screen with no element is on a running clip', () => {
    expect(isClipUnheard(RUNNING)).toBe(true)
    expect(isClipUnheard({ ...RUNNING, phase: 'countdown' })).toBe(true)
  })

  it('[clip] says nothing once a press has blessed an element', () => {
    expect(isClipUnheard({ ...RUNNING, canPlay: true })).toBe(false)
  })

  /**
   * Three of the four games serve no audio, and the blind test's own reveal is
   * past the clip. Offering to start music there would be a screen apologising
   * for silence that is the design.
   */
  it('[clip] says nothing where there is no clip to hear', () => {
    expect(isClipUnheard({ ...RUNNING, hasClip: false })).toBe(false)

    for (const phase of ['lobby', 'buzzed', 'revealed', 'finished'] as const) {
      expect(isClipUnheard({ ...RUNNING, phase })).toBe(false)
    }
  })
})

describe('clipRefusalFor', () => {
  /**
   * The one that must stay silent. A round is driven by the server, so a clip
   * cut short by the next `load()` has cost the room nothing — and a screen
   * apologising for it would be a screen apologising for working.
   */
  it('[clip] does not call an abort a refusal', () => {
    expect(clipRefusalFor('AbortError')).toBeNull()
  })

  it('[clip] tells a policy refusal from a source it cannot play', () => {
    expect(clipRefusalFor('NotAllowedError')).toBe('blocked')
    expect(clipRefusalFor('NotSupportedError')).toBe('unsupported')
  })

  /**
   * A rejection nobody anticipated is still a screen that will not sound, and
   * the console has to say so — throwing it away is the whole fault this
   * classification exists to end.
   */
  it('[clip] owns up to a rejection it cannot name', () => {
    expect(clipRefusalFor('QuotaExceededError')).toBe('broken')
    expect(clipRefusalFor(null)).toBe('broken')
  })
})
