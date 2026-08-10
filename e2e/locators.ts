import type { Page } from '@playwright/test'

/**
 * Roles and accessible names, in one place rather than inline in a spec — a
 * renamed button then breaks one line instead of five. Two locators reach for a
 * class because the text they point at is prose with no role of its own; that
 * is the exception, not a licence to add test ids.
 */
export const homePage = (page: Page) => ({
  /** The shelf's card for the blind test, which is where a room is opened. */
  blindTest: page.getByRole('link', { name: 'Blind test' })
})

export const blindTestHome = (page: Page) => ({
  createRoom: page.getByRole('button', { name: 'Create a room' })
})

export const hostConsole = (page: Page) => ({
  /** The track under the buzzer, on the host screen only. */
  answer: page.locator('.verdict-panel .title'),
  /** What the QR code encodes. Following it is what scanning it does. */
  joinUrl: page.locator('.join-url'),
  refusal: page.getByRole('heading', {
    name: 'That room does not exist.'
  }),
  /** The roster in the lobby, the scorers at the reveal — never both at once. */
  rowFor: (nickname: string) =>
    page.getByRole('listitem').filter({ hasText: nickname }),
  startGame: page.getByRole('button', { name: 'Start the game' }),
  theyBuzzed: (nickname: string) =>
    page.getByRole('heading', { name: `${nickname} buzzed` }),
  verdictBoth: page.getByRole('button', { name: 'Title + artist' }),
  wayOut: page.getByRole('link', { name: 'Back to the start' })
})

export const playerScreen = (page: Page) => ({
  buzz: page.getByRole('button', { name: 'Buzz' }),
  join: page.getByRole('button', { name: 'Join the game' }),
  nickname: page.getByRole('textbox', { name: 'Nickname' }),
  scored: (points: number) => page.getByText(`+${points}`)
})
