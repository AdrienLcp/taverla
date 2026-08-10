import { expect, test } from '@playwright/test'

import { blindTestHome, homePage, hostConsole, playerScreen } from './locators'

const NICKNAME = 'Zoe'

/** Spelled out rather than imported from the stub, which is the code under test here. */
const CATALOGUE_TITLES = ['Around the World', 'Genesis', 'Sexy Boy']

test('[e2e] a room, a scan, a buzz, a verdict and a point', async ({
  browser
}) => {
  const bigScreen = await browser.newPage()
  const phone = await (await browser.newContext()).newPage()

  const host = hostConsole(bigScreen)
  const player = playerScreen(phone)

  await bigScreen.goto('/')
  await homePage(bigScreen).blindTest.click()
  await blindTestHome(bigScreen).createRoom.click()
  await expect(bigScreen).toHaveURL(/\/host\/[A-Z0-9]{4}$/)

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
