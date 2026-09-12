import { readFileSync } from 'node:fs'
import { mkdir, writeFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

import { gradeQuizGuess } from '@taverla/core/quiz/question-answer'
import { normalizeAnswer } from '@taverla/core/round/answer-matching'

import { ingestMintaka } from './mintaka-source'
import { ingestOpenQuizzDb } from './openquizzdb-source'
import { ingestOpenTdb } from './opentdb-source'
import { ingestPolyFact } from './polyfact-source'
import type { BankedQuestion, IngestedQuestions } from './question-source'
import { ingestVikidia } from './vikidia-source'

/**
 * Rebuilds the question bank from the three sources it is written in, all under
 * CC BY-SA 4.0. Run it with `pnpm --filter @taverla/server questions:build`; it
 * is a one-off rather than part of the build, because the upstream packs change
 * a few times a year and a deploy should not depend on somebody else's web
 * server being up.
 *
 * Downloads are cached under `.cache/`, so a re-run after a mapping change costs
 * nothing. Cold it is slow twice over: the English drain is rate-limited to one
 * request every five seconds and takes a quarter of an hour, and PolyFact's rule
 * asks Wikidata and French Wikipedia how well known a hundred thousand entities
 * are, which takes about as long again.
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
 * What a source got wrong and this repository puts back, by row id. Three
 * kinds, and every one of them a repair a rebuild can reapply blind:
 *
 * - an `answer` whose own row disagrees with itself — the prompt asks for the
 *   island and the note spells it right underneath, or the row's own `note`
 *   names a different answer than the one it banks. Where the right answer is
 *   sitting among the three `decoys`, the repair carries both and the pair is
 *   swapped, so the row keeps four distinct candidates;
 * - a `prompt` written for a pack read in order, where the subject was named by
 *   an earlier question and this one says only *elle*. A room is dealt one
 *   question at a time and never sees the pack, so "dans quelle comédie est-elle
 *   DRH" is a question about nobody. What the pronoun pointed at is the pack's
 *   own theme, which is why putting it back is a repair rather than an
 *   improvement;
 * - a `note`, set to `null` where the source's anecdote has aged past being
 *   true — it is read out to the room after the reveal, and *Barack Obama est
 *   l'actuel président* under a correct answer is the screen being wrong out
 *   loud. The question itself survives;
 * - an `isAdult`, which only ever goes on: a row the source did not rate and a
 *   room that did not ask for it;
 * - a `drop`, for the row that means nothing in any mode — an artist the world
 *   does not have, a sentence the source garbled past reading.
 *
 * It is not a place to make a question better. Every row carries the `why` it
 * was repaired for, so a later reader can disagree with the judgement rather
 * than guess at it.
 */
type QuestionRepair = {
  answer?: string
  decoys?: [string, string, string]
  drop?: boolean
  isAdult?: boolean
  note?: string | null
  prompt?: string
  why: string
}

const repairs: Record<string, QuestionRepair> = JSON.parse(
  readFileSync(join(HERE, 'question-repairs.json'), 'utf8')
)

/**
 * Rows that are only a question because their own three decoys are under them,
 * where the source did not already say so of the whole rubric they come from.
 * *Which country drives on the left side of the road?* answers Japan, and so
 * does India, and seventy others: nothing in the wording is wrong, the answer is
 * simply picked out of a set the sentence never names. A room typing into a
 * field cannot win one.
 *
 * It is a column rather than a rule because no rule finds it *here*. The regex
 * that used to stand in for this caught the three quarters that say *which of
 * these* out loud and missed *what country is not a part of Scandinavia?*, which
 * is the same question with no marker at all — and it excluded 154 rows that are
 * perfectly answerable. Reading all 6 286 is what produced the list, and the
 * list is the artefact worth keeping.
 *
 * One rubric is the exception, and it is a rubric rather than a row: every
 * QUADRIQUIZZ question is the same riddle shape, so the source says so for all
 * of them at once. That is what `choiceOnly` on the ingested row carries, and
 * the two are read together — a rule where one exists, a reading everywhere
 * else.
 */
const choiceOnlyIds = new Set<string>(
  (
    JSON.parse(
      readFileSync(join(HERE, 'choice-only-questions.json'), 'utf8')
    ) as ReadonlyArray<{ id: string }>
  ).map(({ id }) => id)
)

/** The ingested row with this repository's own reading laid over the source's. */
const banked = (question: BankedQuestion): BankedQuestion => ({
  ...question,
  choiceOnly: question.choiceOnly || choiceOnlyIds.has(question.id)
})

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

/**
 * Upstream reissues a question under a new pack id — a crossword grid
 * republished, a Gainsbourg question in two packs about him — and the guard a
 * room already has against repeating itself is by id, so a game can ask the same
 * thing twice. The prompt is what a player recognises, so that is the key,
 * normalised the way a typed answer is.
 *
 * The first of a group survives, which is a coin toss wherever the copies
 * disagree on the answer. Those are the ones worth a repair, so they are named
 * rather than settled in silence.
 */
const withoutRepeatedPrompts = (
  questions: BankedQuestion[]
): BankedQuestion[] => {
  const seen = new Set<string>()

  return questions.filter((question) => {
    const key = `${question.language}::${normalizeAnswer(question.prompt)}`

    if (seen.has(key)) {
      return false
    }

    seen.add(key)

    return true
  })
}

const repaired = (question: BankedQuestion): BankedQuestion => {
  const repair = repairs[question.id]

  return repair === undefined
    ? question
    : {
        ...question,
        answer: repair.answer ?? question.answer,
        decoys: repair.decoys ?? question.decoys,
        isAdult: repair.isAdult ?? question.isAdult,
        note: repair.note === undefined ? question.note : repair.note,
        prompt: repair.prompt ?? question.prompt
      }
}

const report = (ingested: IngestedQuestions): void => {
  const byCategory = new Map<string, number>()

  for (const question of ingested.questions) {
    byCategory.set(
      question.category,
      (byCategory.get(question.category) ?? 0) + 1
    )
  }

  const { language, source } = ingested.attribution

  console.info(
    `\n${ingested.questions.length} questions from ${source} (${language}):`
  )

  for (const [category, count] of [...byCategory].toSorted(
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

  console.info('\nPolyFact (fr)')
  const wikidata = await ingestPolyFact()

  console.info('\nMintaka (fr)')
  const mintaka = await ingestMintaka()

  console.info('\nVikidia (fr)')
  const vikidia = await ingestVikidia()

  console.info('\nOpen Trivia DB (en)')
  const english = await ingestOpenTdb()

  const sourced = [
    ...french.questions,
    ...wikidata.questions,
    ...mintaka.questions,
    ...vikidia.questions,
    ...english.questions
  ]
  const offered = sourced
    .filter((question) => repairs[question.id]?.drop !== true)
    .map(repaired)
  const winnable = offered.filter(isWinnableTyped)
  const questions = withoutRepeatedPrompts(winnable)

  const bank = {
    attributions: [
      french.attribution,
      wikidata.attribution,
      mintaka.attribution,
      vikidia.attribution,
      english.attribution
    ],
    questions: questions.map(banked)
  }

  await writeFile(BANK_PATH, `${JSON.stringify(bank, null, 2)}\n`, 'utf8')

  report(french)
  report(wikidata)
  report(mintaka)
  report(vikidia)
  report(english)

  console.info(`\n${bank.questions.length} questions → ${BANK_PATH}`)

  for (const question of offered.filter((one) => !isWinnableTyped(one))) {
    console.info(
      `  unwinnable ${question.id}: "${question.answer}" among ${question.decoys.join(', ')}`
    )
  }

  const kept = new Set(questions.map(({ id }) => id))

  for (const question of winnable.filter(({ id }) => !kept.has(id))) {
    console.info(`  repeated ${question.id}: "${question.prompt}"`)
  }

  for (const rejection of [
    ...french.rejections,
    ...wikidata.rejections,
    ...mintaka.rejections,
    ...vikidia.rejections,
    ...english.rejections
  ]) {
    console.info(`  rejected ${rejection}`)
  }

  const sourcedIds = new Set(sourced.map(({ id }) => id))

  for (const id of Object.keys(repairs)) {
    if (!sourcedIds.has(id)) {
      console.warn(`  stale repair ${id}: no row carries that id any more`)
    }
  }

  for (const id of choiceOnlyIds) {
    if (!sourcedIds.has(id)) {
      console.warn(`  stale choice-only ${id}: no row carries that id any more`)
    }
  }
}

await run()
