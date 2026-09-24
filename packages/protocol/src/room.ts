import { z } from 'zod'

import { gameSettingsSchema } from './game'
import {
  nicknameSchema,
  playerIdSchema,
  roomCodeSchema,
  roundIdSchema,
  serverTimeSchema
} from './identifiers'
import { candidateSchema, revealedCandidateSchema } from './lefake'
import {
  hostQuestionSchema,
  questionPromptSchema,
  revealedQuestionSchema
} from './question'
import { awardSchema, verdictSchema } from './scoring'
import {
  slateAnswerGroupSchema,
  slateItemCountSchema,
  slateItemIndexSchema,
  slateItemStateSchema,
  slateLineSchema,
  slateProgressSchema
} from './slate'
import { hostTrackSchema, trackIdentitySchema } from './track'

export const MAX_PLAYERS_PER_ROOM = 24

/**
 * `voting` is the one member no buzz-first game reaches, and the first phase
 * added since the shelf began. The catalogue's rule was that these names stay
 * fused until a game needs one they cannot carry, and the submit-then-vote shape
 * needs exactly one: its writing phase *is* `playing` — everyone submitting
 * against a deadline, which is what a simultaneous round already means — while
 * "the board is up and the room is choosing" is neither that nor `buzzed`.
 *
 * Adding a name is not the split the catalogue warns against. It is what keeps
 * the enum shared: every shell check can still spell what it is checking, and
 * the next submit-then-vote game reuses this for nothing.
 *
 * The slate once added `correcting` on the same argument and gave it back: its
 * items close one at a time while the rest are still being written, so writing
 * and marking share `playing` and each item carries its own state instead.
 */
export const roomPhases = [
  'lobby',
  'countdown',
  'playing',
  'buzzed',
  'voting',
  'revealed',
  'finished'
] as const

export const roomPhaseSchema = z.enum(roomPhases)

export const answerModes = ['buzzer', 'choice', 'typed'] as const

/**
 * How a round is answered. One game, not three: the pool, the audio, the
 * countdown, the reveal and the scoreboard are identical, and what differs is
 * who acts, who decides, and what scores.
 *
 * `buzzer` is one player, the first, judged by the host. `choice` and `typed`
 * are everyone at once, decided by the server — exactly, then fuzzily — and
 * scored by speed on top of being right.
 *
 * It is the room's, not a game's: the shell reads it everywhere a round is
 * answered and scored, and what a game does is *narrow* it — see
 * `answerModesFor` in `@taverla/core/room/game-modes`, and the server refuses a
 * frame that sets one the current game does not offer.
 */
export const answerModeSchema = z.enum(answerModes)

/**
 * How a round is answered, and the settings only that mode has — the room's
 * second axis, and the same shape as `gameSettingsSchema` for the same reason.
 * Which game is being played and how it is answered are independent choices,
 * and each owns settings the other cannot read.
 *
 * The buzzer arm is the only one with anything of its own so far, and that is
 * what the union buys before it has a second: `answerWindowMs` is unreachable
 * from a mode where nobody buzzes, so `registerBuzz`'s guard against a
 * hand-written buzz *is* the narrowing that produces the window.
 */
export const modeSettingsSchema = z.discriminatedUnion('kind', [
  z.object({
    /**
     * How long the floor is held after a buzz before the server takes it back,
     * or `null` when the host decides by hand and the screens count up instead.
     *
     * Buzzing costs nothing on its own, so without this a press that was fast
     * and a mouth that has nothing to say can hold a whole room. Running out is
     * the same outcome as answering wrong — no points, locked out, the round
     * resumes — because taking the floor and saying nothing is what it cost
     * everyone else, and because a pass with no lockout lets the same player
     * take it again immediately.
     */
    answerWindowMs: z.number().int().min(3_000).max(60_000).nullable(),
    kind: z.literal('buzzer')
  }),
  z.object({ kind: z.literal('choice') }),
  z.object({ kind: z.literal('typed') })
])

export const roomSettingsSchema = z.object({
  /**
   * How long a reveal stays on screen before the next round starts itself, or
   * `null` when the host advances by hand. The wait is served by the server for
   * the same reason the countdown is: a background tab throttles its timers,
   * and the host's screen is exactly the tab most likely to lose focus.
   */
  autoAdvanceMs: z.number().int().min(2_000).max(30_000).nullable(),
  /** Milliseconds between "start" and the first note, so every device lands together. */
  countdownMs: z.number().int().min(0).max(10_000),
  /**
   * Which game the room is playing, and the settings only that game has. The
   * room keeps what every game needs and hands the rest here — see `game.ts`.
   *
   * `null` until somebody chooses, because a room is opened before a game is
   * picked: the code goes up, the players arrive, and the table decides while
   * they do. That is the whole reason this is nullable rather than opening on a
   * default — a default would have the lobby and every player name a game
   * nobody chose, and there would be no way to say "still deciding" at all.
   *
   * It is also what makes the rest type-check: the guard on `host.startRound`
   * *is* the narrowing every downstream call needs, the same way
   * `registerBuzz`'s guard is what produces the answer window.
   */
  game: gameSettingsSchema.nullable(),
  /** How a round is answered, and the settings only that mode has. */
  mode: modeSettingsSchema,
  /**
   * How many rounds the game runs for, or `null` for "until the host ends it".
   *
   * A fixed count is the blind test's shape — a playlist runs out — and it is
   * the wrong one for a host running a charade evening, who stops when they
   * stop. The final board already knows how to arrive on a press.
   */
  roundCount: z.number().int().min(1).max(50).nullable()
})

export type AnswerMode = z.infer<typeof answerModeSchema>
export type ModeSettings = z.infer<typeof modeSettingsSchema>
export type BuzzerModeSettings = Extract<ModeSettings, { kind: 'buzzer' }>
export type RoomSettings = z.infer<typeof roomSettingsSchema>

export const DEFAULT_BUZZER_MODE_SETTINGS: BuzzerModeSettings = {
  answerWindowMs: 10_000,
  kind: 'buzzer'
}

/** A record rather than a switch, so a new mode without a default cannot compile. */
export const DEFAULT_MODE_SETTINGS: Record<AnswerMode, ModeSettings> = {
  buzzer: DEFAULT_BUZZER_MODE_SETTINGS,
  choice: { kind: 'choice' },
  typed: { kind: 'typed' }
}

export const DEFAULT_ROOM_SETTINGS: RoomSettings = {
  autoAdvanceMs: null,
  countdownMs: 3_000,
  /** A freshly opened room is a code on a screen; the game is the table's first decision. */
  game: null,
  /**
   * Everyone plays every round, which is what a party wants: the buzzer gives
   * the floor to whoever is quickest and leaves the rest of the room watching.
   */
  mode: DEFAULT_MODE_SETTINGS.typed,
  roundCount: 10
}

export const publicPlayerSchema = z.object({
  id: playerIdSchema,
  isConnected: z.boolean(),
  nickname: nicknameSchema,
  score: z.number().int().nonnegative()
})

export const activeBuzzSchema = z.object({
  /** Stamped by the server on frame arrival — the only ordering anyone can trust. */
  atServerTime: serverTimeSchema,
  /**
   * When the server takes the floor back, or `null` when the host decides by
   * hand — and the screens then count up from `atServerTime` instead of down.
   *
   * A server time rather than a duration, because the window is paused and
   * restarted along with the round: a host who drops off Wi-Fi must not spend
   * somebody's five seconds while nobody can hear them answer.
   */
  expiresAt: serverTimeSchema.nullable(),
  playerId: playerIdSchema
})

/**
 * Who is in, and when they got there — never what they said. The room watching
 * a screen fill up with names is the tension of a simultaneous round, and it
 * costs nothing that could be worked backwards into the answer.
 */
export const roundAnswerSchema = z.object({
  atServerTime: serverTimeSchema,
  playerId: playerIdSchema
})

/**
 * What each player actually answered, published at the reveal and not a moment
 * before. `isCorrect` is the server's grade, which is only a leak once the
 * answer is already public.
 */
export const revealedAnswerSchema = roundAnswerSchema.extend({
  isCorrect: z.boolean(),
  /** The choice they picked, or the two fields they typed. */
  said: z.string()
})

/**
 * What the round is asking, in the vocabulary of the game asking it. Everything
 * around it — who buzzed, who is locked out, what was awarded — is the shell's
 * and is the same in every game.
 *
 * Every arm is safe for a player to hold: one of the choices is the answer,
 * which is the game rather than a leak. **Which** one lives only in the
 * server's `Round` and reaches no frame — see `codec.test.ts`.
 */
export const roundContentSchema = z.discriminatedUnion('kind', [
  z.object({
    /** Choice mode only, and shuffled per round. */
    choices: z.array(trackIdentitySchema),
    kind: z.literal('blindtest'),
    revealedTrack: trackIdentitySchema.nullable()
  }),
  /**
   * Nothing but its kind, because the room owns the question and the server
   * never learns it. The arm still exists rather than the field going `null`:
   * absent content and a round that has none are different facts, and only one
   * of them means there is no round.
   */
  z.object({ kind: z.literal('buzzer') }),
  z.object({
    /**
     * `null` while the room is still writing, and the shuffled board the moment
     * the vote opens. Shuffled once, so its order says nothing about who wrote
     * what or which line came from the bank.
     */
    board: z.array(candidateSchema).nullable(),
    kind: z.literal('lefake'),
    prompt: questionPromptSchema,
    /** Everything withheld until the tally: authorship, the votes, the truth. */
    revealedBoard: z.array(revealedCandidateSchema).nullable(),
    /**
     * Who has voted, and who has written — never what for, and never what. They
     * are this game's own rather than the shell's `answers`, which is projected
     * from the attempts a simultaneous round grades: a lie is graded by nobody,
     * so it has no attempt to be counted in.
     *
     * Both are the tension of watching a screen fill up with names, and neither
     * leaks: a name says somebody is done, not what they said.
     */
    votedPlayerIds: z.array(playerIdSchema),
    writtenPlayerIds: z.array(playerIdSchema),
    /**
     * Which line on the board is the reader's own, so their screen can show it
     * back and refuse to let them vote for it. Scoped to the reader the way
     * `yourVerdict` is, and inside the game's arm because no other game has the
     * concept — `null` for the host, and for a player who wrote nothing.
     *
     * It survives a reload, which is the point: a device that locked its screen
     * comes back knowing which one it must not pick.
     */
    yourCandidateId: z.string().nullable()
  }),
  z.object({
    /** Choice mode only, and shuffled per round. */
    choices: z.array(z.string()),
    kind: z.literal('quiz'),
    prompt: questionPromptSchema,
    revealedQuestion: revealedQuestionSchema.nullable()
  }),
  z.object({
    /**
     * When the screen flips, and `null` until the round's clock has a start.
     * Every device flips against its own estimated offset rather than on a
     * frame landing, so what the race measures is reaction and not the room's
     * Wi-Fi — which is the whole reason this is handed out in advance. What
     * makes that safe is `FALSE_START_FLOOR_MS`, not hiding the number.
     */
    flipsAt: serverTimeSchema.nullable(),
    kind: z.literal('reflex'),
    /**
     * Every press that landed, in arrival order — the first one takes the
     * round. A reaction is `atServerTime` minus `flipsAt`, worked out where it
     * is shown rather than carried: both halves of the subtraction are already
     * here, and a third field could disagree with them.
     *
     * A false start is not one of these. It is refused, and puts the player in
     * `lockedOutPlayerIds` — which in this game has no other cause.
     */
    presses: z.array(roundAnswerSchema)
  }),
  z.object({
    /**
     * The item on the wall — always a closed one — and `null` until the host
     * closes the first. 0-based, like every index this game sends; what a
     * screen draws for it is `settings.game.labels`, or its number.
     */
    currentItemIndex: slateItemIndexSchema.nullable(),
    /** The round's own count, which `host.addItem` grows until the reveal. */
    itemCount: slateItemCountSchema,
    /** One per item: whether it can still be written, and how far its marking has gone. */
    itemStates: z.array(slateItemStateSchema),
    kind: z.literal('slate'),
    /**
     * One per item: the host's key once they revealed it on a closed item, and
     * `null` everywhere else — an open item, or a key still held back. Every
     * other game hands its answer to the players at the reveal, and a closed
     * item is revealed for the same reason: nobody can still write to it.
     */
    revealedKeys: z.array(z.string().nullable()),
    /**
     * The reader's own sheet, one line per item, and nobody else's — not even
     * the host screen holds another player's answer to an item still open,
     * because the host screen is the wall. `null` for a reader with no seat.
     *
     * It is what a reload comes back to: a locked screen loses nothing, since
     * every line was saved on its own as it was written.
     */
    yourSheet: z.array(slateLineSchema).nullable()
  })
])

export const roundViewSchema = z.object({
  activeBuzz: activeBuzzSchema.nullable(),
  /**
   * Server time the reveal gives way to the next round, or `null` when nothing
   * is counting — the host advances by hand, or their screen is away and the
   * server has the room frozen. A server time rather than what is left of the
   * hold, for the reason `activeBuzz.expiresAt` is one: the wait is cancelled
   * and restarted along with the round, and a duration would have to be
   * re-sent on every snapshot to stay true.
   */
  advancesAt: serverTimeSchema.nullable(),
  /** Buzzer mode leaves this empty; the other two fill it as frames arrive. */
  answers: z.array(roundAnswerSchema),
  /** Points already granted this round, in the order the host granted them. */
  awards: z.array(awardSchema),
  content: roundContentSchema,
  id: roundIdSchema,
  /** 1-based, so it reads as "round 3 of 10" without arithmetic at the call site. */
  index: z.number().int().positive(),
  /**
   * Whether the reader took their seat after this round was under way. They are
   * in from the next one, and until then the screen owes them a wait rather
   * than an answer form: the server refuses everything they could send.
   *
   * Scoped to the reader, the way `yourVerdict` is — `false` for a host holding
   * no seat, because a console is never a latecomer to its own room.
   */
  joinedAfterStart: z.boolean(),
  /**
   * Answered wrong this round — cannot buzz again until the next one, or until
   * the host reopens the field with `host.clearLockouts`.
   */
  lockedOutPlayerIds: z.array(playerIdSchema),
  /** Empty until the reveal, then what everyone said and whether it was right. */
  revealedAnswers: z.array(revealedAnswerSchema),
  /**
   * Server time the round opens on — the first note, or the question appearing.
   * Every client schedules against its own clock offset, which is what lands the
   * countdown on every device together.
   */
  startsAt: serverTimeSchema.nullable()
})

const baseRoomViewSchema = z.object({
  code: roomCodeSchema,
  /**
   * The host's browser is the room's speaker and its only judge, so its absence
   * is a fact the whole room needs rather than a detail of the connection. The
   * server freezes the round while this is `false`.
   */
  isHostConnected: z.boolean(),
  phase: roomPhaseSchema,
  players: z.array(publicPlayerSchema),
  round: roundViewSchema.nullable(),
  /**
   * Round time already consumed, buzz pauses excluded. It is what lets a host
   * who reloaded mid-round seek back to where the room actually is, rather than
   * restarting the track under everyone — and what every screen arms the round
   * clock from, so a device that locked itself comes back to the bar where the
   * room is rather than to a full one.
   */
  roundElapsedMs: z.number().int().nonnegative(),
  settings: roomSettingsSchema,
  /**
   * What the reader has banked this round, and `null` before their first guess
   * or when they hold no seat. Typed mode takes as many guesses as the round
   * allows, so a player has to be told what they already hold — otherwise
   * "guess again" means guessing at what to guess at.
   *
   * Scoped to the reader on purpose. Everyone else's progress stays secret
   * until the reveal, the same way `revealedAnswers` does.
   *
   * The whole union rather than the blind test's halves, which is where the
   * second game corrected the first: a claim judged by the server in silence
   * needs this exactly as much as a pair of halves does. A player who has
   * already answered the question right and is not told so keeps typing, and
   * the refusal they eventually get says "you have had your go" — which reads
   * as a lockout rather than as a win.
   */
  yourVerdict: verdictSchema.nullable()
})

/**
 * The round as the one screen judging it sees it — the half no player may hold.
 * The answer goes `null` while the host holds a seat: that screen is a player's
 * then, and a payload it could read in a console is not a guarantee.
 *
 * The bare buzzer is the arm with nothing to withhold, which is the whole point
 * of it: no catalogue, no network call, and no licence to answer for.
 */
export const hostRoundContentSchema = z.discriminatedUnion('kind', [
  z.object({
    /**
     * What the speaker needs, which is not what the judge needs. A seated host
     * keeps this and loses `track`, so their own screen cannot hand them the
     * answer while it still plays the clip.
     *
     * The URL carries the catalogue's track id, which a console could resolve —
     * the same residual trade a remote mode would make, and the reason the seat
     * is offered rather than assumed.
     */
    audioUrl: z.url().nullable(),
    kind: z.literal('blindtest'),
    track: hostTrackSchema.nullable()
  }),
  z.object({ kind: z.literal('buzzer') }),
  /**
   * Nothing, and it is the second arm to end up that way for a reason of its
   * own. The bare buzzer has nothing because the room owns the question; Le Fake
   * has nothing because the host screen is *in* the room — anything it renders
   * during the writing is read by everyone sitting in front of it, so the answer
   * must not be there. The truth reaches that screen the way it reaches a
   * player: unlabelled on the board, then marked at the tally.
   */
  z.object({ kind: z.literal('lefake') }),
  z.object({
    kind: z.literal('quiz'),
    question: hostQuestionSchema.nullable()
  }),
  /**
   * The third arm with nothing, and the only one where nothing is not a
   * withholding: there is no answer anywhere in this game. The console reads
   * `flipsAt` off the round like every player does, because it is flipping the
   * same screen at the same moment.
   */
  z.object({ kind: z.literal('reflex') }),
  z.object({
    /**
     * The item on the wall, grouped, and `null` until the host closes one. It
     * only ever holds a closed item, which is the whole of the wall's privacy:
     * of an item still open this arm holds counts and the host's memo and not
     * one answer.
     *
     * One item rather than the whole pile because the wall shows one, and the
     * cursor is what moves: the next snapshot carries the next item.
     */
    correction: z
      .object({
        /** Who left this item empty. Shown, and never a group — a blank cannot be validated. */
        blankPlayerIds: z.array(playerIdSchema),
        groups: z.array(slateAnswerGroupSchema)
      })
      .nullable(),
    /**
     * Per item, how many sheets have something on it. A count, like
     * `progress`: it says an item is ready to close, never what it holds.
     */
    filledCounts: z.array(z.number().int().nonnegative()),
    /**
     * The host's memo per item, `null` where none was noted. Host-only until
     * the host reveals it on a closed item, which is when it joins
     * `round.content.revealedKeys` for every screen.
     */
    keys: z.array(z.string().nullable()),
    kind: z.literal('slate'),
    /** Every seated player's count of filled lines — *Julie 12/26*. */
    progress: z.array(slateProgressSchema)
  })
])

/**
 * Adds everything a player must not see: the answer to the round in play, and
 * how much of the catalogue is left.
 */
export const hostRoomViewSchema = baseRoomViewSchema.extend({
  currentContent: hostRoundContentSchema.nullable(),
  /**
   * Whether a wall is showing the room. It is the speaker whenever it is
   * there, so this is what tells the console to keep the clip to itself.
   */
  isWallConnected: z.boolean(),
  remainingPoolSize: z.number().int().nonnegative(),
  /**
   * The seat this console took, and `null` while it is only running the room.
   * A player always has one, which is why theirs is not nullable — this is the
   * same fact for the screen that may or may not be playing too, and without it
   * a seated host cannot recognise itself in `answers` or `awards`.
   */
  youId: playerIdSchema.nullable()
})

export const playerRoomViewSchema = baseRoomViewSchema.extend({
  youId: playerIdSchema
})

/**
 * The room's own screen, and what it adds to a seatless player's view is only
 * what a wall has to show or play: the clip, and the slate's pile as it is
 * marked in front of everyone. Its own arm per game rather than the host's with
 * fields nulled, so an answer reaching it is a schema the encoder strips rather
 * than a projection somebody has to remember — `track`, `question` and the
 * slate's `keys` have no field here to land in.
 */
export const wallRoundContentSchema = z.discriminatedUnion('kind', [
  z.object({
    audioUrl: z.url().nullable(),
    kind: z.literal('blindtest')
  }),
  z.object({ kind: z.literal('buzzer') }),
  z.object({ kind: z.literal('lefake') }),
  z.object({ kind: z.literal('quiz') }),
  z.object({ kind: z.literal('reflex') }),
  z.object({
    correction: z
      .object({
        blankPlayerIds: z.array(playerIdSchema),
        groups: z.array(slateAnswerGroupSchema)
      })
      .nullable(),
    filledCounts: z.array(z.number().int().nonnegative()),
    kind: z.literal('slate'),
    progress: z.array(slateProgressSchema)
  })
])

export const wallRoomViewSchema = baseRoomViewSchema.extend({
  currentContent: wallRoundContentSchema.nullable()
})

export type RoomPhase = z.infer<typeof roomPhaseSchema>
export type PublicPlayer = z.infer<typeof publicPlayerSchema>
export type ActiveBuzz = z.infer<typeof activeBuzzSchema>
export type RoundContent = z.infer<typeof roundContentSchema>
export type HostRoundContent = z.infer<typeof hostRoundContentSchema>
export type RoundView = z.infer<typeof roundViewSchema>
export type HostRoomView = z.infer<typeof hostRoomViewSchema>
export type PlayerRoomView = z.infer<typeof playerRoomViewSchema>
export type WallRoundContent = z.infer<typeof wallRoundContentSchema>
export type WallRoomView = z.infer<typeof wallRoomViewSchema>
