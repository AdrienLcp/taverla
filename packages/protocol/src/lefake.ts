import { z } from 'zod'

import { playerIdSchema } from './identifiers'

/**
 * A lie is read off a screen by a room, out loud, beside three or four others.
 * Past this it stops being scannable, and a player who needs more than this is
 * writing an essay rather than something the table might believe.
 */
export const LIE_MAX_LENGTH = 80

export const lieSchema = z.string().trim().min(1).max(LIE_MAX_LENGTH)

/**
 * One line on the board, as everyone in the room may hold it: what it says, and
 * nothing whatever about where it came from. Authorship is the entire game, so
 * it reaches no frame until the tally — see `revealedCandidateSchema`.
 *
 * The id is the room's, minted per round, and deliberately not derived from the
 * text or from whoever wrote it: it is what a vote names, and a vote must not be
 * readable as a name.
 */
export const candidateSchema = z.object({
  id: z.string().min(1),
  text: lieSchema
})

/**
 * The same line once the round is over, with everything that was withheld.
 *
 * `authorIds` is plural because two players who wrote the same lie are one line
 * on the board and both are credited for it — merging beats asking one of them
 * to think of another, and being twinned is funny. It is **empty** for the truth
 * and for a decoy that padded a short table, which is what lets the reveal say
 * "nobody wrote that one" rather than crediting the house.
 */
export const revealedCandidateSchema = candidateSchema.extend({
  authorIds: z.array(playerIdSchema),
  isTruth: z.boolean(),
  voterIds: z.array(playerIdSchema)
})

export type Candidate = z.infer<typeof candidateSchema>
export type RevealedCandidate = z.infer<typeof revealedCandidateSchema>
