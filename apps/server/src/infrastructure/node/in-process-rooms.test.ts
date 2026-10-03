import { describe, expect, it } from 'vitest'

import { closeRoomEngine } from '@/infrastructure/messaging/room-engine'

import { findRoomEngine, openRoomInProcess } from './in-process-rooms'

describe('openRoomInProcess', () => {
  it('[room] never hands out a code a live room holds, and frees it once closed', () => {
    const engines = Array.from({ length: 50 }, () => {
      const engine = openRoomInProcess({ game: 'blindtest', locale: 'fr' })

      if (engine === null) {
        throw new Error('the process refused to allocate a room')
      }

      return engine
    })

    expect(new Set(engines.map(({ room }) => room.code)).size).toBe(50)

    for (const engine of engines) {
      closeRoomEngine(engine)

      expect(findRoomEngine(engine.room.code)).toBeNull()
    }
  })
})
