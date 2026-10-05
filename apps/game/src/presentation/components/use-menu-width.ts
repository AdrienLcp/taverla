import { type RefObject, useEffect } from 'react'

/**
 * The menu is fixed in the corner, so the two screens whose content starts at
 * the very top reserve room for it — and a stylesheet cannot know how much. It
 * is the **trigger** that is measured, the one thing the corner draws.
 *
 * So the menu says what it costs and the shell spends it, the way a reveal
 * panel publishes its own header. A `ResizeObserver` rather than one
 * measurement: the word is translated, and the connection dot beside it is
 * there inside a room and absent at the front door.
 *
 * It writes on the root element rather than on the shell because that is the
 * one node every surface shares — the same reason the phase's field is stamped
 * there.
 */
export const useMenuWidth = (trigger: RefObject<HTMLElement | null>): void => {
  useEffect(() => {
    const element = trigger.current

    if (element === null) {
      return
    }

    // Rounded up, because a fractional width the shell rounds down is a
    // fraction of the menu left sitting over the header.
    const observer = new ResizeObserver(() => {
      document.documentElement.style.setProperty(
        '--menu-width',
        `${Math.ceil(element.getBoundingClientRect().width)}px`
      )
    })

    observer.observe(element)

    return () => {
      observer.disconnect()
      document.documentElement.style.removeProperty('--menu-width')
    }
  }, [trigger])
}
