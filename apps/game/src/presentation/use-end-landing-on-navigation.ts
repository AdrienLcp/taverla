import { useLayoutEffect, useRef } from 'react'

import { usePathname } from '@/infrastructure/router/navigation'

/**
 * Drops the `data-landing` the prerender writes on `<html>` at the first
 * client-side navigation, so that page and every one after it arrive again.
 * In a layout effect: the page being left is already gone and the new one not
 * yet painted, so neither is caught at the first frame of `page-enter`.
 */
export const useEndLandingOnNavigation = (): void => {
  const pathname = usePathname()
  const landingPathname = useRef(pathname)

  useLayoutEffect(() => {
    if (landingPathname.current !== pathname) {
      delete document.documentElement.dataset.landing
    }
  }, [pathname])
}
