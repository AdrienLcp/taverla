import { useEffect, useRef } from 'react'

import { usePathname } from '@/infrastructure/router/navigation'
import { focusMain } from '@/presentation/components/main'

/**
 * Moves focus to the new page's landmark after a client-side navigation, so a
 * screen reader announces it and the next Tab starts inside it. Not on the
 * first render: a full load already starts at the top.
 */
export const useFocusMainOnNavigation = (): void => {
  const pathname = usePathname()
  const previousPathname = useRef(pathname)

  useEffect(() => {
    if (previousPathname.current === pathname) {
      return
    }

    previousPathname.current = pathname
    focusMain({ preventScroll: true })
  }, [pathname])
}
