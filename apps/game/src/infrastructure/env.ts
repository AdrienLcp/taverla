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

/**
 * Absent on iOS Safari, and silently so. Nothing may be built on top of it —
 * it confirms a buzz that the screen already confirmed.
 */
export const buzzFeedback = (): void => {
  navigator.vibrate?.(30)
}

/**
 * Holds the screen awake until the returned function is called, taking the
 * sentinel again every time the document comes back: a user agent releases it
 * on the way out and never returns it on its own.
 *
 * **Playing audio protects nothing.** Chromium's media wake lock is built from
 * a video track, so the clip a console is playing lets its own screen sleep —
 * and it is the room's only speaker.
 *
 * Absent before Safari 16.4 and outside a secure context, the same LAN-over-
 * HTTP trap `copyToClipboard` names below, and a phone low on battery may
 * refuse or revoke it at any moment. None of the three is worth a word on
 * screen: the screen sleeps the way it always did, and the next time the tab
 * comes back this tries again.
 */
export const keepScreenAwake = (): (() => void) => {
  let sentinel: WakeLockSentinel | null = null
  let isTaking = false
  let isWanted = true

  const isHeld = (): boolean => sentinel !== null && !sentinel.released

  const take = async (): Promise<void> => {
    if (!isWanted || isTaking || isHeld() || document.hidden) {
      return
    }

    isTaking = true

    try {
      const taken = await navigator.wakeLock?.request('screen')

      if (taken === undefined) {
        return
      }

      if (isWanted) {
        sentinel = taken
      } else {
        void taken.release()
      }
    } catch {
      // Refused or revoked, both of which the spec allows at any time.
    } finally {
      isTaking = false
    }
  }

  const takeOnReturn = (): void => {
    void take()
  }

  document.addEventListener('visibilitychange', takeOnReturn)
  void take()

  return () => {
    isWanted = false
    document.removeEventListener('visibilitychange', takeOnReturn)

    if (isHeld()) {
      void sentinel?.release()
    }

    sentinel = null
  }
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
