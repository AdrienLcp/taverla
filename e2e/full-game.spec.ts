import { expect, test } from '@playwright/test'

import { homePage, hostConsole, playerScreen } from './support/locators'

const NICKNAME = 'Zoe'

/** Spelled out rather than imported from the stub, which is the code under test here. */
const CATALOGUE_TITLES = ['Around the World', 'Genesis', 'Sexy Boy']

/**
 * Through the front door, which is the ordinary way in: the room is opened with
 * nothing chosen and the game is picked on the console while the player arrives.
 * A game's own page is the shortcut, and `everyone-answers.spec.ts` goes that
 * way — one journey per door.
 */
test('[e2e] a room, a scan, a buzz, a verdict and a point', async ({
  browser
}) => {
  const bigScreen = await browser.newPage()
  const phone = await (await browser.newContext()).newPage()

  const host = hostConsole(bigScreen)
  const player = playerScreen(phone)

  await bigScreen.goto('/')
  // The one journey that arrives at the front door, so the negotiation that
  // sends it to a language is covered where a room actually starts.
  await expect(bigScreen).toHaveURL('/en')
  await homePage(bigScreen).createRoom.click()
  await expect(bigScreen).toHaveURL(/\/host\/[A-Z0-9]{4}$/)

  // Nothing is playable until the table has decided, which is what the launch
  // says while it is greyed out.
  await expect(host.startGame).toBeDisabled()
  await host.pickBlindTest.click()

  await host.openSettings.click()
  await host.buzzerMode.click()
  await phone.goto(await host.joinUrl.innerText())
  await player.nickname.fill(NICKNAME)
  await player.join.click()

  await expect(host.rowFor(NICKNAME)).toBeVisible()
  await host.startGame.click()

  // The buzzer only enables once the clip is running, so this press is also the
  // assertion that the countdown landed.
  await player.buzz.click()

  await expect(host.theyBuzzed(NICKNAME)).toBeVisible()

  const answer = await host.answer.innerText()

  expect(CATALOGUE_TITLES).toContain(answer)

  await host.verdictBoth.click()

  await expect(phone.getByText(answer)).toBeVisible()
  await expect(player.scored(2)).toBeVisible()
  await expect(host.rowFor(NICKNAME)).toContainText('+2')
})
