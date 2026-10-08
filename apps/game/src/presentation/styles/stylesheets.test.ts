import { globSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'

import {
  findTokenFailures,
  findTypeLiterals,
  findUnitFailures,
  findUnnamedValues
} from '@adrienlcp/styles/audit'
import { describe, expect, it } from 'vitest'

const SOURCE_ROOT = fileURLToPath(new URL('../..', import.meta.url))
const STYLESHEETS = globSync('**/*.{sass,css}', { cwd: SOURCE_ROOT })
const SOURCES = globSync('**/*.{sass,css,ts,tsx}', { cwd: SOURCE_ROOT }).map(
  (path) => readFileSync(join(SOURCE_ROOT, path), 'utf8')
)

/**
 * A name a script builds from a template — `var(--pawn-${number})` — reaches
 * `findTokenFailures` as its bare prefix, `--pawn-`, which no stylesheet
 * declares: the numbered names it resolves to are declared in `_tokens.sass`.
 */
const isInterpolatedPrefix = ({ name }: { name: string }) => name.endsWith('-')

describe.each(STYLESHEETS)('%s', (path) => {
  const stylesheet = readFileSync(join(SOURCE_ROOT, path), 'utf8')

  it('[units] sizes text, spacing and boxes in rem', () => {
    expect(findUnitFailures(stylesheet)).toEqual([])
  })

  it.skipIf(path.endsWith('_typography.sass'))(
    '[type] takes its text voice from the typography mixins',
    () => {
      expect(findTypeLiterals(stylesheet)).toEqual([])
    }
  )

  it('[tokens] takes its radii and durations from tokens', () => {
    expect(findUnnamedValues(stylesheet)).toEqual([])
  })
})

it('[tokens] reads only custom properties that exist, under their one shared name', () => {
  expect(
    findTokenFailures(SOURCES).filter(
      (failure) => !isInterpolatedPrefix(failure)
    )
  ).toEqual([])
})
