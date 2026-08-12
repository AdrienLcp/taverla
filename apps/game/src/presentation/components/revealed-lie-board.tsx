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
    <ul className='revealed-lie-board'>
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
          {!candidate.isTruth && (
            <p className='authors'>
              {candidate.authorIds.length === 0
                ? translate('lefake.reveal.nobody')
                : candidate.authorIds.map(nicknameOf).join(' · ')}
            </p>
          )}
          {candidate.voterIds.length > 0 && (
            <p className='fooled'>
              {translate(
                candidate.isTruth
                  ? 'lefake.reveal.found'
                  : 'lefake.reveal.fooled',
                { count: candidate.voterIds.length }
              )}
            </p>
          )}
        </li>
      ))}
    </ul>
  )
}

/**
 * The room reads this out loud from the top, and the answer is what they are
 * waiting for. Everything after it is the joke.
 */
const truthFirst = (one: RevealedCandidate, other: RevealedCandidate): number =>
  Number(other.isTruth) - Number(one.isTruth) ||
  other.voterIds.length - one.voterIds.length
