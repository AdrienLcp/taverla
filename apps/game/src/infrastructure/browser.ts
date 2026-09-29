/**
 * The socket shares the page's origin: in dev the Vite proxy forwards `/ws` to
 * the server, in production the same host serves both. That is what lets the
 * QR code encode `location.origin` and keeps CORS out of the picture.
 */
export const socketOrigin = (): string =>
  `${location.protocol === 'https:' ? 'wss:' : 'ws:'}//${location.host}`

/** Most-preferred first, as BCP-47 tags — `['fr-FR', 'fr', 'en-US']`. */
export const preferredLocales = (): readonly string[] => navigator.languages

/**
 * The path the document was served at, which is where the language it is
 * written in is named. Read here rather than through the router because the
 * attribute on `<html>` has to be right before the router exists.
 */
export const servedPath = (): string => location.pathname

/** The thumb landing, and the server's answer to it one round trip later. */
export type BuzzMoment = 'lost' | 'press' | 'won'

/**
 * Written as a set because what tells a thumb which of these it is holding is
 * the contrast between them, never the length of any one: an acknowledging
 * tick, one firm thud at three times its length for the floor, and two shorter
 * knocks for a refusal — a shape no single pulse can be mistaken for, on a
 * motor this coarse.
 */
const BUZZ_PATTERNS: Record<BuzzMoment, VibratePattern> = {
  lost: [45, 65, 45],
  press: 30,
  won: 100
}

/**
 * Absent on iOS Safari, and silently so. Nothing may be built on top of it —
 * it confirms a buzz that the screen already confirmed.
 */
export const buzzFeedback = (moment: BuzzMoment): void => {
  navigator.vibrate?.(BUZZ_PATTERNS[moment])
}
