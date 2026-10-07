import type { PlayerId } from '@taverla/protocol/identifiers'

import { isJudgedByHost } from '@taverla/core/room/game-modes'
import { isRoundInPlay } from '@taverla/core/room/room-phase'

import type { Room } from '@/domain/room/room'
import { removePlayer } from '@/domain/room/room-service'
import { releaseBuzz } from '@/domain/round/round-service'

import { forgetSeat } from './room-connections'
import { publishRoom, type RoomEngine } from './room-engine'

/**
 * Whether the room needs its console to judge, which is the one thing that
 * keeps that screen out of its own game. A round under way answers from what it
 * was opened on, because the settings may already have moved on to the next
 * one: a seated host who switches the answer mode to `buzzer` mid-round keeps
 * playing the round in front of them and gives up the seat when the next opens.
 *
 * Read where a seat is granted as well as where the rules change, because a
 * console remembers the name it was seated under and replays it on every
 * reconnect — a rule enforced only where the form is drawn is a rule the next
 * `hello` walks straight through.
 */
export const hostMustJudge = (room: Room): boolean =>
  isRoundInPlay(room.phase) && room.round !== null
    ? isJudgedByHost({
        game: room.round.content.kind,
        mode: room.round.mode.kind
      })
    : isJudgedByHost({
        game: room.settings.game?.kind ?? null,
        mode: room.settings.mode.kind
      })

// Removed from the roster before the buzz is released, so that the player
// being unseated cannot be the one counted as still able to answer — and off
// the console before either, because this is what broadcasts and
// `toHostView` reads the seat off the connection.
export const unseat = (playerId: PlayerId, engine: RoomEngine): void => {
  const { room } = engine

  forgetSeat(engine, playerId)
  removePlayer(room, playerId, engine.now())
  releaseBuzz({ now: engine.now(), playerId, room })
  publishRoom(engine)
}

/**
 * A seat can outlive the reason it was allowed. The picker sits on the lobby
 * stage where a console may already be seated, so a host who takes a seat and
 * then chooses the bare buzzer holds one with nothing behind it: on the board,
 * unable to score, and the only screen that could judge the round. Run where
 * the settings change and again as a round opens, which is where a change made
 * mid-round takes hold.
 *
 * Every host connection rather than the one that sent the frame — a second tab
 * of the same browser is let in on purpose, and the seat is on whichever of
 * them said hello with a name.
 */
export const unseatConsolesThatMustJudge = (engine: RoomEngine): void => {
  if (!hostMustJudge(engine.room)) {
    return
  }

  for (const connection of engine.connections.all()) {
    if (connection.role === 'host' && connection.playerId !== null) {
      unseat(connection.playerId, engine)
    }
  }
}
