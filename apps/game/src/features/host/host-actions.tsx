import type React from 'react'

import type { ClientMessage } from '@taverla/protocol/client-message'
import type { HostRoomView } from '@taverla/protocol/room'
import type { TrackSource } from '@taverla/protocol/track'

import { FinishedActions } from './finished-actions'
import { LobbyActions } from './lobby-actions'
import { RevealActions } from './reveal-actions'
import { RoundActions } from './round-actions'
import { SlateCorrectionActions, SlateWritingActions } from './slate-stages'
import type { SlateWall } from './use-slate-wall'

export type HostActionsProps = {
  /** What the picker is showing, which `onOpenRound` commits — so it is what the next round will be built from. */
  draftSource: TrackSource | null
  /** The socket is open. Every control here sends a frame, so none of them work without it. */
  isLive: boolean
  /** Commits the picker's draft and blesses the audio element — every control that opens a round calls it first. */
  onOpenRound: () => void
  send: (message: ClientMessage) => boolean
  /** The answer key this host prepared, sent with the press that opens a slate; absent on any other game. */
  slateKeys: (string | null)[] | undefined
  /** Whether the slate's console is showing the wall or the sheets. */
  slateWall: SlateWall
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
      // The slate writes and marks in one phase, and `host.reveal` is refused
      // while an item is still open — its answers have not been on the wall.
      if (props.view.round?.content.kind === 'slate') {
        return props.slateWall.isOnWall ? (
          <SlateCorrectionActions {...props} wall={props.slateWall} />
        ) : (
          <SlateWritingActions {...props} wall={props.slateWall} />
        )
      }

      // The one round that ends without being ended: a heat closes when
      // everyone expected in it has acted, and the press window closes it when
      // somebody never does. There is no answer to give and no field to
      // reopen, so there is nothing here to press — which is also what leaves
      // the screen the room is staring at with nothing on it that moves.
      return props.view.round?.content.kind === 'reflex' ? null : (
        <RoundActions {...props} />
      )
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
