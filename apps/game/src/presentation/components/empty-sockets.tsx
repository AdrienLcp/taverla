import type React from 'react'

import { Pawn } from './pawn'

const PAWNS_IN_THE_BOX = 8

type EmptySocketsProps = {
  /** How many seats are taken; the sockets carry on from the next pawn. */
  seated: number
}

/** A recess for every pawn still in the box, beside the seats already taken. */
export const EmptySockets: React.FC<EmptySocketsProps> = ({ seated }) => {
  const empty = Math.max(0, PAWNS_IN_THE_BOX - seated)

  if (empty === 0) {
    return null
  }

  return (
    <ul aria-hidden='true' className='sockets'>
      {Array.from({ length: empty }, (_, offset) => seated + offset).map(
        (seat) => (
          <li className='socket' key={seat}>
            <Pawn seat={seat} />
          </li>
        )
      )}
    </ul>
  )
}
