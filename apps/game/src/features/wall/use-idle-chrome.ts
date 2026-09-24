import { useEffect } from 'react'

/**
 * Long enough that somebody setting the wall up is never chased off the
 * controls they are reaching for, short enough that the room reads the
 * invitation rather than the chrome around it.
 */
const IDLE_AFTER_MS = 4_000

const WAKING_EVENTS = [
  'focusin',
  'keydown',
  'pointerdown',
  'pointermove',
  'wheel'
] as const

/**
 * Stamps `data-idle` on the root once nothing has touched this screen, and
 * takes it off again on the first pointer, key or focus that arrives — the way
 * a video player drops its chrome over what it is playing.
 *
 * **The root, because that is the only place a page can reach the shell.** The
 * menu is drawn one level above every page, so a screen that wants it gone has
 * to say so where both can read it: the same seam `usePhaseField` uses to let a
 * page decide what colour the field is.
 *
 * It is asked for rather than always on. A screen somebody is standing at owes
 * them its chrome, and only one screen in the product is furniture.
 */
export const useIdleChrome = (isEnabled: boolean): void => {
  useEffect(() => {
    if (!isEnabled) {
      return
    }

    const root = document.documentElement
    let timer = 0

    const sleep = (): void => {
      root.setAttribute('data-idle', '')
    }

    const wake = (): void => {
      root.removeAttribute('data-idle')
      window.clearTimeout(timer)
      timer = window.setTimeout(sleep, IDLE_AFTER_MS)
    }

    // Armed on arrival rather than on the first event: the tab lands on the
    // projector already showing its chrome, and goes quiet on its own if
    // nobody touches it. A wall nobody sets up is the common case.
    wake()

    for (const event of WAKING_EVENTS) {
      window.addEventListener(event, wake, { passive: true })
    }

    return () => {
      window.clearTimeout(timer)
      root.removeAttribute('data-idle')

      for (const event of WAKING_EVENTS) {
        window.removeEventListener(event, wake)
      }
    }
  }, [isEnabled])
}
