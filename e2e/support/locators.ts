import type { Page } from '@playwright/test'

/**
 * Roles and accessible names, in one place rather than inline in a spec — a
 * renamed button then breaks one line instead of five. Two locators reach for a
 * class because the text they point at is prose with no role of its own; that
 * is the exception, not a licence to add test ids.
 */
export const homePage = (page: Page) => ({
  /** The shelf's card for the blind test — the shortcut, not the way in. */
  blindTest: page.getByRole('link', { name: 'Blind test' }),
  /** The front door: a room with nothing chosen yet. */
  createRoom: page.getByRole('button', { name: 'Open a table' })
})

export const blindTestHome = (page: Page) => ({
  createRoom: page.getByRole('button', { name: 'Open a table' })
})

export const hostConsole = (page: Page) => ({
  /** The track under the buzzer, on the host screen only. */
  answer: page.locator('.verdict-panel .title'),
  /**
   * Picked rather than assumed: typing is the default now, and this journey is
   * the buzzer's.
   *
   * The label rather than the radio it names — react-aria hides the `<input>`
   * under a `<label>` that takes the pointer, so the accessible name is what
   * finds it and the label is what can be clicked.
   */
  buzzerMode: page.getByText('First to buzz', { exact: true }),
  /** What the QR code encodes. Following it is what scanning it does. */
  joinUrl: page.locator('.join-url'),
  /** The settings fold away, so anything inside them is opened before it is reached. */
  openSettings: page.getByRole('button', { name: 'Settings' }),
  /**
   * One picker exists at a time: the lobby keeps it on the stage, every later
   * phase keeps it with the settings. The label rather than the radio it names,
   * same reason as `buzzerMode`.
   */
  pickBlindTest: page
    .getByRole('radiogroup', { name: 'Which game' })
    .getByText('Blind test', { exact: true }),
  refusal: page.getByRole('heading', {
    name: 'No table under that code.'
  }),
  /** Ends a simultaneous round the room is not going to finish on its own. */
  reveal: page.getByRole('button', { name: 'Give it away' }),
  /** What a player wrote, published on the reveal and not before. */
  revealedAnswer: (said: string) =>
    page.getByRole('listitem').filter({ hasText: said }),
  /**
   * The roster in the lobby, and at the reveal the round's own line — which is
   * beside the standings there rather than instead of them, so the reveal panel
   * is what the search is scoped to. What the round paid and where the game
   * stands are two facts, and a bare row search finds a name in both.
   */
  rowFor: (nickname: string) =>
    page
      .locator('.reveal-panel, .stage.lobby')
      .getByRole('listitem')
      .filter({ hasText: nickname }),
  startGame: page.getByRole('button', { name: 'Gather round' }),
  theyBuzzed: (nickname: string) =>
    page.getByRole('heading', { name: `${nickname} buzzed` }),
  verdictBoth: page.getByRole('button', { name: 'Title + artist' }),
  wayOut: page.getByRole('link', { name: 'Back to the tavern' })
})

export const playerScreen = (page: Page) => ({
  /** One field for either half — the server decides which one a guess was. */
  answerGuess: page.getByRole('textbox', { name: 'Your answer' }),
  buzz: page.getByRole('button', { name: 'Buzz' }),
  join: page.getByRole('button', { name: 'Pull up a chair' }),
  nickname: page.getByRole('textbox', { name: 'Nickname' }),
  scored: (points: number) => page.getByText(`+${points}`),
  sendAnswer: page.getByRole('button', { name: 'Send it' })
})
