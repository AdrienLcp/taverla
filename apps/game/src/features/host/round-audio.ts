import { useCallback, useEffect, useEffectEvent, useRef, useState } from 'react'

import type { HostRoomView } from '@taverla/protocol/room'

import {
  type ClipRefusal,
  clipRefusalFor,
  seekTargetMs
} from '@taverla/core/blindtest/clip-audio'
import {
  type ClockEstimate,
  millisecondsUntil
} from '@taverla/core/time/clock-sync'

import { blindtestHostContent } from '@/helpers/round-content'

/**
 * `setTimeout` is only accurate to a handful of milliseconds under load, which
 * is the wrong order of magnitude for a countdown a room watches together. It
 * wakes this early and the last stretch is spun on `requestAnimationFrame`,
 * which is the clock the compositor is already keeping.
 */
const SPIN_LEAD_MS = 200

/**
 * Silence, so the element can be blessed inside the press that starts the game.
 * Autoplay policy attaches permission to the element, not to the source — and it
 * cannot be granted later, when the preview URL finally arrives over the socket.
 */
const SILENCE =
  'data:audio/wav;base64,UklGRiwAAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQgAAACAgICAgICAgA=='

/**
 * The browser's own name for a rejection, and `null` when it did not give one —
 * which `clipRefusalFor` reads as telling the room nothing.
 */
const nameOf = (refusal: unknown): string | null =>
  refusal instanceof DOMException ? refusal.name : null

/**
 * A rejected `play()` means this screen is not armed after all, whatever the
 * reason: the console has to say which and offer the press again, or the tab is
 * mute for the rest of the evening with a message that never changes.
 */
const play = (
  audio: HTMLAudioElement,
  onRefused: (refusal: ClipRefusal) => void
): void => {
  void audio.play().catch((refusal: unknown) => {
    const refused = clipRefusalFor(nameOf(refusal))

    if (refused !== null) {
      onRefused(refused)
    }
  })
}

export type RoundAudio = {
  /**
   * Whether a press has blessed an element on this screen. `false` after a
   * reload, a restored tab or an address pasted into a console mid-round — the
   * three ways of arriving at a running clip with nothing able to play it.
   */
  canPlay: boolean
  /**
   * Why the last attempt to arm or to play was turned down, and `null` while
   * none has been. It is what stops the console offering an identical press
   * forever: the offer stays, because a policy can change between two of them,
   * but the screen says what happened the last time.
   */
  refusal: ClipRefusal | null
  /**
   * MUST be called synchronously inside a user gesture. Called later — from an
   * effect, or from the socket frame that brings the track — it silently does
   * nothing and no audio ever plays.
   */
  unlock: () => void
}

export const useRoundAudio = ({
  clock,
  view,
  volume
}: {
  clock: ClockEstimate | null
  view: HostRoomView | null
  /** 0 to 1. */
  volume: number
}): RoundAudio => {
  const loadedRoundRef = useRef<string | null>(null)
  /**
   * The blessed element is **state**, not a ref, and that is the whole of what
   * makes a mid-round press take: the effect below is what loads, seeks and
   * plays, and a ref changing re-runs nothing. It is also the honest dependency
   * — a boolean beside a ref says the same thing twice and only one of them is
   * in the list.
   */
  const [audio, setAudio] = useState<HTMLAudioElement | null>(null)
  const [refusal, setRefusal] = useState<ClipRefusal | null>(null)

  // `useCallback` for the one reason that survives the compiler: it is a
  // dependency of the effect below, and a fresh identity there would tear the
  // clip down and start it again on every render.
  const disarm = useCallback((refused: ClipRefusal): void => {
    loadedRoundRef.current = null
    setAudio(null)
    setRefusal(refused)
  }, [])

  // Every pong moves the clock estimate, and a dependency on it would re-arm
  // the clip — restarting a running one — several times a second.
  const millisecondsUntilStart = useEffectEvent((target: number): number =>
    millisecondsUntil(clock, target, Date.now())
  )

  useEffect(() => {
    if (audio !== null) {
      audio.volume = volume
    }
  }, [audio, volume])

  // On the way out, and on the way to a disarmed screen: an element nobody is
  // going to reach again must not go on sounding.
  useEffect(() => () => audio?.pause(), [audio])

  const phase = view?.phase ?? null
  const round = view?.round ?? null
  const previewUrl = blindtestHostContent(view)?.audioUrl ?? null
  const startsAt = round?.startsAt ?? null
  const roundId = round?.id ?? null
  const elapsedMs = view?.roundElapsedMs ?? 0

  useEffect(() => {
    if (audio === null) {
      return
    }

    if (phase === 'lobby' || phase === 'revealed' || phase === 'finished') {
      audio.pause()

      return
    }

    if (phase === 'buzzed') {
      audio.pause()

      return
    }

    if (previewUrl === null || roundId === null) {
      return
    }

    if (loadedRoundRef.current !== roundId) {
      loadedRoundRef.current = roundId
      audio.src = previewUrl
      audio.load()
    }

    if (phase === 'playing') {
      // Either the clip was paused by a buzz, or this host just reloaded into a
      // round already running — `roundElapsedMs` is what tells the two apart.
      const seekTo = seekTargetMs({
        elapsedMs,
        playedMs: audio.currentTime * 1_000
      })

      if (seekTo !== null) {
        audio.currentTime = seekTo / 1_000
      }

      play(audio, disarm)

      return
    }

    if (startsAt === null) {
      return
    }

    audio.currentTime = 0

    let frame = 0

    const startWhenDue = (): void => {
      if (millisecondsUntilStart(startsAt) <= 0) {
        play(audio, disarm)

        return
      }

      frame = requestAnimationFrame(startWhenDue)
    }

    const timer = window.setTimeout(
      startWhenDue,
      Math.max(0, millisecondsUntilStart(startsAt) - SPIN_LEAD_MS)
    )

    return () => {
      window.clearTimeout(timer)
      cancelAnimationFrame(frame)
    }
    // The element is a dependency because arming happens *during* a round now:
    // a console that reloaded mid-clip presses once, and this has to run again
    // or the element sits blessed and silent until the next round opens.
  }, [audio, disarm, elapsedMs, phase, previewUrl, roundId, startsAt])

  return {
    canPlay: audio !== null,
    refusal,
    unlock: () => {
      if (audio !== null) {
        return
      }

      const blessed = new Audio(SILENCE)

      blessed.preload = 'auto'
      blessed.volume = volume

      // Kept only once the browser has actually let it play. Storing it either
      // way is what made a refused first press permanent: the guard above then
      // answered every later press with a silent no-op, and the tab was mute
      // for the rest of the evening.
      void blessed.play().then(
        () => {
          blessed.pause()
          setAudio(blessed)
          setRefusal(null)
        },
        (refused: unknown) => {
          // The branch that swallowed everything, which is why a console could
          // press all evening and never learn that every press had failed. An
          // abort cannot happen here — nothing else loads this element — so
          // there is no rejection this may drop.
          setRefusal(clipRefusalFor(nameOf(refused)) ?? 'broken')
        }
      )
    }
  }
}
