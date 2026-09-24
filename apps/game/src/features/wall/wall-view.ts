import type {
  HostRoomView,
  HostRoundContent,
  WallRoomView,
  WallRoundContent
} from '@taverla/protocol/room'

/**
 * The wall's view in the shape the room's stage draws: the host's, with every
 * secret in the state the host's own view already has for "not held" — a
 * `null` track, a `null` question, no key noted. The stage then needs no second
 * reading of the round, and has nothing on the wall to leak because the wall
 * was never sent it.
 */
export const asRoomScreenView = (view: WallRoomView): HostRoomView => ({
  ...view,
  currentContent:
    view.currentContent === null ? null : withheld(view.currentContent),
  isWallConnected: true,
  remainingPoolSize: 0,
  youId: null
})

const withheld = (content: WallRoundContent): HostRoundContent => {
  switch (content.kind) {
    case 'blindtest': {
      return { ...content, track: null }
    }

    case 'quiz': {
      return { ...content, question: null }
    }

    case 'slate': {
      return { ...content, keys: content.filledCounts.map(() => null) }
    }

    default: {
      return content
    }
  }
}
