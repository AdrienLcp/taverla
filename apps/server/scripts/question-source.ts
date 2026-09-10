import { access, mkdir, readFile, writeFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

import type {
  QuestionCategory,
  QuestionLanguage
} from '@taverla/protocol/question'

const HERE = dirname(fileURLToPath(import.meta.url))
const CACHE_DIRECTORY = join(HERE, '.cache')

export type BankedQuestion = {
  accepted: string[]
  answer: string
  category: QuestionCategory
  /**
   * Whether the row is only a question while its own three decoys are beside
   * it. A source sets it where a whole rubric says so and the rubric *is* the
   * rule; `choice-only-questions.json` is the census for everywhere else,
   * which is most of the bank, because no rule finds those one at a time.
   */
  choiceOnly: boolean
  decoys: [string, string, string]
  id: string
  /** Drawn only for a room whose host asked for it. */
  isAdult: boolean
  /**
   * Whether the room can be expected to have heard of what this asks about.
   * Each source decides it its own way and neither is the other's measure —
   * Open Trivia DB says so itself, and the French half is read off the traffic
   * its subject's Wikipedia article takes. See `docs/plans/21-…`.
   */
  isWellKnown: boolean
  language: QuestionLanguage
  /** What the host reads out once the answer is public, where the source writes one. */
  note: string | null
  prompt: string
  /** Which pack it came from, so a question that turns out to be wrong is traceable. */
  theme: string
}

/**
 * Who wrote a language's questions and under what terms. One per source rather
 * than one per bank: CC BY-SA asks that the credit travel with the work, and the
 * two halves of this bank were written by different people.
 */
export type Attribution = {
  author: string
  language: QuestionLanguage
  licence: string
  source: string
  url: string
}

export type IngestedQuestions = {
  attribution: Attribution
  questions: BankedQuestion[]
  /** Rows the source offered and this script would not bank, with the reason. */
  rejections: string[]
}

export const cached = async (
  name: string,
  fetchIt: () => Promise<string>
): Promise<string> => {
  await mkdir(CACHE_DIRECTORY, { recursive: true })

  const path = join(CACHE_DIRECTORY, name)

  try {
    return await readFile(path, 'utf8')
  } catch {
    const body = await fetchIt()

    await writeFile(path, body, 'utf8')

    return body
  }
}

/**
 * A download too binary and too large to hold as a string — a parquet file runs
 * to seven megabytes of it — cached under its own name and handed back as a
 * path, so the reader can seek into the file rather than decode the whole of it.
 */
export const cachedFile = async ({
  name,
  url
}: {
  name: string
  url: string
}): Promise<string> => {
  await mkdir(CACHE_DIRECTORY, { recursive: true })

  const path = join(CACHE_DIRECTORY, name)

  try {
    await access(path)
  } catch {
    const response = await fetch(url)

    if (!response.ok) {
      throw new Error(`${url} answered ${response.status}`)
    }

    await writeFile(path, new Uint8Array(await response.arrayBuffer()))
  }

  return path
}

/**
 * A cache several runs fill in, where `cached` holds one download whole. Two
 * hundred thousand Wikidata entities are resolved a few hundred at a time over
 * the better part of an hour, and a run that dies at minute fifty must resume
 * rather than start again — so what is already known is written back as it is
 * learnt, keyed by the thing itself instead of by its position in a queue that
 * the next rule change would renumber.
 */
export const readCachedEntries = async <TValue>(
  name: string
): Promise<Record<string, TValue>> => {
  try {
    return JSON.parse(
      await readFile(join(CACHE_DIRECTORY, name), 'utf8')
    ) as Record<string, TValue>
  } catch {
    return {}
  }
}

export const writeCachedEntries = async <TValue>({
  entries,
  name
}: {
  entries: Record<string, TValue>
  name: string
}): Promise<void> => {
  await mkdir(CACHE_DIRECTORY, { recursive: true })

  await writeFile(join(CACHE_DIRECTORY, name), JSON.stringify(entries), 'utf8')
}

/**
 * Three candidates and no more, with the answer absent from them. Checked rather
 * than trusted on every row: a source that broke the shape would otherwise reach
 * a room as a question with two decoys, or with the answer sitting among them
 * twice.
 */
export const decoysOf = ({
  answer,
  candidates
}: {
  answer: string
  candidates: readonly string[]
}): [string, string, string] | null => {
  const wrong = candidates.filter((candidate) => candidate !== answer)
  const [first, second, third] = wrong

  if (
    wrong.length !== 3 ||
    first === undefined ||
    second === undefined ||
    third === undefined
  ) {
    return null
  }

  return [first, second, third]
}
