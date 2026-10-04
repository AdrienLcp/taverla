import type { Result } from '@adrienlcp/result'

import type { GameKind } from '@taverla/protocol/game'
import type {
  CreateRoomResponse,
  OpenWallPairingResponse,
  WallPairingCode,
  WallPairingPollResponse
} from '@taverla/protocol/http'
import type { HostToken, RoomCode } from '@taverla/protocol/identifiers'
import type { Locale } from '@taverla/protocol/locale'

/**
 * What the HTTP surface asks of wherever rooms are kept — one process's memory,
 * or one object per room. Asynchronous because the second is a call away.
 */
export type RoomDoor = {
  isHostedWith: (input: {
    code: RoomCode
    hostToken: HostToken
  }) => Promise<boolean>
  /** `null` when no free code could be drawn. */
  openRoom: (input: {
    game: GameKind | null
    locale: Locale
  }) => Promise<CreateRoomResponse | null>
  roomExists: (code: RoomCode) => Promise<boolean>
}

/** A pairing exists before any room does, so it is kept apart from them. */
export type WallPairings = {
  collect: (input: {
    pairingCode: WallPairingCode
    secret: string
  }) => Promise<Result<WallPairingPollResponse, 'unknown_pairing'>>
  /** `null` when no free code could be drawn. */
  open: () => Promise<OpenWallPairingResponse | null>
  pair: (input: {
    hostToken: HostToken
    pairingCode: WallPairingCode
    roomCode: RoomCode
  }) => Promise<Result<void, 'unknown_pairing'>>
}
