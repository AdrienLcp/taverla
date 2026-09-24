import { useEffect } from 'react'

/**
 * The slate's marking, as a field. Writing and marking share the `playing`
 * phase, so the phase cannot say which one a screen is showing — this does,
 * on the root element for the same reason `usePhaseField` does. The token
 * gives it the pair a judged buzz wears: the host deciding, the room waiting.
 */
export const useMarkingField = (isMarking: boolean): void => {
  useEffect(() => {
    if (!isMarking) {
      return
    }

    document.documentElement.dataset.marking = ''

    return () => {
      delete document.documentElement.dataset.marking
    }
  }, [isMarking])
}
