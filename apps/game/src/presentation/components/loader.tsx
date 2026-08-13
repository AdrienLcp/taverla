import type React from 'react'
import { useEffect, useState } from 'react'

import { Spinner } from './spinner'

import './loader.sass'

/**
 * A good connection settles most waits inside this, and an indicator that
 * arrives and leaves within it is a flash nobody can read.
 */
const APPEARS_AFTER_MS = 250

type LoaderProps = {
  /**
   * What is being waited on. It is the loader's accessible name as well as its
   * visible line, which is why it is neither optional nor an attribute — a
   * turning square on its own asks the reader to already know.
   */
  label: string
}

/**
 * The live region is mounted empty and filled once the delay elapses. A
 * `role='status'` that arrives already holding its text is a change no screen
 * reader watched happen, and the announcement is simply lost.
 */
export const Loader: React.FC<LoaderProps> = ({ label }) => {
  const [hasWaited, setHasWaited] = useState(false)

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setHasWaited(true)
    }, APPEARS_AFTER_MS)

    return () => {
      window.clearTimeout(timer)
    }
  }, [])

  return (
    <p className='loader' role='status'>
      {hasWaited && (
        <>
          <Spinner />
          {label}
        </>
      )}
    </p>
  )
}
