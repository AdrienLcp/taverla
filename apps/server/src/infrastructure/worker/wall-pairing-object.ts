import { DurableObject } from 'cloudflare:workers'
import { Result } from '@adrienlcp/result'

import type { WallPairingPollResponse } from '@taverla/protocol/http'
import type { HostToken, RoomCode } from '@taverla/protocol/identifiers'

import {
  collectWall,
  isWallPairingLive,
  newWallPairing,
  vouchForWall,
  type WallPairing
} from '@/domain/room/wall-pairing'
import { nowMs } from '@/infrastructure/clock'

const PAIRING_KEY = 'pairing'

/**
 * One pairing code, named by it. Its own object because a pairing is made
 * before the room it will join is known, and its alarm is its expiry.
 */
export class WallPairingObject extends DurableObject<Env> {
  open(secret: string): boolean {
    if (this.live() !== null) {
      return false
    }

    const pairing = newWallPairing({ now: nowMs(), secret })

    this.ctx.storage.kv.put(PAIRING_KEY, pairing)
    void this.ctx.storage.setAlarm(pairing.expiresAt)

    return true
  }

  pair({
    hostToken,
    roomCode
  }: {
    hostToken: HostToken
    roomCode: RoomCode
  }): Result<void, 'unknown_pairing'> {
    const vouched = vouchForWall({
      hostToken,
      now: nowMs(),
      pairing: this.live(),
      roomCode
    })

    if (vouched.status === 'failure') {
      return vouched
    }

    this.ctx.storage.kv.put(PAIRING_KEY, vouched.data)

    return Result.success()
  }

  collect(secret: string): Result<WallPairingPollResponse, 'unknown_pairing'> {
    const collected = collectWall({
      now: nowMs(),
      pairing: this.live(),
      secret
    })

    if (collected.status === 'failure') {
      return collected
    }

    if (collected.data.remaining === null) {
      this.forget()
    }

    return Result.success(collected.data.response)
  }

  override alarm(): void {
    this.forget()
  }

  private live(): WallPairing | null {
    const pairing = this.ctx.storage.kv.get<WallPairing>(PAIRING_KEY)

    return pairing !== undefined && isWallPairingLive(pairing, nowMs())
      ? pairing
      : null
  }

  private forget(): void {
    this.ctx.storage.kv.delete(PAIRING_KEY)
    void this.ctx.storage.deleteAlarm()
  }
}
