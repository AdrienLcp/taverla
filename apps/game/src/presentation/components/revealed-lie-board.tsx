import type React from 'react'

import type { RevealedCandidate } from '@taverla/protocol/lefake'
import type { PublicPlayer } from '@taverla/protocol/room'

import { useTranslate } from '@/presentation/i18n/i18n-provider'

import './revealed-lie-board.sass'

type RevealedLieBoardProps = {
  board: RevealedCandidate[]
  players: PublicPlayer[]
}

/**
 * The payoff, and the same on the room's screen and in a hand: what was true,
 * who wrote each of the rest, and how many people they caught. It is the one
 * moment authorship is public, which is why nothing above it renders a name.
 */
export const RevealedLieBoard: React.FC<RevealedLieBoardProps> = ({
  board,
  players
}) => {
  const translate = useTranslate()
  const nicknameOf = (playerId: string): string =>
    players.find((player) => player.id === playerId)?.nickname ?? '—'

  return (
    // How many lines there are, for a host stage that divides its own height by
    // them rather than letting ten of them run off the bottom of the room's
    // screen. A player's screen reads it at a fixed size and ignores this.
    <ul
      className='revealed-lie-board'
      style={{ '--board-lines': board.length }}
    >
      {[...board].sort(truthFirst).map((candidate) => (
        <li className={candidate.isTruth ? 'truth' : ''} key={candidate.id}>
          {/*
            Above the line it names, the way every other reveal on the shelf
            frames its answer. Under it, "the truth was" sat between the answer
            and the list of who found it, and the room read the first name as
            the answer.
          */}
          {candidate.isTruth && (
            <p className='framing'>{translate('lefake.reveal.title')}</p>
          )}
          <p className='line'>{candidate.text}</p>
          {/*
            Who wrote it and who fell for it are one row, not two stacked at
            full width: they are two short fragments, and a room of ten paid a
            line of the screen's height for each of them ten times over.
          */}
          <p className='attribution'>
            {!candidate.isTruth && (
              <span className='authors'>
                {candidate.authorIds.length === 0
                  ? translate('lefake.reveal.nobody')
                  : candidate.authorIds.map(nicknameOf).join(' · ')}
              </span>
            )}
            {candidate.voterIds.length > 0 && (
              <span className='fooled'>
                {candidate.voterIds.length > MOST_VOTERS_NAMED
                  ? translate(
                      candidate.isTruth
                        ? 'lefake.reveal.found'
                        : 'lefake.reveal.fooled',
                      { count: candidate.voterIds.length }
                    )
                  : translate(
                      candidate.isTruth
                        ? 'lefake.reveal.foundBy'
                        : 'lefake.reveal.fooledNames',
                      { names: candidate.voterIds.map(nicknameOf).join(' · ') }
                    )}
              </span>
            )}
          </p>
        </li>
      ))}
    </ul>
  )
}

/**
 * Past this the line is a wall of names on a board already sized by how many
 * candidates there are, and a count says more than a list nobody finishes. The
 * case that asked for this is one person finding the truth, where *"1 l'a
 * trouvée"* named nobody in a room of four who all know each other.
 *
 * Naming who fell for a lie is the same call and it is deliberate: the room
 * watched the vote happen, the board already names who wrote each line, and the
 * score pays the author per person caught — a count hides nothing and says
 * less.
 */
const MOST_VOTERS_NAMED = 3

/**
 * The room reads this out loud from the top, and the answer is what they are
 * waiting for. Everything after it is the joke.
 */
const truthFirst = (one: RevealedCandidate, other: RevealedCandidate): number =>
  Number(other.isTruth) - Number(one.isTruth) ||
  other.voterIds.length - one.voterIds.length
