import type React from 'react'

/**
 * The two measurements a stylesheet cannot take of a string it never sees, and
 * both decide whether the answer fits the column it is set in: how much there
 * is of it, and how long its longest *unbreakable* run is. A hyphen and a space
 * are break opportunities, so `Maison-Blanche` is seven characters wide rather
 * than fourteen, and an answer of short words is long without holding any
 * single line hostage.
 *
 * Both surfaces reveal the same string in a column neither of them owns the
 * width of — the player's screen splits at `$wide-screen` and the console's
 * panel is a fraction of a split stage — so the fact travels with the answer
 * rather than being taken twice.
 */
export const answerFitting = (answer: string): React.CSSProperties => ({
  '--answer-length': answer.length,
  '--longest-word': Math.max(
    1,
    ...answer.split(/[\s-]+/u).map((run) => run.length)
  )
})
