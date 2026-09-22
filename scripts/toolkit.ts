import { existsSync } from 'node:fs'
import { cp, readdir, readFile, rm } from 'node:fs/promises'
import { join, relative, resolve } from 'node:path'
import process from 'node:process'

/**
 * The `src/` of each of these is a byte-identical copy of the toolkit's, and
 * this script is the only thing allowed to write it. The sync is one way: a
 * brick changes in the toolkit, then lands here. Editing a copy in place is
 * what produced five dialects of `Result` across the projects.
 */
const VENDORED_PACKAGES = ['i18n', 'result']

const REPOSITORY_ROOT = resolve(import.meta.dirname, '..')
const TOOLKIT_ROOT =
  process.env.TOOLKIT_PATH ?? resolve(REPOSITORY_ROOT, '..', 'toolkit')

const filesUnder = async (directory: string) => {
  const entries = await readdir(directory, {
    recursive: true,
    withFileTypes: true
  })

  return entries
    .filter((entry) => entry.isFile())
    .map((entry) => relative(directory, join(entry.parentPath, entry.name)))
    .toSorted()
}

const differences = async (source: string, copy: string) => {
  if (!existsSync(copy)) return ['the whole directory is missing']

  const [sourceFiles, copyFiles] = await Promise.all([
    filesUnder(source),
    filesUnder(copy)
  ])

  const againstSource = await Promise.all(
    sourceFiles.map(async (file) => {
      if (!copyFiles.includes(file)) return `missing: ${file}`

      const [expected, found] = await Promise.all([
        readFile(join(source, file)),
        readFile(join(copy, file))
      ])

      return expected.equals(found) ? null : `differs: ${file}`
    })
  )

  return [
    ...againstSource.filter((line) => line !== null),
    ...copyFiles
      .filter((file) => !sourceFiles.includes(file))
      .map((file) => `not in the toolkit: ${file}`)
  ]
}

const pathsFor = (name: string) => ({
  copy: join(REPOSITORY_ROOT, 'packages', name, 'src'),
  source: join(TOOLKIT_ROOT, 'packages', name, 'src')
})

const check = async () => {
  const reports = await Promise.all(
    VENDORED_PACKAGES.map(async (name) => {
      const { copy, source } = pathsFor(name)
      return { drift: await differences(source, copy), name }
    })
  )

  const drifted = reports.filter((report) => report.drift.length > 0)

  if (drifted.length === 0) {
    console.info('Every vendored package matches the toolkit.')
    return
  }

  for (const { drift, name } of drifted) {
    console.error(`@adrienlcp/${name} has drifted from the toolkit:`)
    for (const line of drift) console.error(`  ${line}`)
  }

  console.error(
    'Change the library in the toolkit, then run `pnpm toolkit:sync`.'
  )
  process.exitCode = 1
}

const sync = async () => {
  for (const name of VENDORED_PACKAGES) {
    const { copy, source } = pathsFor(name)
    const drift = await differences(source, copy)

    await rm(copy, { force: true, recursive: true })
    await cp(source, copy, { recursive: true })

    console.info(
      drift.length === 0
        ? `@adrienlcp/${name} was already up to date.`
        : `@adrienlcp/${name}: ${drift.length} file(s) refreshed.`
    )
  }
}

const isCheck = process.argv.includes('--check')

// Nothing here is published and CI clones this repository alone, so the check
// is a local guard rather than a pipeline gate: no toolkit, nothing to compare.
if (existsSync(TOOLKIT_ROOT)) {
  await (isCheck ? check() : sync())
} else if (isCheck) {
  console.info(`No toolkit at ${TOOLKIT_ROOT} — skipping the vendored check.`)
} else {
  console.error(`No toolkit at ${TOOLKIT_ROOT}. Set TOOLKIT_PATH to find it.`)
  process.exitCode = 1
}
