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
 * Absent on iOS Safari, and silently so. Nothing may be built on top of it —
 * it confirms a buzz that the screen already confirmed.
 */
export const buzzFeedback = (): void => {
  navigator.vibrate?.(30)
}

/**
 * `navigator.clipboard` exists only in a secure context, and the host is served
 * over plain HTTP on a LAN address as often as from the deployed origin — the
 * same trap `crypto.randomUUID` sprang on the session id. `execCommand` is
 * deprecated and is the only thing that answers there, so it stays until every
 * way of reaching a host is HTTPS.
 */
export const copyToClipboard = async (text: string): Promise<boolean> => {
  if (navigator.clipboard !== undefined) {
    try {
      await navigator.clipboard.writeText(text)

      return true
    } catch {
      return copyThroughSelection(text)
    }
  }

  return copyThroughSelection(text)
}

const copyThroughSelection = (text: string): boolean => {
  const carrier = document.createElement('textarea')

  carrier.value = text
  carrier.setAttribute('readonly', '')
  carrier.style.cssText = 'position:fixed;opacity:0'
  document.body.append(carrier)
  carrier.select()

  const copied = document.execCommand('copy')

  carrier.remove()

  return copied
}
