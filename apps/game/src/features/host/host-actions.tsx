import type React from 'react'

import type { ClientMessage } from '@taverla/protocol/client-message'
import type { HostRoomView } from '@taverla/protocol/room'

import { FinishedActions } from './finished-actions'
import { LobbyActions } from './lobby-actions'
import { RevealActions } from './reveal-actions'
import { RoundActions } from './round-actions'

export type HostActionsProps = {
  /** The socket is open. Every control here sends a frame, so none of them work without it. */
  isLive: boolean
  /** Commits the picker's draft and blesses the audio element — every control that opens a round calls it first. */
  onOpenRound: () => void
  send: (message: ClientMessage) => boolean
  view: HostRoomView
}

/**
 * What the host can press, which is a different set in every phase.
 *
 * Every one of these sends a frame, and a frame written to a socket that is not
 * open is dropped with nothing to show for it. Disabled while the connection is
 * away is the honest state: the press would be a no-op, and a control that
 * answers nothing reads as a broken game rather than a broken link.
 */
export const HostActions: React.FC<HostActionsProps> = (props) => {
  switch (props.view.phase) {
    case 'lobby':
      return <LobbyActions {...props} />
    case 'countdown':
    case 'playing':
    // The board is up and the room is choosing. It is the same control as the
    // phase before it — `host.reveal` over this game closes whichever half of
    // the round is open rather than abandoning it — and without it a vote with
    // no clock would have nothing to end it.
    case 'voting':
      return <RoundActions {...props} />
    // The floor is held, and the only thing left to decide is the verdict —
    // which the stage owns, beside the answer it is judged against.
    case 'buzzed':
      return null
    case 'revealed':
      return <RevealActions {...props} />
    case 'finished':
      return <FinishedActions {...props} />
  }
}
