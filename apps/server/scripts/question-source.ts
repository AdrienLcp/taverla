import { mkdir, readFile, writeFile } from 'node:fs/promises'
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
  decoys: [string, string, string]
  id: string
  /** Drawn only for a room whose host asked for it. */
  isAdult: boolean
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
