import { expect, test } from '@playwright/test'

import { blindTestHome, homePage, hostConsole, playerScreen } from './locators'

/**
 * The buzzer journey covers one player taking the floor. This one covers the
 * opposite shape — two phones answering over the same clip, the round closing
 * on the last of them, and the reveal saying what each of them wrote.
 *
 * It earns its place against a socket suite because none of that is a rule: it
 * is two browsers, two forms and a screen that has to end up showing both
 * answers. The rules are tested where they live.
 */
test('[e2e] two phones type over the same clip, and the reveal says what they said', async ({
  browser
}) => {
  const bigScreen = await browser.newPage()
  const firstPhone = await (await browser.newContext()).newPage()
  const secondPhone = await (await browser.newContext()).newPage()

  const host = hostConsole(bigScreen)

  await bigScreen.goto('/')
  await homePage(bigScreen).blindTest.click()
  await blindTestHome(bigScreen).createRoom.click()
  await expect(bigScreen).toHaveURL(/\/host\/[A-Z0-9]{4}$/)

  const joinUrl = await host.joinUrl.innerText()

  for (const [phone, nickname] of [
    [firstPhone, 'Zoe'],
    [secondPhone, 'Max']
  ] as const) {
    const player = playerScreen(phone)

    await phone.goto(joinUrl)
    await player.nickname.fill(nickname)
    await player.join.click()
    await expect(host.rowFor(nickname)).toBeVisible()
  }

  await host.startGame.click()

  // Typing is the default, so the forms are what a round opens on.
  const zoe = playerScreen(firstPhone)
  const max = playerScreen(secondPhone)

  await zoe.answerTitle.fill('a wild guess')
  await zoe.sendAnswer.click()

  // One answer does not take the floor: the other phone can still write. Its
  // field rather than its button — an empty answer is refused on its own merits.
  await expect(zoe.answerSent).toBeVisible()
  await expect(max.answerTitle).toBeEditable()

  await max.answerTitle.fill('another one')
  await max.sendAnswer.click()

  // The last answer closes the round for the whole room, host included.
  await expect(host.revealedAnswer('a wild guess')).toBeVisible()
  await expect(host.revealedAnswer('another one')).toBeVisible()
  await expect(firstPhone.getByText('It was')).toBeVisible()
})
