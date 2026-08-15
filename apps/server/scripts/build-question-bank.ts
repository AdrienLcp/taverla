import { mkdir, writeFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

import { gradeQuizGuess } from '@taverla/core/quiz/question-answer'

import { ingestOpenQuizzDb } from './openquizzdb-source'
import { ingestOpenTdb } from './opentdb-source'
import type { BankedQuestion, IngestedQuestions } from './question-source'

/**
 * Rebuilds the question bank from the two sources it is written in, both under
 * CC BY-SA 4.0. Run it with `pnpm --filter @taverla/server questions:build`; it
 * is a one-off rather than part of the build, because the upstream packs change
 * a few times a year and a deploy should not depend on somebody else's web
 * server being up.
 *
 * Downloads are cached under `.cache/`, so a re-run after a mapping change costs
 * nothing — which matters more for the English half, whose drain is rate-limited
 * to one request every five seconds and takes a quarter of an hour cold.
 */
const HERE = dirname(fileURLToPath(import.meta.url))
const BANK_PATH = join(
  HERE,
  '..',
  'src',
  'infrastructure',
  'questions',
  'question-bank.json'
)

/**
 * What a source got wrong and will keep getting wrong, by id. It is not a place
 * to improve a question — only to repair one whose own row disagrees with
 * itself, which is the only kind a rebuild can be trusted to reapply blind.
 */
const CORRECTIONS: Record<string, string> = {
  /** The prompt asks for the island and the note spells it right underneath. */
  'oqdb-163-1': 'Alcatraz'
}

/**
 * A question typed mode cannot be won at. The decoys are the source saying what
 * it considers a different answer, so one the matcher would grade right is a
 * row where the two disagree — and an answer that folds away to nothing, `-`
 * among Ed Sheeran's albums, is one nobody can type at all.
 *
 * Both are dropped rather than carried, because a room is dealt whatever comes
 * up: a question that cannot be answered is worse than a bank three rows
 * shorter, and there are six thousand of them.
 */
const isWinnableTyped = (question: BankedQuestion): boolean =>
  gradeQuizGuess({ guess: question.answer, question }).isCorrect &&
  !question.decoys.some(
    (decoy) => gradeQuizGuess({ guess: decoy, question }).isCorrect
  )

const corrected = (question: BankedQuestion): BankedQuestion => {
  const answer = CORRECTIONS[question.id]

  return answer === undefined ? question : { ...question, answer }
}

const report = (ingested: IngestedQuestions): void => {
  const byCategory = new Map<string, number>()

  for (const question of ingested.questions) {
    byCategory.set(
      question.category,
      (byCategory.get(question.category) ?? 0) + 1
    )
  }

  const { language } = ingested.attribution

  console.info(`\n${ingested.questions.length} questions in ${language}:`)

  for (const [category, count] of [...byCategory].sort(
    ([, left], [, right]) => right - left
  )) {
    const share = count / ingested.questions.length

    console.info(
      `  ${category.padEnd(10)} ${String(count).padStart(5)}  ${Math.round(share * 100)}%`
    )
  }

  if (ingested.rejections.length > 0) {
    console.info(`  ${ingested.rejections.length} rejected`)
  }
}

const run = async (): Promise<void> => {
  await mkdir(dirname(BANK_PATH), { recursive: true })

  console.info('OpenQuizzDB (fr)')
  const french = await ingestOpenQuizzDb()

  console.info('\nOpen Trivia DB (en)')
  const english = await ingestOpenTdb()

  const offered = [...french.questions, ...english.questions].map(corrected)
  const questions = offered.filter(isWinnableTyped)

  const bank = {
    attributions: [french.attribution, english.attribution],
    questions
  }

  await writeFile(BANK_PATH, `${JSON.stringify(bank, null, 2)}\n`, 'utf8')

  report(french)
  report(english)

  console.info(`\n${bank.questions.length} questions → ${BANK_PATH}`)

  for (const question of offered.filter((one) => !isWinnableTyped(one))) {
    console.info(
      `  unwinnable ${question.id}: "${question.answer}" among ${question.decoys.join(', ')}`
    )
  }

  for (const rejection of [...french.rejections, ...english.rejections]) {
    console.info(`  rejected ${rejection}`)
  }
}

await run()
