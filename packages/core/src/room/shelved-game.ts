import { type ShelvedGame, shelvedGames } from '@taverla/protocol/game'

/**
 * Whether a room may be opened on this game. Narrower than `GameKind`, which is
 * the whole vocabulary — a game can be served in full and still be off the
 * shelf while its screens are being built.
 */
export const isShelvedGame = (value: string): value is ShelvedGame =>
  shelvedGames.some((game) => game === value)
