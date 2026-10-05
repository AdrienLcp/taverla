import { access, mkdir, readFile, writeFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

import { z } from 'zod'

import type {
  QuestionCategory,
  QuestionLanguage
} from '@taverla/protocol/question'

import { gradeQuizGuess } from '@taverla/core/quiz/question-answer'
import { normalizeAnswer } from '@taverla/core/round/answer-matching'

import { orStop, parseJson } from './json-file'

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

/**
 * The items in runs of at most `size`, which is how both wikis' action API is
 * asked for anything: fifty titles a request is the anonymous ceiling, and a
 * SPARQL query takes six hundred entities before it starts meeting a timeout.
 */
export const chunked = <TItem>({
  items,
  size
}: {
  items: readonly TItem[]
  size: number
}): TItem[][] => {
  const chunks: TItem[][] = []

  for (let start = 0; start < items.length; start += size) {
    chunks.push(items.slice(start, start + size))
  }

  return chunks
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
export const readCachedEntries = async <TValue extends z.ZodType>(
  name: string,
  valueSchema: TValue
): Promise<Record<string, z.infer<TValue>>> => {
  const path = join(CACHE_DIRECTORY, name)
  const text = await readFile(path, 'utf8').catch(() => null)

  return text === null
    ? {}
    : orStop(parseJson(text, z.record(z.string(), valueSchema)), path)
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

/**
 * The fewest characters a spelling may fold down to before the bank will pay
 * for it. Wikidata's French names for a country run to *É-U* and *ÉU*, and two
 * letters typed into a field are as likely a slip as an answer — the grader
 * forgives nothing below six characters precisely because nothing that short is
 * safe, and this is the same argument one step earlier.
 */
const SHORTEST_ACCEPTED = 3

/**
 * The other spellings of an answer the bank will pay a typed room for, out of
 * whatever the source found. A room shouts *Lakers* at a screen holding *Lakers
 * de Los Angeles*, and without this it is told it was wrong.
 *
 * Two of the three refusals are the grader's own judgement rather than a rule
 * of taste, asked in the shape a room would meet it:
 *
 * - **A spelling the row already wins on** buys nothing. *Los Angeles Lakers*
 *   is inside the tolerance of the label, so banking it only makes the file
 *   longer.
 * - **A spelling one of the wrong answers goes by** is the one that would do
 *   damage, and it is why the decoys' own names have to be asked for rather
 *   than their labels alone. Wikidata calls Augustus *Gaius Julius Caesar*,
 *   which is the name of the man printed beside him as a decoy — banking it
 *   pays a player for the answer the question itself called wrong.
 */
export const acceptedOf = ({
  answer,
  decoys,
  spellings,
  wrongSpellings
}: {
  answer: string
  decoys: readonly string[]
  spellings: readonly string[]
  /** The other names the row's own three wrong answers go by. */
  wrongSpellings: readonly string[]
}): string[] =>
  spellings.filter(
    (spelling) =>
      normalizeAnswer(spelling).length >= SHORTEST_ACCEPTED &&
      !gradeQuizGuess({
        guess: spelling,
        question: { accepted: [], answer, decoys }
      }).isCorrect &&
      ![...decoys, ...wrongSpellings].some(
        (wrong) =>
          gradeQuizGuess({
            guess: spelling,
            question: { accepted: [], answer: wrong, decoys: [answer] }
          }).isCorrect
      )
  )
