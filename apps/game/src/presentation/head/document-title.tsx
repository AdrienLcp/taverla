import type React from 'react'
import { useLayoutEffect, useRef } from 'react'

/** The `<title>` the document was served with, found before React renders one. */
const servedTitle =
  typeof document === 'undefined'
    ? null
    : document.querySelector('head > title')

/**
 * The page's `<title>`, hoisted by React into the head and lifted by the
 * prerender into the served document. One per screen, in the leaf page.
 *
 * `createRoot` never adopts the served `<title>`, only hydration does: React
 * puts its own in front, and the served one is removed in that same commit, so
 * the tab is never without a title. React's own titles are never touched.
 */
export const DocumentTitle: React.FC<{
  /** One string: React writes an empty title for several children. */
  children: string
}> = ({ children }) => {
  const ownTitle = useRef<HTMLTitleElement>(null)

  useLayoutEffect(() => {
    if (servedTitle !== ownTitle.current) {
      servedTitle?.remove()
    }
  }, [])

  return <title ref={ownTitle}>{children}</title>
}
