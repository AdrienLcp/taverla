import { expect, test } from '@playwright/test'

import { homePage } from './support/locators'

/**
 * Not a journey, and the only spec here that is not. It plays nothing: it opens
 * one room, walks every game and both locales, and measures the shape of every
 * choice strip on the console.
 *
 * A socket test cannot stand in for it — the defect is a row of segments that
 * are the wrong width, which only a browser holds an opinion about. The check
 * exists because the widths in the stylesheets are **measured numbers**: a
 * dictionary edit lengthens a label, the row stops fitting, and the strip goes
 * back to wrapping while looking entirely deliberate. Nothing else would say so.
 */

/**
 * A geometry check reads the boxes, so it reaches for classes where the rest of
 * the suite reaches for roles. `ToggleGroup` is a toolbar and `SegmentedControl`
 * a radiogroup, so no single role finds both, and no accessible name survives
 * being asked in two locales. The two of them together are every strip there
 * is, which is why the selector below is spelled out inside each browser
 * function rather than shared — nothing in this file's scope reaches in there.
 */
const SETUP_FOLD = '.setup-fold'

/** No phone is narrower, so no strip is ever handed less than it gets here. */
const NARROWEST_SCREEN = 320

/**
 * Wrap points are at least a segment apart — sixty-odd pixels — so this is three
 * times finer than the narrowest band that can exist.
 */
const STEP_PX = 4

/** Above this every strip on the console is on one row with room to spare. */
const WIDEST_PX = 1_400

/**
 * The number of distinct strips the sweep must have seen. A check that silently
 * stopped finding controls — a renamed class, a fold that no longer opens —
 * reports exactly what a console with nothing wrong on it reports, and this is
 * the difference. Raise it when a game brings a strip of its own.
 */
const STRIPS_EXPECTED = 16

/**
 * The faces are `font-display: swap`, so a page measured the moment it is
 * visible can still be drawn in the fallback. On a Linux runner that is DejaVu,
 * wide enough to wrap every strip, and a measure racing the font failed CI
 * without ever failing on Windows, whose fallback is narrow.
 *
 * Settled again after every viewport change, not once per page: a failing
 * run's trace shows the face re-requested around each resize, which re-sizes
 * the `vmin` labels, and a sweep taken before it settles reads the fallback.
 */
const loadEveryFace = () =>
  Promise.all([...document.fonts].map((face) => face.load()))
    .then(() => document.fonts.ready)
    .then(() => {})

type Fault = {
  /** The width of the strip's own layout box, in CSS pixels. */
  at: number
  label: string
  /** `3+2+1` — how many segments each row holds, top to bottom. */
  shape: string
}

/**
 * The width every strip's box is handed on the narrowest screen there is. It is
 * the floor of what the layout can actually produce, and the reason the sweep
 * below does not report strips that only break at widths no room can reach.
 *
 * It is also the one reading that can catch a **collapsed** container, which the
 * sweep cannot: the sweep writes a width onto that box, so a strip the page
 * gives nothing is measured at every width but its own. Zero is what
 * `container-type: inline-size` resolves to wherever the box is shrink-to-fit —
 * the containment lays it out as though it held nothing — and a strip whose
 * container reads zero has every query it owns already firing.
 */
const readFloors = () => {
  const floors: Record<string, number> = {}

  for (const strip of document.querySelectorAll(
    '.segmented-control, .toggle-group'
  )) {
    const label = strip.querySelector('.react-aria-Label')?.textContent ?? ''
    let box: Element = strip

    for (
      let el: Element | null = strip;
      el !== null && el !== document.body;
      el = el.parentElement
    ) {
      if (getComputedStyle(el).containerType === 'inline-size') {
        box = el
        break
      }
    }

    floors[label] = Math.round(box.getBoundingClientRect().width)
  }

  return floors
}

/**
 * Widens each strip's own box a step at a time and reads the shape it takes.
 * The box is the nearest container ancestor rather than the strip itself,
 * because the two grids in the playlist picker take their column count from the
 * picker's width and not from their own — but never `body`, the page's own
 * container, whose width no strip is handed.
 */
const sweepShapes = ({
  floors,
  step,
  widest
}: {
  floors: Record<string, number>
  step: number
  widest: number
}) => {
  const faults: Fault[] = []
  const seen: string[] = []

  for (const strip of document.querySelectorAll(
    '.segmented-control, .toggle-group'
  )) {
    const label = strip.querySelector('.react-aria-Label')?.textContent ?? ''
    let styled = strip instanceof HTMLElement ? strip : null

    for (
      let el: Element | null = strip;
      el !== null && el !== document.body;
      el = el.parentElement
    ) {
      if (
        el instanceof HTMLElement &&
        getComputedStyle(el).containerType === 'inline-size'
      ) {
        styled = el
        break
      }
    }

    seen.push(label)

    if (styled === null) {
      continue
    }

    const restore = styled.style.width

    for (let width = floors[label] ?? 0; width <= widest; width += step) {
      styled.style.width = `${width}px`

      const rows = new Map<number, number>()

      for (const segment of strip.querySelectorAll('.segment')) {
        const top = Math.round(segment.getBoundingClientRect().top)

        rows.set(top, (rows.get(top) ?? 0) + 1)
      }

      const counts = [...rows.entries()]
        .sort(([a], [b]) => a - b)
        .map(([, held]) => held)

      if (new Set(counts).size > 1) {
        faults.push({
          at: Math.round(strip.getBoundingClientRect().width),
          label,
          shape: counts.join('+')
        })

        break
      }
    }

    styled.style.width = restore
  }

  return { faults, seen }
}

test('[layout] no strip on the console ever holds rows of two different lengths', async ({
  page
}) => {
  const collapsed: string[] = []
  const faults: string[] = []
  const measured = new Set<string>()

  await page.goto('/')
  await homePage(page).createRoom.click()
  await expect(page).toHaveURL(/\/host\/[A-Z0-9]{4}$/)

  const games = page.locator('.game-picker .box')

  await expect(games.first()).toBeVisible()

  const gameCount = await games.count()

  for (const locale of ['en', 'fr']) {
    await page.evaluate((chosen) => {
      localStorage.setItem('taverla:locale', chosen)
    }, locale)
    await page.reload()
    await expect(games.first()).toBeVisible()
    await page.evaluate(loadEveryFace)

    for (let index = 0; index < gameCount; index++) {
      await games.nth(index).click()
      // The panel for this game renders in the same commit that marks the
      // stamp, so waiting on the stamp is what stops the reads below from
      // finding the previous game's strips — or none at all.
      await expect(games.nth(index)).toHaveAttribute('data-selected', 'true')

      if ((await page.locator(`${SETUP_FOLD}[data-expanded]`).count()) === 0) {
        await page.locator(`${SETUP_FOLD} .trigger`).click()
        await expect(page.locator(`${SETUP_FOLD}[data-expanded]`)).toBeVisible()
      }

      // Two strips only exist once another strip has been pressed: the decade
      // grid, and the window a buzz has to be answered in. `decade` is second
      // among the sources and `buzzer` first among the modes — both assert what
      // they revealed, so a reordering fails here instead of quietly halving
      // what this spec covers.
      const source = page.locator('.track-source .segment')

      if ((await source.count()) > 0) {
        await source.nth(1).click()
        await expect(page.locator('.decades')).toBeVisible()
      }

      const modes = page.locator('.answer-mode .segment')

      if ((await modes.count()) > 0) {
        await modes.first().click()
      }

      await page.setViewportSize({ height: 900, width: NARROWEST_SCREEN })
      await page.evaluate(loadEveryFace)

      const floors = await page.evaluate(readFloors)

      for (const [label, floor] of Object.entries(floors)) {
        if (floor === 0) {
          collapsed.push(`${locale} · ${label}`)
        }
      }

      await page.setViewportSize({ height: 900, width: WIDEST_PX })
      await page.evaluate(loadEveryFace)

      const { faults: found, seen } = await page.evaluate(sweepShapes, {
        floors,
        step: STEP_PX,
        widest: WIDEST_PX
      })

      for (const label of seen) {
        measured.add(label)
      }

      for (const fault of found) {
        faults.push(
          `${locale} · ${fault.label} · ${fault.shape} at ${fault.at}px`
        )
      }
    }
  }

  expect(collapsed).toEqual([])
  expect(faults).toEqual([])
  expect(measured.size).toBeGreaterThanOrEqual(STRIPS_EXPECTED)
})
