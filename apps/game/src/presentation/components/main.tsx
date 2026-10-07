import type React from 'react'

import './main.sass'

const MAIN_ID = 'main'

/** Where the skip link sends keyboard focus: the page's own landmark. */
export const MAIN_HREF = `#${MAIN_ID}`

const keepBackgroundClicksInert = (
  event: React.MouseEvent<HTMLElement>
): void => {
  if (event.target === event.currentTarget) {
    event.preventDefault()
  }
}

/**
 * The one `<main>` of a page: the skip link's target and where focus lands
 * after a navigation. Focusable by script, never by Tab.
 */
export const Main: React.FC<
  Omit<React.ComponentProps<'main'>, 'id' | 'onMouseDown' | 'tabIndex'>
> = (props) => (
  <main
    {...props}
    id={MAIN_ID}
    onMouseDown={keepBackgroundClicksInert}
    tabIndex={-1}
  />
)

/** Moves focus to the page's landmark, as the skip link and a navigation do. */
export const focusMain = (options?: FocusOptions): void => {
  document.getElementById(MAIN_ID)?.focus(options)
}
