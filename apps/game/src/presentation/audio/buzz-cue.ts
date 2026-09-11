import { useEffect, useRef } from 'react'

import type { ServerTime } from '@taverla/protocol/identifiers'

import { useVolume } from './volume-provider'

/**
 * A perfect fifth, which is the interval a plateau buzzer honks and the one that
 * reads as an interruption rather than as a note. Two squares rather than one:
 * a lone square is a test tone, and the beating between these two is what the
 * ear files under *buzzer*.
 */
const CUE_TONES_HZ = [294, 441] as const

/**
 * Loud enough to carry a room that has just gone quiet — the clip is paused by
 * the time this sounds — and quiet enough that a console left at full volume is
 * not a slap.
 */
const CUE_PEAK_GAIN = 0.3

/** Hard on purpose: the cue's job is to mark a moment, not to swell into one. */
const CUE_ATTACK_S = 0.004

const CUE_LENGTH_S = 0.2

/**
 * A bare square on a laptop speaker is all top end. The shape below this is what
 * says *buzzer*; the harmonics above it only say *loud*.
 */
const CUE_CUTOFF_HZ = 2_400

/**
 * `exponentialRampToValueAtTime` refuses zero, and a linear tail to silence
 * would undo the decay that makes the honk land. Inaudible, and the oscillators
 * stop on the same instant.
 */
const SILENT_GAIN = 0.0001

/**
 * One per tab, and **only ever built inside a gesture**: a context created from
 * an effect is born `suspended` and a later `resume()` is refused, which is the
 * same policy `round-audio.ts` blesses its element under.
 */
let context: AudioContext | null = null

/**
 * MUST be called synchronously inside a user gesture, beside the press that
 * arms the clip. Called from anywhere else the context never starts and no cue
 * ever sounds.
 */
export const unlockBuzzCue = (): void => {
  context ??= new AudioContext()

  void context.resume()
}

/**
 * Synthesised rather than loaded, because the repository holds no audio asset
 * and this is not worth the first one: an oscillator and a short envelope give
 * the board buzzer the design's own lineage asks for — French television
 * variety, 1972–81 — with no binary, no licence and no byte to serve.
 *
 * Silent on a screen that never pressed, deliberately: the console already says
 * out loud when it cannot play, and a cue is not worth a second message.
 */
const playBuzzCue = (volume: number): void => {
  if (volume <= 0 || context === null || context.state !== 'running') {
    return
  }

  const startsAt = context.currentTime
  const endsAt = startsAt + CUE_LENGTH_S

  const envelope = context.createGain()
  const cut = context.createBiquadFilter()

  cut.type = 'lowpass'
  cut.frequency.value = CUE_CUTOFF_HZ
  cut.connect(envelope)
  envelope.connect(context.destination)

  envelope.gain.setValueAtTime(0, startsAt)
  envelope.gain.linearRampToValueAtTime(
    CUE_PEAK_GAIN * volume,
    startsAt + CUE_ATTACK_S
  )
  envelope.gain.exponentialRampToValueAtTime(SILENT_GAIN, endsAt)

  for (const hertz of CUE_TONES_HZ) {
    const tone = context.createOscillator()

    tone.type = 'square'
    tone.frequency.value = hertz
    tone.connect(cut)
    tone.start(startsAt)
    tone.stop(endsAt)
  }
}

/**
 * The honk when a buzz takes the floor, on the one screen the room is listening
 * to. It is the console's alone for the reason every other sound is: eight
 * screens at unknown volumes, staggered by Wi-Fi, is noise rather than a cue.
 *
 * Stamped with the buzz it fired for rather than flagged, because the `buzzed`
 * snapshot is re-delivered constantly — every roster change, every settings
 * frame, and every reconnection, which lands the view as `room.updated` — and an
 * effect watching the phase would honk five times for one press.
 *
 * `atServerTime` is the identity, never `expiresAt`: the window is rewritten
 * when a host comes back, and a cue keyed on it would fire again on a Wi-Fi
 * blink. Which is why this takes the stamp and not the buzz.
 */
export const useBuzzCue = (buzzedAt: ServerTime | null): void => {
  const playedForRef = useRef<ServerTime | null>(null)
  const { volume } = useVolume()

  useEffect(() => {
    // The guard is what lets the volume sit honestly in the list below: turning
    // the slider during a buzz re-runs this, and a stamp already played for is
    // refused here rather than by leaving the dependency out.
    if (buzzedAt === null || buzzedAt === playedForRef.current) {
      return
    }

    playedForRef.current = buzzedAt
    playBuzzCue(volume)
  }, [buzzedAt, volume])
}
