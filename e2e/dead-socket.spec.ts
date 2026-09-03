import { expect, test } from '@playwright/test'

import { hostConsole } from './support/locators'

/** In the alphabet, so the router accepts it — and held by no room. */
const NOBODY_HOME = 'K3M9'

test('[e2e] a host pointed at a room that is gone is told, and given a way out', async ({
  page
}) => {
  const host = hostConsole(page)

  await page.goto(`/host/${NOBODY_HOME}`)

  await expect(host.refusal).toBeVisible()
  await expect(host.wayOut).toBeVisible()

  // The console itself is gone rather than annotated: a lobby left under a dead
  // socket invites pressing buttons whose frames go nowhere.
  await expect(host.startGame).toBeHidden()

  await host.wayOut.click()
  // The language the URL carries, not the bare root: the way out of a dead
  // room is a link like any other, and every link names its language.
  await expect(page).toHaveURL('/en')
})
