import { useEffect, useRef } from 'react'

import type { HostRoomView } from '@taverla/protocol/room'

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

/** Below this, a reload is close enough to the start that seeking would be noise. */
const SEEK_THRESHOLD_MS = 750

/**
 * Silence, so the element can be blessed inside the press that starts the game.
 * Autoplay policy attaches permission to the element, not to the source — and it
 * cannot be granted later, when the preview URL finally arrives over the socket.
 */
const SILENCE =
  'data:audio/wav;base64,UklGRiwAAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQgAAACAgICAgICAgA=='

/**
 * `play()` returns a promise that rejects when the next `load()` cuts it short,
 * and again when an autoplay policy refuses it. Neither is actionable — the
 * round is driven by the server either way — and unhandled they reach the
 * console of the one screen the room is looking at.
 */
const play = (audio: HTMLAudioElement): void => {
  void audio.play().catch(() => {})
}

export type RoundAudio = {
  /**
   * MUST be called synchronously inside a user gesture, before the first round.
   * Called later — from an effect, or from the socket frame that brings the
   * track — it silently does nothing and no audio ever plays.
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
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const clockRef = useRef(clock)
  const volumeRef = useRef(volume)
  const loadedRoundRef = useRef<string | null>(null)

  useEffect(() => {
    clockRef.current = clock
  })

  useEffect(() => {
    volumeRef.current = volume

    if (audioRef.current !== null) {
      audioRef.current.volume = volume
    }
  }, [volume])

  useEffect(
    () => () => {
      audioRef.current?.pause()
      audioRef.current = null
    },
    []
  )

  const phase = view?.phase ?? null
  const round = view?.round ?? null
  const previewUrl = blindtestHostContent(view)?.audioUrl ?? null
  const startsAt = round?.startsAt ?? null
  const roundId = round?.id ?? null
  const elapsedMs = view?.roundElapsedMs ?? 0

  useEffect(() => {
    const audio = audioRef.current

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
      if (audio.currentTime * 1_000 < elapsedMs - SEEK_THRESHOLD_MS) {
        audio.currentTime = elapsedMs / 1_000
      }

      play(audio)

      return
    }

    if (startsAt === null) {
      return
    }

    audio.currentTime = 0

    let frame = 0

    const startWhenDue = (): void => {
      if (millisecondsUntil(clockRef.current, startsAt, Date.now()) <= 0) {
        play(audio)

        return
      }

      frame = requestAnimationFrame(startWhenDue)
    }

    const timer = window.setTimeout(
      startWhenDue,
      Math.max(
        0,
        millisecondsUntil(clockRef.current, startsAt, Date.now()) - SPIN_LEAD_MS
      )
    )

    return () => {
      window.clearTimeout(timer)
      cancelAnimationFrame(frame)
    }
  }, [elapsedMs, phase, previewUrl, roundId, startsAt])

  return {
    unlock: () => {
      if (audioRef.current !== null) {
        return
      }

      const audio = new Audio(SILENCE)

      audio.preload = 'auto'
      audio.volume = volumeRef.current
      void audio
        .play()
        .then(() => {
          audio.pause()
        })
        .catch(() => {})

      audioRef.current = audio
    }
  }
}
