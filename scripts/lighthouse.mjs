import { spawn } from 'node:child_process'
import { createRequire } from 'node:module'

import { chromium } from '@playwright/test'

/**
 * Lighthouse CI over the built app, against a browser it did not launch.
 *
 * `lhci` on its own launches Chrome through `chrome-launcher`, which makes a
 * temporary profile directory and deletes it when it kills the browser. On
 * Windows that delete fails with `EPERM` after every single run: the audit is
 * finished and the report already written, and the process still exits 1. There
 * is no flag for it. Handing Lighthouse a `port` is the way out — `chrome-
 * launcher` attaches to whatever is already listening there, so it creates no
 * profile, and its `kill()` returns before the delete it would have failed on.
 *
 * Playwright's Chromium rather than the machine's Chrome, because it is the
 * browser the end-to-end journeys already run in and pinning the two together
 * is what keeps a score comparable between two checkouts.
 */
const DEBUG_PORT = 9222

const browser = await chromium.launch({
  args: [`--remote-debugging-port=${DEBUG_PORT}`]
})

// The package's own entry point rather than the `lhci` shim, which is only on
// PATH inside a package script and this is spawned from one.
const lhciCli = createRequire(import.meta.url).resolve('@lhci/cli/src/cli.js')

const lhci = spawn(
  process.execPath,
  [
    lhciCli,
    'autorun',
    `--collect.settings.port=${DEBUG_PORT}`,
    ...process.argv.slice(2)
  ],
  { stdio: 'inherit' }
)

const code = await new Promise((resolve) => {
  lhci.on('close', resolve)
})

await browser.close()

process.exit(code ?? 1)
