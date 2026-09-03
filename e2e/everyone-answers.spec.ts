import { expect, test } from '@playwright/test'

import {
  blindTestHome,
  homePage,
  hostConsole,
  playerScreen
} from './support/locators'

/**
 * The buzzer journey covers one player taking the floor. This one covers the
 * opposite shape — two phones guessing over the same clip, each of them free to
 * keep firing, and the reveal saying what each of them last wrote.
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

  // Through the game's own page, which is the shortcut: the room opens already
  // set to a blind test. `full-game.spec.ts` goes through the front door.
  //
  // The landing is awaited rather than assumed, because both pages carry a
  // "Open a table" and clicking the wrong one opens a room with no game — a
  // race that fails much later, at a launch that stays greyed out.
  await bigScreen.goto('/en')
  await homePage(bigScreen).blindTest.click()
  await expect(bigScreen).toHaveURL('/en/blindtest')
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

  await zoe.answerGuess.fill('a wild guess')
  await zoe.sendAnswer.click()

  // A guess that lands nothing costs the round nothing: the field empties and
  // is ready for the next one, which is the whole point of one field.
  await expect(zoe.answerGuess).toHaveValue('')
  await expect(zoe.answerGuess).toBeEditable()

  await zoe.answerGuess.fill('and another')
  await zoe.sendAnswer.click()
  await expect(zoe.answerGuess).toHaveValue('')

  // One phone guessing does not take the floor: the other can still write.
  await max.answerGuess.fill('another one')
  await max.sendAnswer.click()

  // Nobody found anything, so nothing closes this round by itself.
  await host.reveal.click()

  // Their latest miss, not their first: a name on the reveal with nothing
  // beside it reads as a bug rather than as a player who tried.
  await expect(host.revealedAnswer('and another')).toBeVisible()
  await expect(host.revealedAnswer('another one')).toBeVisible()
  await expect(firstPhone.getByText('It was')).toBeVisible()
})
