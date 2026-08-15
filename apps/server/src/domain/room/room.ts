import type {
  HostToken,
  Nickname,
  PlayerId,
  RoomCode,
  RoundId,
  SessionId
} from '@taverla/protocol/identifiers'
import type { HostQuestion } from '@taverla/protocol/question'
import type { RoomPhase, RoomSettings } from '@taverla/protocol/room'
import type { Award, Verdict } from '@taverla/protocol/scoring'
import type { HostTrack, TrackIdentity } from '@taverla/protocol/track'

import type { BoardEntry, WrittenLie } from '@taverla/core/lefake/lie-board'
import type { Vote } from '@taverla/core/lefake/tally'
import type { RoundRoster } from '@taverla/core/round/round-roster'

/**
 * The server's own model, deliberately richer than either wire view: it holds
 * the session ids that let a reloaded phone reclaim its seat, and the track
 * identity nobody may see yet. `room-view.ts` is the only place it is projected
 * onto the wire.
 */
export type Room = {
  code: RoomCode
  createdAt: number
  /**
   * When the last console's socket went, and `null` while one is attached. The
   * grace window a second screen has to wait out is measured from here.
   */
  hostLeftAt: number | null
  /** `null` between the host closing their tab and reclaiming the room. */
  hostSessionId: SessionId | null
  /**
   * The room's own secret, minted with it and handed to whoever created it. It
   * never reaches a room view: `room-view.ts` projects neither this nor
   * `hostSessionId`, and the only frame carrying it travels the other way.
   */
  hostToken: HostToken
  lastActivityAt: number
  phase: RoomPhase
  /**
   * Every track and every question already used, so a pool refilled mid-game
   * cannot repeat one. It is the room's rather than the source's: two rooms
   * playing at once must be free to draw the same question, and a bank that
   * remembered would leak one party into another.
   */
  playedContentIds: Set<string>
  players: Map<PlayerId, Participant>
  round: Round | null
  settings: RoomSettings
  /**
   * Candidates without their audio: preview URLs are signed with an expiry, so
   * the playable `HostTrack` is resolved when a round starts, not here.
   */
  trackPool: TrackIdentity[]
}

export type Participant = {
  /**
   * When the socket closed, and `null` while it is open. It is what tells a
   * phone that locked its screen apart from a player who has gone: see
   * `@taverla/core/room/seat-presence` for the two windows it feeds.
   */
  disconnectedAt: number | null
  id: PlayerId
  isConnected: boolean
  nickname: Nickname
  /** Survives a disconnect: the seat is held, the score with it. */
  sessionId: SessionId
  score: number
}

/**
 * Everything one player did in a simultaneous round, graded as it arrived. It
 * is projected twice: as a name and a time while the round runs, and with what
 * they said once the answer is public.
 *
 * Typed mode takes as many guesses as the clip allows, so this accumulates.
 * Choice mode fills it once and refuses a second pick.
 *
 * The verdict is the union rather than the blind test's halves, because a game
 * judged on one claim is answered simultaneously too — and the shape it is
 * judged in belongs to the game, not to the mode.
 */
export type PlayerAttempts = {
  /** Their first guess of any kind — the name appearing on the room's screen. */
  firstGuessedAt: number
  /**
   * Their first guess that banked a half, and `null` while they have none. The
   * speed bonus ranks on this rather than on arrival: being quickly wrong wins
   * nothing, and with several guesses allowed it must not win a queue place
   * either.
   */
  firstScoredAt: number | null
  /** The guesses that banked a half, in the order they landed. */
  landed: string[]
  /** Their latest guess that banked nothing — what the reveal shows when nothing landed. */
  lastMiss: string | null
  playerId: PlayerId
  verdict: Verdict
}

export type Round = {
  activeBuzz: {
    atServerTime: number
    /** `null` when the window is unlimited, or while the round is frozen. */
    expiresAt: number | null
    /**
     * What the window had left when the host walked away, so it resumes with
     * that rather than with a fresh go or an expiry nobody could answer into.
     */
    frozenWithMsLeft: number | null
    playerId: PlayerId
  } | null
  /** Buzzer mode leaves this empty; the other two fill it as frames arrive. */
  attempts: PlayerAttempts[]
  awards: Award[]
  /**
   * What the round is asking, in the vocabulary of the game asking it — and the
   * answer, which lives here and reaches the wire only through `room-view.ts`.
   * The bare buzzer's arm carries neither: the room owns the question, and the
   * server is only there to say who was first.
   *
   * Choice mode's candidates are shuffled once when the round opens, so their
   * order carries nothing. `correctChoiceIndex` is the one field in the whole
   * model that must never be projected.
   */
  content:
    | {
        choices: TrackIdentity[]
        correctChoiceIndex: number | null
        kind: 'blindtest'
        track: HostTrack
      }
    | { kind: 'buzzer' }
    | {
        /**
         * Assembled the moment the writing closes, and `null` for as long as it
         * is open — which is also what tells the two phases apart in every
         * projection: a board is a room that has stopped writing.
         */
        board: BoardEntry[] | null
        kind: 'lefake'
        lies: WrittenLie[]
        question: HostQuestion
        votes: Vote[]
      }
    | {
        choices: string[]
        correctChoiceIndex: number | null
        kind: 'quiz'
        question: HostQuestion
      }
  /**
   * The round's own clock, and the pair that makes a miss resumable: a buzz
   * stops it, and the round has to know how much is left rather than handing
   * the next player a fresh thirty seconds. A game with no clock — the bare
   * buzzer — still winds it, and nothing ever reads the total.
   */
  elapsedMs: number
  id: RoundId
  index: number
  lockedOutPlayerIds: Set<PlayerId>
  /**
   * Who the round is played by, and `null` until its clip starts — see
   * `@taverla/core/round/round-roster`. One stamp covers the whole round, Le
   * Fake's vote included: the people who may vote are the people who were there
   * for the writing.
   */
  openedWithPlayerIds: RoundRoster
  revealed: boolean
  /** Server time the round last started or resumed running; `null` while paused. */
  runningSince: number | null
  startsAt: number | null
}
