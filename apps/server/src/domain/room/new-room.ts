import type { GameKind } from '@taverla/protocol/game'
import type { HostToken, RoomCode } from '@taverla/protocol/identifiers'
import type { Locale } from '@taverla/protocol/locale'

import { roomSettingsFor } from '@taverla/core/room/room-settings'

import type { Room } from './room'

/**
 * The code is the caller's because uniqueness is: the process that keeps the
 * rooms is the only one that can tell a code is free.
 */
export const newRoom = ({
  code,
  game,
  hostToken,
  locale,
  now
}: {
  code: RoomCode
  /** `null` from the front door, where the code goes up before anybody has decided. */
  game: GameKind | null
  hostToken: HostToken
  /** The host's, so a quiz opens in a language they read rather than in a fixed one. */
  locale: Locale
  now: number
}): Room => ({
  code,
  createdAt: now,
  hostLeftAt: null,
  hostSessionId: null,
  hostToken,
  lastActivityAt: now,
  phase: 'lobby',
  playedContentIds: new Set(),
  players: new Map(),
  round: null,
  settings: roomSettingsFor({ game, locale }),
  trackPool: []
})
