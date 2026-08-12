import type { PlayerId } from '@taverla/protocol/identifiers'

import { shuffled } from '../helpers/shuffle'
import { normalizeAnswer } from '../round/answer-matching'

/**
 * How few lines the room may be asked to vote on. Three players write three
 * lies, which with the truth is a board where a wrong guess is a coin flip —
 * so the question's own authored decoys top it up rather than the game
 * demanding a fourth player.
 *
 * Five is what three decoys can always reach: a single player writing alone
 * still gets a full board.
 */
export const MINIMUM_BOARD_SIZE = 5

export type WrittenLie = {
  playerId: PlayerId
  text: string
}

export type BoardEntry = {
  /**
   * Empty for the truth and for a decoy, which is what lets the reveal say
   * "nobody wrote that" instead of crediting the house. Plural for a lie two
   * players arrived at independently.
   */
  authorIds: PlayerId[]
  id: string
  isTruth: boolean
  text: string
}

/**
 * The board the room votes on: every lie, the truth, and as many of the
 * question's own decoys as it takes to make the vote worth taking.
 *
 * Two lies that fold to the same string become **one line credited to both**.
 * The alternative is asking the second player to think of another, which
 * punishes them for arriving at the obvious lie a beat later — and being twinned
 * is funnier than being told to try again. `normalizeAnswer` decides sameness,
 * so casing and a slipped accent do not split a line in two.
 *
 * A decoy is only used if it does not collide with something a player wrote or
 * with the truth, because padding the board with a line somebody is already
 * credited for would hand them a point the house paid for.
 *
 * Ids are minted after the shuffle, so a candidate's id says nothing about who
 * wrote it or where it came from.
 */
export const buildLieBoard = ({
  decoys,
  lies,
  truth
}: {
  decoys: readonly string[]
  lies: readonly WrittenLie[]
  truth: string
}): BoardEntry[] => {
  const byText = new Map<string, BoardEntry>()

  const claim = (text: string, isTruth: boolean): BoardEntry => {
    const key = normalizeAnswer(text)
    const held = byText.get(key)

    if (held !== undefined) {
      return held
    }

    const entry: BoardEntry = { authorIds: [], id: '', isTruth, text }

    byText.set(key, entry)

    return entry
  }

  claim(truth, true)

  for (const lie of lies) {
    const entry = claim(lie.text, false)

    // A lie matching the truth is refused as it is written, so landing on that
    // entry here means two frames raced. Crediting it would pay a player for
    // knowing the answer in the one game that pays for not saying it.
    if (!entry.isTruth) {
      entry.authorIds.push(lie.playerId)
    }
  }

  for (const decoy of decoys) {
    if (byText.size >= MINIMUM_BOARD_SIZE) {
      break
    }

    claim(decoy, false)
  }

  return shuffled([...byText.values()]).map((entry, index) => ({
    ...entry,
    id: `c${index}`
  }))
}
