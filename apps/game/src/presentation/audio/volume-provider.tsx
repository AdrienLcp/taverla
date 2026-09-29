import { createSafeContext } from '@adrienlcp/react'
import type React from 'react'
import { useState } from 'react'

import {
  readStoredVolume,
  writeStoredVolume
} from '@/infrastructure/storage/preferences-storage'

type VolumeContextValue = {
  setVolume: (volume: number) => void
  /** 0 to 1, this machine's own — it never reaches the room. */
  volume: number
}

const DEFAULT_VOLUME = 0.8

const storedVolumeOrDefault = (): number => {
  const stored = readStoredVolume()

  return stored.status === 'success' && stored.data !== null
    ? stored.data
    : DEFAULT_VOLUME
}

export const [VolumeContext, useVolume] =
  createSafeContext<VolumeContextValue>('VolumeProvider')

/**
 * How loud whatever this machine plays comes out, held above the router so the
 * menu and the console read one number rather than two. It is the third
 * preference that never leaves the device — the language and the theme are the
 * other two — and that is what took it out of the console's own footer, where
 * it was drawn under the one game that carries a track.
 *
 * Written on every change rather than on unmount: a console is closed by
 * closing the tab, and nothing runs after that.
 */
export const VolumeProvider: React.FC<{ children: React.ReactNode }> = ({
  children
}) => {
  const [volume, setVolume] = useState(storedVolumeOrDefault)

  const chooseVolume = (next: number): void => {
    setVolume(next)
    writeStoredVolume(next)
  }

  return (
    <VolumeContext value={{ setVolume: chooseVolume, volume }}>
      {children}
    </VolumeContext>
  )
}
