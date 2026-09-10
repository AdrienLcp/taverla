import { asyncBufferFromFile, parquetReadObjects } from 'hyparquet'

import type { QuestionCategory } from '@taverla/protocol/question'

import { gradeQuizGuess } from '@taverla/core/quiz/question-answer'

import { frenchViewsOf, isWellKnownInFrench } from './frwiki-notability'
import {
  type Attribution,
  type BankedQuestion,
  cachedFile,
  decoysOf,
  type IngestedQuestions
} from './question-source'
import { birthYearsOf } from './wikidata-years'

/**
 * PolyFact is fifty-eight thousand French multiple-choice questions generated
 * from Wikidata statements, and what it actually holds is fourteen sentence
 * templates filled in over and over. Most of it is unusable for a room — a
 * template asked about a Turkish hamlet is still a template — so almost all of
 * this file is the rule that decides which sliver is not.
 */
const ATTRIBUTION: Attribution = {
  author: 'jvonrad',
  language: 'fr',
  licence: 'CC BY-SA 4.0',
  source: 'PolyFact',
  url: 'https://huggingface.co/datasets/jvonrad/PolyFact'
}

const SPLITS = ['train', 'validation', 'test'] as const

/**
 * The whole split at once rather than the `/rows` API, which refuses from around
 * the eleven-thousandth row whatever the throttle — a hundred and forty-nine
 * pages of five hundred and sixty-four in a quarter of an hour, with the backoff
 * still climbing. Three files and seven megabytes answer the same question.
 */
const parquetUrl = (split: string): string =>
  `https://huggingface.co/datasets/jvonrad/PolyFact/resolve/main/data/fr/${split}.parquet`

/**
 * The seven templates a French room can be asked, and where each lands among the
 * six categories a host picks from.
 *
 * The whitelist is what carries the quality here, not the popularity thresholds
 * below — every relation left out fails for a reason of its own. `country`,
 * `continent` and `official language` are asked about villages and answered by
 * things everyone has heard of, so they are guessable without knowing anything,
 * and they are also where the answer leaks into the prompt: *dans quel pays se
 * trouve la cathédrale Notre-Dame de **Strasbourg*** answers itself. `educated
 * at` and `architect` are unguessable at both ends. `language of work or name`
 * is a database field read out loud — *en quelle langue sont écrits les œuvres,
 * le nom ou le terme de Ciemniewski ?*. `manufacturer` is a long tail of
 * equipment.
 *
 * `developer` sits in `arts` beside the films and the books because in practice
 * it is a video-game question — fifteen of the sixteen that survived the rule on
 * the audited split — which is where the English half puts them too. The two
 * relations about a person rather than a work go to `everyday`: *de quelle
 * nationalité est X* and *où X est-il mort* answer with a country and a city,
 * but a host who ticked geography is asking about the world, not about who died
 * where.
 */
const CATEGORY_OF_RELATION: Record<string, QuestionCategory> = {
  author: 'arts',
  'country of citizenship': 'everyday',
  creator: 'arts',
  developer: 'arts',
  director: 'arts',
  'discoverer or inventor': 'science',
  'place of death': 'everyday'
}

/**
 * Sixty days of French Wikipedia traffic, on the subject and on all four
 * candidates. Settled by reading questions rather than picked: at three hundred
 * the rule keeps Hergé, Sartre, Playdead and Jeannie Longo, and at twelve
 * hundred it keeps a third fewer and loses Hergé and Sartre along with the noise.
 *
 * Both halves are needed and they are not the same bar. A subject nobody has
 * heard of is a question nobody can answer; a *candidate* nobody has heard of is
 * a decoy that gives itself away, and three of those turn a question into a
 * pointing exercise.
 */
const SUBJECT_VIEWS = 300
const OPTION_VIEWS = 60

/**
 * Upstream draws its decoys from a pool it never rebalances, so one entity can
 * carry a sixth of a relation: *Gunter Demnig*, who laid the Stolpersteine and
 * is therefore the creator of tens of thousands of Wikidata items, was a decoy
 * in fifteen of the eighty-five rows the rule kept on the audited split. A room
 * that meets the same wrong name every sixth question stops reading it.
 *
 * The cap is a share of the relation rather than a count, because a relation's
 * pool is what decides how often a repeat is inevitable: there are two hundred
 * countries and *de quelle nationalité* is answered by one of them, so France
 * recurring is the shape of the question, not a defect. A decoy over the cap is
 * swapped for the least-used candidate the relation offers — never a reason to
 * refuse the row, which is fine as it stands.
 */
const MAX_DECOY_SHARE = 0.02
const SMALLEST_DECOY_CAP = 3

/**
 * The same defect on the other side of the row, and it is the worse one: the
 * answer to *de quelle nationalité est X* is **France in 154 of the 418 rows
 * upstream offers and the United States in 94**, so a room that answers France
 * without reading the question takes better than one round in three. Typed mode
 * pays that in full, and choice mode still pays it above the quarter a random
 * pick is worth. `place of death` has the milder version of it — Paris, 29 rows
 * of 214.
 *
 * Capped rather than filtered: dropping every France would teach a room the
 * answer is *never* France, which is the same exploit facing the other way. The
 * excess rows go, and the ones that stay leave the answer about as likely as
 * any other the relation offers.
 */
const MOST_OF_A_RELATION = 0.05

/**
 * How far from its own answer a decoy may have been born. Upstream's wrong
 * answers are entities that answer the same relation somewhere in Wikidata,
 * which passes on everybody — *Aristote* is the author of something, so he was
 * offered as a possible author of a manga published in 2015. **One decoy slot in
 * six sat more than a hundred and fifty years from its answer**, and a room
 * eliminates those knowing nothing at all.
 *
 * A hundred years is where the gaps themselves say the tail begins: half the
 * pairs are within forty-one years and three quarters within ninety-one, so the
 * cut leaves what upstream got right and moves what it did not. Wider lets
 * *Pétrarque* stand under the Little Red Book; much narrower starts moving
 * decoys a room would have had to know something to eliminate, which is what a
 * decoy is for.
 *
 * It needs no list of the relations it applies to. Only a person carries a birth
 * date, so a studio, a city and a country have none and the rule never fires on
 * `developer`, `place of death` or `country of citizenship` — where a century is
 * not what makes a candidate wrong anyway.
 */
const SAME_ERA_YEARS = 100

type UpstreamRow = {
  answer_text: string
  fact_id: string
  option_a: string
  option_b: string
  option_c: string
  option_d: string
  option_ids: string[]
  question: string
  relation: string
}

/** A row that passed the rule, before its decoys have been spread out. */
type Candidate = {
  answer: string
  category: QuestionCategory
  decoys: [string, string, string]
  isWellKnown: boolean
  row: UpstreamRow
}

const COLUMNS = [
  'answer_text',
  'fact_id',
  'option_a',
  'option_b',
  'option_c',
  'option_d',
  'option_ids',
  'question',
  'relation'
]

const upstreamRows = async (): Promise<UpstreamRow[]> => {
  const rows: UpstreamRow[] = []

  for (const split of SPLITS) {
    const path = await cachedFile({
      name: `polyfact-fr-${split}.parquet`,
      url: parquetUrl(split)
    })

    const read = await parquetReadObjects({
      columns: COLUMNS,
      file: await asyncBufferFromFile(path)
    })

    console.info(`  ${split}: ${read.length} rows`)

    rows.push(...(read as UpstreamRow[]))
  }

  return rows
}

/** `subjectQID|propertyID|objectQID`, which is the only place the subject's id appears. */
const subjectOf = (row: UpstreamRow): string => row.fact_id.split('|')[0] ?? ''

const optionsOf = (row: UpstreamRow): string[] => [
  row.option_a,
  row.option_b,
  row.option_c,
  row.option_d
]

/**
 * Upstream has a template that forgot its interrogative word, and it is 59 rows
 * of the banked set: *Merantau a été réalisé ou mis en scène par ?* is not a
 * question, it is a sentence stopped short, and the screen the whole room is
 * reading shows it as one. Putting `qui` back is the smallest repair that needs
 * no agreement — rewriting it as *par qui X a-t-il été réalisé* would have to
 * know whether the subject is masculine, and the subject is a film title.
 */
const withTheMissingInterrogative = (prompt: string): string =>
  prompt.replace(/ par \?$/u, ' par qui ?')

const toCandidate = ({
  isWellKnown,
  row
}: {
  isWellKnown: boolean
  row: UpstreamRow
}): Candidate | null => {
  const category = CATEGORY_OF_RELATION[row.relation]
  const decoys = decoysOf({
    answer: row.answer_text,
    candidates: optionsOf(row)
  })

  if (category === undefined || decoys === null) {
    return null
  }

  return { answer: row.answer_text, category, decoys, isWellKnown, row }
}

/**
 * The same candidates with no answer carrying more of its relation than the cap
 * allows, the excess dropped. It runs before the decoys are spread, so the
 * decoy caps are computed over the rows that will actually ship.
 */
const withoutOverusedAnswers = (
  candidates: readonly Candidate[]
): Candidate[] => {
  const rowsOfRelation = new Map<string, number>()

  for (const candidate of candidates) {
    rowsOfRelation.set(
      candidate.row.relation,
      (rowsOfRelation.get(candidate.row.relation) ?? 0) + 1
    )
  }

  const answered = new Map<string, number>()

  return candidates.filter((candidate) => {
    const key = `${candidate.row.relation}::${candidate.answer}`
    const cap = Math.ceil(
      (rowsOfRelation.get(candidate.row.relation) ?? 0) * MOST_OF_A_RELATION
    )
    const already = answered.get(key) ?? 0

    if (already >= cap) {
      return false
    }

    answered.set(key, already + 1)

    return true
  })
}

/**
 * A decoy the relation can bear, chosen as the one it has leant on least. It has
 * to survive the same grader a player's typing meets: swapping in a name the
 * matcher would grade right would lose the row to `isWinnableTyped` further down
 * the build, which is a strange way to fix a repetition.
 */
const leastUsedFit = ({
  answer,
  answerYear,
  beside,
  pool,
  uses,
  years
}: {
  answer: string
  answerYear: number | undefined
  beside: readonly string[]
  pool: readonly string[]
  uses: Map<string, number>
  years: ReadonlyMap<string, number>
}): string | null => {
  const taken = new Set([answer, ...beside])

  const fits = pool
    .filter((label) => !taken.has(label))
    .filter(
      (label) =>
        !gradeQuizGuess({
          guess: label,
          question: { accepted: [], answer, decoys: [...beside] }
        }).isCorrect
    )
    .sort((left, right) => (uses.get(left) ?? 0) - (uses.get(right) ?? 0))

  const ofTheEra = fits.filter((label) =>
    isOfTheEra({ answerYear, label, years })
  )

  return ofTheEra[0] ?? fits[0] ?? null
}

/**
 * Dated *and* near, rather than merely not known to be far. An undated entity
 * passes every era test there is and has never been used, so ranking on the
 * absence of a fault put it first every time: the *United States Holocaust
 * Memorial Museum* stood as a possible author of a La Fontaine fable, and
 * *Vichnou-Sarma* under two rows at once. Neither is a person, which is why
 * neither has a birth date — the missing year is the tell, not the excuse.
 */
const isOfTheEra = ({
  answerYear,
  label,
  years
}: {
  answerYear: number | undefined
  label: string
  years: ReadonlyMap<string, number>
}): boolean => {
  const decoyYear = years.get(label)

  return (
    answerYear !== undefined &&
    decoyYear !== undefined &&
    Math.abs(answerYear - decoyYear) <= SAME_ERA_YEARS
  )
}

/**
 * Only where both sides are dated, so an entity Wikidata holds no birth date for
 * is left where upstream put it rather than moved on a guess.
 */
const isAnEraApart = ({
  answerYear,
  decoyYear
}: {
  answerYear: number | undefined
  decoyYear: number | undefined
}): boolean =>
  answerYear !== undefined &&
  decoyYear !== undefined &&
  Math.abs(answerYear - decoyYear) > SAME_ERA_YEARS

/**
 * The pool speaks labels and Wikidata speaks entity ids, so the two are joined
 * here: `option_ids` is positionally aligned with `option_a` through `option_d`,
 * which is the only place that correspondence exists.
 */
const birthYearsOfLabels = async (
  candidates: readonly Candidate[]
): Promise<Map<string, number>> => {
  const byEntity = await birthYearsOf({
    entityIds: candidates.flatMap((candidate) => candidate.row.option_ids)
  })
  const byLabel = new Map<string, number>()

  for (const { row } of candidates) {
    optionsOf(row).forEach((label, index) => {
      const year = byEntity.get(row.option_ids[index] ?? '')

      if (year !== undefined) {
        byLabel.set(label, year)
      }
    })
  }

  return byLabel
}

/**
 * The same candidates with no entity carrying more of a relation than the cap
 * allows, and no decoy an era away from the answer it stands beside. Greedy and
 * in order: a decoy already at the cap when the row is reached is the one
 * swapped, so the entities upstream over-drew are the ones that move and
 * everything else is left alone.
 */
export const withDecoysSpread = ({
  candidates,
  years
}: {
  candidates: readonly Candidate[]
  years: ReadonlyMap<string, number>
}): Candidate[] => {
  const byRelation = new Map<string, Candidate[]>()

  for (const candidate of candidates) {
    byRelation.set(candidate.row.relation, [
      ...(byRelation.get(candidate.row.relation) ?? []),
      candidate
    ])
  }

  const spread: Candidate[] = []

  for (const [relation, ofRelation] of byRelation) {
    const cap = Math.max(
      SMALLEST_DECOY_CAP,
      Math.ceil(ofRelation.length * MAX_DECOY_SHARE)
    )
    const pool = [
      ...new Set(ofRelation.flatMap((candidate) => optionsOf(candidate.row)))
    ]
    const uses = new Map<string, number>()

    let swapped = 0
    let dated = 0

    for (const candidate of ofRelation) {
      const kept: string[] = []
      const answerYear = years.get(candidate.answer)

      for (const decoy of candidate.decoys) {
        const eraApart = isAnEraApart({
          answerYear,
          decoyYear: years.get(decoy)
        })
        const fit =
          (uses.get(decoy) ?? 0) < cap && !eraApart
            ? decoy
            : (leastUsedFit({
                answer: candidate.answer,
                answerYear,
                beside: kept,
                pool,
                uses,
                years
              }) ?? decoy)

        if (fit !== decoy) {
          swapped++

          if (eraApart) {
            dated++
          }
        }

        uses.set(fit, (uses.get(fit) ?? 0) + 1)
        kept.push(fit)
      }

      const [first, second, third] = kept

      spread.push(
        first === undefined || second === undefined || third === undefined
          ? candidate
          : { ...candidate, decoys: [first, second, third] }
      )
    }

    console.info(
      `  ${relation}: ${ofRelation.length} rows, decoy cap ${cap}, ${swapped} swapped (${dated} an era apart)`
    )
  }

  return spread
}

const toBankedQuestion = ({
  answer,
  category,
  decoys,
  isWellKnown,
  row
}: Candidate): BankedQuestion => ({
  accepted: [],
  answer,
  category,
  decoys,
  id: `polyfact-${row.fact_id.replaceAll('|', '-')}`,
  isAdult: false,
  isWellKnown,
  language: 'fr',
  note: null,
  prompt: withTheMissingInterrogative(row.question),
  theme: row.relation
})

export const ingestPolyFact = async (): Promise<IngestedQuestions> => {
  const rows = await upstreamRows()
  const rejections: string[] = []

  const refused = new Map<string, number>()

  for (const row of rows) {
    if (CATEGORY_OF_RELATION[row.relation] === undefined) {
      refused.set(row.relation, (refused.get(row.relation) ?? 0) + 1)
    }
  }

  for (const [relation, count] of [...refused].sort(
    ([, left], [, right]) => right - left
  )) {
    console.info(`  skip ${relation}: ${count} rows — not asked here`)
  }

  const asked = rows.filter(
    (row) => CATEGORY_OF_RELATION[row.relation] !== undefined
  )

  const subjectViews = await frenchViewsOf({
    entityIds: asked.map(subjectOf),
    label: 'subjects'
  })
  const known = asked.filter(
    (row) => (subjectViews.get(subjectOf(row)) ?? 0) >= SUBJECT_VIEWS
  )

  console.info(
    `  ${known.length} of ${asked.length} rows are about somebody the room has heard of`
  )

  const optionViews = await frenchViewsOf({
    entityIds: known.flatMap((row) => row.option_ids),
    label: 'options'
  })
  const guessable = known.filter((row) =>
    row.option_ids.every(
      (entityId) => (optionViews.get(entityId) ?? 0) >= OPTION_VIEWS
    )
  )

  console.info(
    `  ${guessable.length} of those offer four candidates the room has heard of`
  )

  const candidates: Candidate[] = []

  for (const row of guessable) {
    const candidate = toCandidate({
      isWellKnown: isWellKnownInFrench(subjectViews.get(subjectOf(row)) ?? 0),
      row
    })

    if (candidate === null) {
      rejections.push(`${row.fact_id}: ${optionsOf(row).join(' / ')}`)
      continue
    }

    candidates.push(candidate)
  }

  const spread = withoutOverusedAnswers(candidates)

  console.info(
    `  ${spread.length} of those do not answer what the last one answered`
  )

  return {
    attribution: ATTRIBUTION,
    questions: withDecoysSpread({
      candidates: spread,
      years: await birthYearsOfLabels(spread)
    }).map(toBankedQuestion),
    rejections
  }
}
