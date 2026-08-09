/**
 * The socket shares the page's origin: in dev the Vite proxy forwards `/ws` to
 * the server, in production the same host serves both. That is what lets the
 * QR code encode `location.origin` and keeps CORS out of the picture.
 */
export const socketOrigin = (): string =>
  `${location.protocol === 'https:' ? 'wss:' : 'ws:'}//${location.host}`

/** Most-preferred first, as BCP-47 tags — `['fr-FR', 'fr', 'en-US']`. */
export const preferredLocales = (): readonly string[] => navigator.languages
