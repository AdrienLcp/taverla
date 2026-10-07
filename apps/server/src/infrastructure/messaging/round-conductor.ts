import type { RoomDeadlineKind } from '@/domain/room/room-deadlines'
import { releaseAbandonedSeats } from '@/domain/room/room-service'
import {
  blindtestContent,
  closeRound,
  finishGame,
  holdRoundClock,
  isFinalRound,
  openRound,
  quizContent,
  reflexContent,
  releaseBuzz,
  resumeRoundClock,
  startRoundClock,
  TRACK_DRAW_LEAD_MS,
  timeOutBuzz
} from '@/domain/round/round-service'
import { slateContent } from '@/domain/round/slate-round'
import { drawPlayableTrack } from '@/domain/round/track-pool'
import { newRoundId } from '@/infrastructure/ids'
import { logger } from '@/infrastructure/logging/logger'
import { isOutage, NOTHING_PLAYABLE } from '@/infrastructure/music/music-source'
import {
  drawQuestion,
  hostQuestionOf
} from '@/infrastructure/questions/question-bank'

import { unseatConsolesThatMustJudge } from './host-judging'
import { sendError } from './outbound'
import { forgetSeat, hostConnectionIn } from './room-connections'
import {
  closeRoomEngine,
  commitRoom,
  deadlinesOf,
  publishRoom,
  type RoomEngine
} from './room-engine'

/**
 * The least a countdown may last once the hold has spent its own: the console
 * loads the clip during it, and a draw slow enough to eat the whole countdown
 * would otherwise start the round's clock over a clip still loading.
 */
const LEAST_COUNTDOWN_MS = 1_000

/**
 * How long a hold whose draw failed waits before trying again. A room nobody
 * is pressing for has nobody to read the error either, and a catalogue that
 * timed out once usually answers the next request.
 */
const DRAW_RETRY_MS = 3_000

/**
 * The time-driven transitions live here rather than in the socket handler: a
 * countdown that lands, a round that runs out, and a reveal that moves on by
 * itself are not messages anyone sent, but they still end in a broadcast.
 *
 * `slateKeys` is what a host prepared before the evening, carried by the press
 * that opens the sheet; every path nobody pressed opens it with none.
 * `heldUntil` is the instant the hold promised the next clip, on the one path
 * that is the hold running out.
 */
export const beginRound = async (
  engine: RoomEngine,
  {
    heldUntil = null,
    slateKeys = []
  }: { heldUntil?: number | null; slateKeys?: readonly (string | null)[] } = {}
): Promise<void> => {
  const { room } = engine
  const startsAtOf = (now: number): number | undefined =>
    heldUntil === null
      ? undefined
      : Math.max(heldUntil, now + LEAST_COUNTDOWN_MS)

  // Resolving a track is a network call, and the host pressing "start" twice
  // before it answers would open two rounds over each other.
  if (engine.isDrawing) {
    return
  }

  const game = room.settings.game

  // Spent here whatever happens next: a hold left standing after an advance
  // that opened nothing would be due again on the very next wake. A held track
  // draw keeps it until the round opens, because it is what says the room
  // still wants that round once the draw lands.
  if (
    room.round !== null &&
    (heldUntil === null || game?.kind !== 'blindtest')
  ) {
    room.round.advancesAt = null
  }

  // An answer mode moved to `buzzer` mid-round left a seated console playing
  // the round it was in; the round about to open is the one it must judge.
  unseatConsolesThatMustJudge(engine)

  // Nobody has chosen what the room is playing, so there is nothing to open a
  // round on. The socket refuses `host.startRound` with a code the host can
  // read; this is the floor under the paths nobody pressed — an auto-advance,
  // or a game cleared between two rounds.
  if (game === null) {
    publishRoom(engine)

    return
  }

  // No catalogue, no network call, and nothing to fail — the room already holds
  // the question, or there is no question at all. Opening the round is the whole
  // of serving these three.
  if (
    game.kind === 'buzzer' ||
    game.kind === 'reflex' ||
    game.kind === 'slate'
  ) {
    openRound({
      content:
        game.kind === 'buzzer'
          ? { kind: 'buzzer' }
          : game.kind === 'reflex'
            ? reflexContent()
            : slateContent({ keys: slateKeys, settings: game }),
      id: newRoundId(),
      now: engine.now(),
      room,
      startsAt: startsAtOf(engine.now())
    })

    publishRoom(engine)

    return
  }

  // The bank is bundled, so the draw is synchronous and cannot fail on someone
  // else's web server being down. Running out of unplayed questions can still
  // happen, and it is the room's own doing rather than an outage.
  if (game.kind === 'quiz') {
    // A `choiceOnly` row is a question only while its own three decoys are on
    // screen, which is a quiz in `choice` mode and nothing else.
    const showsItsCandidates = room.settings.mode.kind === 'choice'

    const question = drawQuestion({
      isUsable: (row) => showsItsCandidates || !row.choiceOnly,
      playedIds: room.playedContentIds,
      settings: game
    })

    if (question === null) {
      tellHost(engine, {
        code: 'no_content_available',
        message: 'No unplayed question is left in those categories'
      })
      publishRoom(engine)

      return
    }

    room.playedContentIds.add(question.id)

    openRound({
      content: quizContent({ question: hostQuestionOf(question), room }),
      id: newRoundId(),
      now: engine.now(),
      room,
      startsAt: startsAtOf(engine.now())
    })

    publishRoom(engine)

    return
  }

  engine.isDrawing = true

  let drawn: Awaited<ReturnType<typeof drawPlayableTrack>>
  let isStillWanted = true

  // Still drawing while a held round waits to open: the hold's deadline is
  // already past, and any frame committed in the meantime would wake the room
  // into a second draw for the same round.
  try {
    drawn = await drawPlayableTrack({ room, settings: game })

    if (drawn.status === 'success' && heldUntil !== null) {
      isStillWanted = await waitToOpen(engine, heldUntil)
    }
  } finally {
    engine.isDrawing = false
  }

  // The draw took a network round trip, and the room can have been closed or
  // swept in the meantime.
  if (engine.isClosed) {
    return
  }

  if (drawn.status === 'failure') {
    const log = isOutage(drawn.error.faults) ? logger.error : logger.warn

    log('Could not draw a track', {
      code: room.code,
      faults: drawn.error.faults,
      reason: drawn.error.code
    })
    tellHost(engine, {
      code: drawn.error.code,
      message: 'Could not load a track from the music catalogue'
    })
    retryHeldDraw(engine, {
      heldUntil,
      isExhausted: drawn.error.code === NOTHING_PLAYABLE.code
    })
    publishRoom(engine)

    return
  }

  // Whatever moved the hold re-armed nothing while the draw was in flight.
  if (!isStillWanted) {
    commitRoom(engine)

    return
  }

  if (drawn.data.faults.length > 0) {
    const log = isOutage(drawn.data.faults) ? logger.error : logger.warn

    log('Drew a track past failing catalogue paths', {
      code: room.code,
      faults: drawn.data.faults
    })
  }

  openRound({
    content: blindtestContent({ room, track: drawn.data.track }),
    id: newRoundId(),
    now: engine.now(),
    room,
    startsAt: startsAtOf(engine.now())
  })

  publishRoom(engine)
}

/**
 * A held draw starts ahead of its countdown, and a fast catalogue lands before
 * the countdown is due: the round waits for it rather than counting in from
 * five. `false` when the room stopped wanting it meanwhile — the host left,
 * changed the hold, or ended the game — which the hold says by having moved.
 */
const waitToOpen = async (
  engine: RoomEngine,
  heldUntil: number
): Promise<boolean> => {
  const waitMs = heldUntil - engine.room.settings.countdownMs - engine.now()

  if (waitMs > 0) {
    await new Promise((resolve) => setTimeout(resolve, waitMs))
  }

  return (
    !engine.isClosed &&
    engine.room.phase === 'revealed' &&
    engine.room.round?.advancesAt === heldUntil
  )
}

/**
 * A hold whose draw failed used to leave the reveal on screen with nothing
 * counting, until somebody thought to press for the next round. A source with
 * nothing left to play is not retried: the next request answers the same, so
 * the hold is spent and the room waits for its host.
 */
const retryHeldDraw = (
  engine: RoomEngine,
  { heldUntil, isExhausted }: { heldUntil: number | null; isExhausted: boolean }
): void => {
  const { round } = engine.room

  if (heldUntil === null || round === null) {
    return
  }

  round.advancesAt = isExhausted
    ? null
    : engine.now() +
      DRAW_RETRY_MS +
      engine.room.settings.countdownMs +
      TRACK_DRAW_LEAD_MS
}

const tellHost = (
  engine: RoomEngine,
  {
    code,
    message
  }: { code: Parameters<typeof sendError>[1]['code']; message: string }
): void => {
  const host = hostConnectionIn(engine)

  if (host !== null) {
    sendError(host, { code, fatal: false, message })
  }
}

/**
 * Whatever the scheduler woke the room for is read again from the room rather
 * than trusted: one deadline per wake, the earliest, and the commit that
 * follows aims the next wake at whatever is due after it.
 */
export const wakeRoom = async (engine: RoomEngine): Promise<void> => {
  if (engine.isClosed) {
    return
  }

  const now = engine.now()
  const due = deadlinesOf(engine)
    .filter((deadline) => deadline.at <= now)
    .toSorted((first, second) => first.at - second.at)
    .at(0)

  const drawing =
    due === undefined ? undefined : runDeadline(engine, due.kind, now)

  commitRoom(engine)

  // Returned rather than left floating: a Durable Object's alarm is over when
  // its handler settles, and a draw still in flight then has nothing keeping
  // the object awake to open the round it went for.
  await drawing
}

const runDeadline = (
  engine: RoomEngine,
  kind: RoomDeadlineKind,
  now: number
): Promise<void> | undefined => {
  const { room } = engine
  const roundId = room.round?.id

  switch (kind) {
    case 'countdown': {
      if (roundId !== undefined) {
        startRoundClock({ now, room, roundId })
      }

      publishRoom(engine)

      return
    }

    // The round running out ends it the same way the last answer does, scoring
    // included: whoever did not answer simply did not.
    case 'round': {
      closeRound(room, now)
      publishRoom(engine)

      return
    }

    case 'answer': {
      if (roundId !== undefined) {
        timeOutBuzz({ now, room, roundId })
      }

      publishRoom(engine)

      return
    }

    case 'advance': {
      if (isFinalRound(room)) {
        finishGame(room, now)
        publishRoom(engine)

        return
      }

      return beginRound(engine, { heldUntil: room.round?.advancesAt ?? null })
    }

    case 'seats': {
      releaseSeats(engine, now)

      return
    }

    case 'expiry': {
      logger.info('Closed an abandoned room', { code: room.code })
      closeRoomEngine(engine)

      return
    }
  }
}

/**
 * The floor is released with the seats: a room whose answer window is the
 * host's own word can otherwise hold a buzz forever on behalf of a player who
 * is long gone.
 */
const releaseSeats = (engine: RoomEngine, now: number): void => {
  const { room } = engine
  const released = releaseAbandonedSeats(room, now)

  for (const playerId of released) {
    forgetSeat(engine, playerId)
    releaseBuzz({ now, playerId, room })
  }

  logger.info('Released abandoned seats', {
    released: released.length,
    room: room.code
  })
  publishRoom(engine)
}

/**
 * The host's browser is the room's speaker and its only judge, so a game that
 * carries on without them carries on in silence, unjudged, burning round time
 * nobody can hear. The round keeps the seconds it had left, and no round
 * deadline falls due while no console is attached — see `roomDeadlines`.
 *
 * There is no grace period on purpose. Freezing costs nothing and undoes
 * itself, where waiting even five seconds spends five seconds of music on an
 * empty room — a host who drops off Wi-Fi for a moment loses the pause, not the
 * round.
 */
export const holdRoundWhileHostIsAway = (engine: RoomEngine): void => {
  holdRoundClock(engine.room, engine.now())
}

/** The mirror, run when a host claims the room again. */
export const resumeRoundForHost = (engine: RoomEngine): void => {
  resumeRoundClock(engine.room, engine.now())
}
