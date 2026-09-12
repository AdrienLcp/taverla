import type { QuestionCategory } from '@taverla/protocol/question'

import { gradeQuizGuess } from '@taverla/core/quiz/question-answer'

import { frenchViewsOf, isWellKnownInFrench } from './frwiki-notability'
import {
  type Attribution,
  acceptedOf,
  type BankedQuestion,
  cached,
  type IngestedQuestions
} from './question-source'
import { aliasesOf } from './wikidata-aliases'
import { kindsOf } from './wikidata-kinds'
import { birthYearsOf } from './wikidata-years'

/**
 * Mintaka is twenty thousand questions written by crowdworkers against
 * Wikidata and translated into eight languages, French among them. It is the
 * only open source found that reaches four figures of French questions in the
 * subjects this bank is thin in — and the only one whose answers carry Wikidata
 * identifiers, which is what makes the rest of this file possible.
 *
 * It ships **no wrong answers at all**, so unlike every other source here the
 * three decoys are not spread, they are found. That is most of what this file
 * does. See `wikidata-kinds.ts` for where they come from.
 */
const ATTRIBUTION: Attribution = {
  author: 'Amazon Science',
  language: 'fr',
  licence: 'CC BY 4.0',
  source: 'Mintaka',
  url: 'https://github.com/amazon-science/mintaka'
}

const SPLITS = ['train', 'dev', 'test'] as const

const jsonUrl = (split: string): string =>
  `https://raw.githubusercontent.com/amazon-science/mintaka/main/data/mintaka_${split}.json`

/**
 * Five of Mintaka's eight categories. Three were taken when this bank's French
 * half held 2 258 rows of arts and 1 261 of everyday against 64 of history,
 * which is why `movies`, `music`, `books` and `videogames` were left out
 * together: all four would have deepened the two subjects that needed nothing.
 * Splitting `cinema` and `videogames` off `arts` is what brings two of them
 * back — each now feeds a subject of its own, and `music` and `books` still
 * do not. The two yield very differently for the same 2 500 rows, and the gap
 * is French Wikipedia traffic rather than the fold: 619 banked for `movies`
 * against 287 for `videogames`, a studio being read about far less than a film.
 *
 * `politics` is left out for a reason of its own — it is American politics
 * almost throughout, it dates faster than anything else in the corpus, and
 * filing a question about a sitting governor under *history* would be wrong
 * twice over.
 */
const CATEGORY_OF_MINTAKA: Record<string, QuestionCategory> = {
  geography: 'geography',
  history: 'history',
  movies: 'cinema',
  sports: 'sport',
  videogames: 'videogames'
}

/**
 * The four question shapes a room can be dealt, out of the nine the corpus is
 * built on. The three left out each fail in their own way and none of them is
 * rescuable by a threshold:
 *
 * - **`comparative` names its own candidates.** *Laquelle des équipes Steelers
 *   ou Dallas Cowboys a-t-elle le plus de trophées ?* is a coin toss with the
 *   two answers printed in the prompt, so a four-candidate row hands the room
 *   two free eliminations and the other two are the question.
 * - **`difference` has more answers than it banks.** *Quelles équipes
 *   new-yorkaises de NFL ne sont pas apparues dans un Super Bowl dans les
 *   années 1990 ?* is a set, and the corpus banked one member of it. A room
 *   naming another member is right and is marked wrong.
 * - **`multihop` is a chain, and it is where the rot is.** Two hops give the
 *   sentence no subject a room can hold on to, and it is the shape that
 *   answers *britannique* — an adjective, not a thing anybody types. It also
 *   carries most of the corpus's *actuel*, which the rule below drops anyway.
 */
const SHAPES = new Set(['generic', 'intersection', 'ordinal', 'superlative'])

/**
 * Mintaka's questions are anchored *as of 8 October 2021* and say so nowhere a
 * room can see. *Qui est l'actuel plus jeune gouverneur américain ?* had one
 * answer then and has another now, and the screen would be wrong out loud in
 * front of everybody — the same fault the repairs file nulls a stale note for,
 * except that here it is the question.
 *
 * A word rule rather than a reading, because the tell is always a word: the
 * corpus has no way to ask about a moving record without naming the present.
 */
const DATED =
  /\b(actuel|actuelle|actuellement|aujourd'hui|à ce jour|dernier|dernière|derniers|dernières|plus récent|plus récente|récemment|à l'heure actuelle)\b/iu

/**
 * Sixty days of French Wikipedia traffic on the answer, and on every entity the
 * question is about. Both halves matter and they are not the same bar, which is
 * the finding PolyFact's rule already landed on — except that the sides are the
 * other way round here.
 *
 * The **answer** carries the higher bar because in this bank an answer is
 * typed, not picked: a room that has never heard of *Presbyterian College* can
 * still point at it among four, and cannot produce it from nothing. That is
 * also, on its own, the American filter this source needs. Mintaka's sport half
 * is written by American crowdworkers and no word list finds it in French —
 * *Rebels d'Ole Miss* and *Hiram College* name no league — but a French room's
 * traffic knows exactly who Michael Jordan is and has never opened the article
 * about Dennis Leonard.
 */
const ANSWER_VIEWS = 2_000
const SUBJECT_VIEWS = 500

/**
 * How far from its own answer a decoy may have been born, taken from the
 * measurement in `wikidata-years.ts`: half of upstream's pairs sat within
 * forty-one years and three quarters within ninety-one, so a hundred is where
 * the tail begins rather than where taste puts it.
 *
 * It refuses the row rather than giving way, which is the opposite of what it
 * did on the first pass. Letting it fall back to whoever was left is how
 * *Ronald Reagan* came to stand under LeBron James and *Gerald Ford* under Tom
 * Brady: both are politicians the room has heard of, both sit inside the
 * hundred years, and neither is a wrong answer anybody would weigh. A question
 * a room can strike two candidates off without thinking is worth less than the
 * row it takes up.
 */
const SAME_ERA_YEARS = 100

/**
 * How far above its unavoidable share one entity may be leant on. Mintaka's
 * basketball questions all answer somebody the room has heard of, and *Michael
 * Jordan* is the nearest neighbour of every one of them — without a cap he
 * would be a decoy under half the sport rows, and a room that meets the same
 * wrong name every other question stops reading it.
 *
 * PolyFact caps a decoy at a flat share of its relation, and that shape does
 * not transfer: it never has to invent a candidate, so its pools are as large
 * as its question sets by construction. Here a kind of eight entities may owe
 * decoys to forty rows, which is fifteen slots each before anybody has been
 * over-used — a flat cap of three refused **570 rows for a shortage it created
 * itself**. So the cap is read off the arithmetic each pool actually faces,
 * and only what sits half again above that is a repetition rather than a
 * consequence.
 */
const DECOY_SLACK = 1.5
const SMALLEST_DECOY_CAP = 3

/** The fewest candidates a kind must hold before it can dress a question. */
const SMALLEST_POOL = 8

/**
 * How many rows in a subject may answer the same thing. Mintaka asks about a
 * handful of subjects from every angle it can find — **34 of its geography
 * questions answer New York and 31 of its history ones answer Roosevelt** —
 * and the notability rule above makes that worse rather than better, because
 * the answers a French room has heard of are exactly the ones the corpus
 * circles. An evening draws about three questions per subject, so an answer
 * that comes up five times is one a table meets twice.
 *
 * A flat count rather than PolyFact's share of a relation, because the thing
 * that decides how often a repeat is inevitable is different here. There it
 * was the size of the answer pool — France recurring under *de quelle
 * nationalité* is the shape of the question. Here every subject has fifteen
 * hundred distinct answers available and the repetition is the corpus's habit,
 * not the question's.
 */
const MOST_ROWS_PER_ANSWER = 5

type UpstreamAnswer = {
  label: Partial<Record<string, string | null>>
  name: string
}

type UpstreamRow = {
  answer: {
    answer: UpstreamAnswer[] | null
    answerType: string
  }
  category: string
  complexityType: string
  id: string
  questionEntity: { entityType: string; name: string | number }[]
  translations: Partial<Record<string, string>>
}

/** A row that passed the rule, before it has been dressed with decoys. */
type Candidate = {
  answer: string
  answerId: string
  category: QuestionCategory
  isWellKnown: boolean
  prompt: string
  row: UpstreamRow
  views: number
}

const upstreamRows = async (): Promise<UpstreamRow[]> => {
  const rows: UpstreamRow[] = []

  for (const split of SPLITS) {
    const body = await cached(`mintaka-${split}.json`, async () => {
      const response = await fetch(jsonUrl(split))

      if (!response.ok) {
        throw new Error(`${jsonUrl(split)} answered ${response.status}`)
      }

      return response.text()
    })

    const read = JSON.parse(body) as UpstreamRow[]

    console.info(`  ${split}: ${read.length} rows`)

    rows.push(...read)
  }

  return rows
}

/**
 * The Wikidata identifiers the question itself names. `questionEntity` also
 * carries ordinals and dates, whose `name` is a number rather than a QID, and
 * those are the question's shape rather than its subject.
 */
const subjectsOf = (row: UpstreamRow): string[] =>
  row.questionEntity.flatMap(({ entityType, name }) =>
    entityType === 'entity' && typeof name === 'string' ? [name] : []
  )

/**
 * The one answer, in French. A row answering several — *quels Super Bowls les
 * Seahawks ont-ils perdus* — is a set the bank has no shape for, and the whole
 * of a set typed into one field is not what anybody would write.
 */
const singleFrenchAnswer = (row: UpstreamRow): UpstreamAnswer | null => {
  const [only] = row.answer.answer ?? []

  return row.answer.answerType === 'entity' &&
    row.answer.answer?.length === 1 &&
    only !== undefined &&
    typeof only.label.fr === 'string' &&
    only.label.fr.length > 0
    ? only
    : null
}

const isOfTheEra = ({
  answerYear,
  decoyYear
}: {
  answerYear: number | undefined
  decoyYear: number | undefined
}): boolean =>
  answerYear === undefined ||
  decoyYear === undefined ||
  Math.abs(answerYear - decoyYear) <= SAME_ERA_YEARS

/**
 * How far apart two entities sit in how well known they are, on a log scale
 * because the traffic spans four orders of magnitude and a plain difference
 * would rank every mid-sized article as equally close to Napoleon.
 *
 * It is what keeps a decoy from giving itself away at either end. One nobody
 * has heard of is eliminated for free; one far better known than the answer is
 * worse, because a room picks the name it recognises and the question has
 * taught it a wrong answer.
 */
const notabilityDistance = ({
  from,
  to
}: {
  from: number
  to: number
}): number => Math.abs(Math.log10(from + 1) - Math.log10(to + 1))

type PoolEntry = { entityId: string; label: string; views: number }

/** A row with its three wrong answers found, before its other spellings are known. */
type Dressed = {
  candidate: Candidate
  decoys: [PoolEntry, PoolEntry, PoolEntry]
}

/**
 * Three entities of the answer's own kind, as close to it in notability as the
 * cap allows and no further from it in time than a century. Greedy and in
 * order, the way PolyFact spreads its own: a candidate already at its cap when
 * the row is reached is skipped, so the entities every question reaches for
 * first are the ones that move.
 *
 * The era filter is dropped for a row that cannot fill three slots under it,
 * because this source builds its pool from nothing and a thin kind is common.
 */
const decoysFor = ({
  candidate,
  cap,
  pool,
  uses,
  years
}: {
  candidate: Candidate
  cap: number
  pool: readonly PoolEntry[]
  uses: Map<string, number>
  years: ReadonlyMap<string, number>
}): [PoolEntry, PoolEntry, PoolEntry] | null => {
  const answerYear = years.get(candidate.answerId)

  const fits = pool
    .filter(
      (entry) =>
        entry.entityId !== candidate.answerId &&
        entry.label !== candidate.answer &&
        !candidate.prompt.includes(entry.label) &&
        (uses.get(entry.label) ?? 0) < cap &&
        !gradeQuizGuess({
          guess: entry.label,
          question: { accepted: [], answer: candidate.answer, decoys: [] }
        }).isCorrect
    )
    .toSorted(
      (left, right) =>
        notabilityDistance({ from: candidate.views, to: left.views }) -
        notabilityDistance({ from: candidate.views, to: right.views })
    )

  const [first, second, third] = fits.filter((entry) =>
    isOfTheEra({ answerYear, decoyYear: years.get(entry.entityId) })
  )

  if (first === undefined || second === undefined || third === undefined) {
    return null
  }

  for (const entry of [first, second, third]) {
    uses.set(entry.label, (uses.get(entry.label) ?? 0) + 1)
  }

  return [first, second, third]
}

const toBankedQuestion = ({
  accepted,
  candidate,
  decoys
}: {
  accepted: string[]
  candidate: Candidate
  decoys: [string, string, string]
}): BankedQuestion => ({
  accepted,
  answer: candidate.answer,
  category: candidate.category,
  choiceOnly: false,
  decoys,
  id: `mintaka-${candidate.row.id}`,
  isAdult: false,
  isWellKnown: candidate.isWellKnown,
  language: 'fr',
  note: null,
  prompt: candidate.prompt,
  theme: `${candidate.row.category}/${candidate.row.complexityType}`
})

/**
 * Every entity of a kind, whether or not its own row became a question. That
 * distinction is the difference between a source that banks four hundred rows
 * and one that banks four times as many: a wrong answer has to be a plausible
 * thing of the right sort and nothing else, so the rows this file refuses for
 * naming the present, or for being a shape a room cannot be dealt, still hold
 * perfectly good **entities**. Restricting the pool to the survivors left
 * thirty-three kinds with enough members between them, and refused four rows in
 * five for want of anybody to stand beside.
 */
const poolsByKind = ({
  entries,
  kinds
}: {
  entries: readonly PoolEntry[]
  kinds: ReadonlyMap<string, string[]>
}): Map<string, PoolEntry[]> => {
  const byKind = new Map<string, Map<string, PoolEntry>>()

  for (const entry of entries) {
    for (const kind of kinds.get(entry.entityId) ?? []) {
      const known = byKind.get(kind) ?? new Map<string, PoolEntry>()

      known.set(entry.entityId, entry)
      byKind.set(kind, known)
    }
  }

  return new Map(
    [...byKind].flatMap(([kind, known]) =>
      known.size < SMALLEST_POOL ? [] : [[kind, [...known.values()]]]
    )
  )
}

/**
 * The widest pool the answer belongs to, which is the opposite of what this
 * first did and the correction is the whole point. An entity holds several
 * kinds at once, and the rarest of them is not the one that describes it — it
 * is the incidental one. Wikidata files Joe Biden as a politician, a lawyer, a
 * writer **and a university teacher**, and so it files Neil Armstrong and two
 * popes; picking his smallest bucket handed him that one and stood a pope
 * beside him. His largest is *politician*, and it is right.
 *
 * The reflex to distrust a large bucket is what has to be resisted here: the
 * biggest kinds in this corpus are *politician*, *country*, *big city* and
 * *basketball*, every one of which makes a plausible wrong answer. The junk
 * kinds are small, which is exactly why reaching for the smallest found them.
 *
 * Widest **within a rung**, never across them, because the three rungs are not
 * comparable and the count cannot referee between them. A basketball team's
 * discipline holds more entities than the class *basketball team* does, so the
 * larger of the two is the wrong one — the rung says which question is being
 * asked, and only then does the count say which answer to it is best served.
 *
 * **Which rung is asked first is the subject's to say**, and reading the
 * discipline first everywhere is what stood *Tom Brady* beside Joe Biden.
 * Wikidata records a sport for anybody who ever played one: Biden and Gerald
 * Ford played college football, RFK ran cross-country and Rama IX won a
 * sailing medal, so a rung order fixed at discipline-first dealt athletes to
 * **seven of the eight history rows** it reached. A sport question is about
 * the discipline and asks for it first; every other subject wants the trade.
 *
 * The eighth row is what the trade costs, and it is one row: *Jackie Robinson*
 * really was a baseball player, and his widest occupation is **military
 * officer**, so the first black man in the major leagues is now dealt three
 * Union generals. That is the incidental-kind fault one rung down rather than
 * a reason to go back — the widest bucket within a rung is measured and
 * settled, and seven rows for one is the trade it makes here.
 */
const poolFor = ({
  answerId,
  category,
  kinds,
  pools
}: {
  answerId: string
  category: QuestionCategory
  kinds: ReadonlyMap<string, string[]>
  pools: ReadonlyMap<string, PoolEntry[]>
}): PoolEntry[] | null => {
  const rungs =
    category === 'sport'
      ? ['sport', 'occupation', 'class']
      : ['occupation', 'sport', 'class']

  for (const rung of rungs) {
    const held = (kinds.get(answerId) ?? [])
      .filter((kind) => kind.startsWith(`${rung}:`))
      .flatMap((kind) => {
        const pool = pools.get(kind)

        return pool === undefined ? [] : [pool]
      })
      .toSorted((left, right) => right.length - left.length)

    if (held[0] !== undefined) {
      return held[0]
    }
  }

  return null
}

/**
 * How often each pool may lean on one of its own, read off the load it carries:
 * three slots per row it dresses, spread over its members, and half again on
 * top so that a greedy pass has somewhere to go when its first choice is spent.
 */
const decoyCaps = (
  dressed: ReadonlyArray<{ pool: PoolEntry[] | null }>
): Map<PoolEntry[], number> => {
  const rowsPerPool = new Map<PoolEntry[], number>()

  for (const { pool } of dressed) {
    if (pool !== null) {
      rowsPerPool.set(pool, (rowsPerPool.get(pool) ?? 0) + 1)
    }
  }

  return new Map(
    [...rowsPerPool].map(([pool, rows]) => [
      pool,
      Math.max(
        SMALLEST_DECOY_CAP,
        Math.ceil(((rows * 3) / pool.length) * DECOY_SLACK)
      )
    ])
  )
}

/**
 * The same rows with no subject answering the same thing more often than the
 * cap allows, the excess dropped. In corpus order, so what survives is spread
 * across the corpus rather than taken from its first pages.
 */
const withoutOverusedAnswers = (
  candidates: readonly Candidate[]
): Candidate[] => {
  const answered = new Map<string, number>()

  return candidates.filter((candidate) => {
    const key = `${candidate.category}::${candidate.answer}`
    const already = answered.get(key) ?? 0

    if (already >= MOST_ROWS_PER_ANSWER) {
      return false
    }

    answered.set(key, already + 1)

    return true
  })
}

/**
 * Every entity the corpus answers with in one of the three subjects, whatever
 * shape its own row is and whether or not that row still names the present,
 * held to the same bar an answer is held to — a decoy nobody has heard of is
 * eliminated for free, which is the fault this pool exists to avoid.
 */
const poolEntries = async (
  rows: readonly UpstreamRow[]
): Promise<PoolEntry[]> => {
  const answers = rows.flatMap((row) => {
    const answer =
      CATEGORY_OF_MINTAKA[row.category] === undefined
        ? null
        : singleFrenchAnswer(row)

    return answer === null ? [] : [answer]
  })

  const views = await frenchViewsOf({
    entityIds: answers.map(({ name }) => name),
    label: 'the pool'
  })

  const entries = new Map<string, PoolEntry>()

  for (const answer of answers) {
    const seen = views.get(answer.name) ?? 0

    if (seen >= ANSWER_VIEWS && answer.label.fr != null) {
      entries.set(answer.name, {
        entityId: answer.name,
        label: answer.label.fr,
        views: seen
      })
    }
  }

  return [...entries.values()]
}

export const ingestMintaka = async (): Promise<IngestedQuestions> => {
  const rows = await upstreamRows()
  const rejections: string[] = []

  const asked = rows.filter(
    (row) =>
      CATEGORY_OF_MINTAKA[row.category] !== undefined &&
      SHAPES.has(row.complexityType) &&
      singleFrenchAnswer(row) !== null &&
      typeof row.translations.fr === 'string'
  )

  console.info(
    `  ${asked.length} of ${rows.length} rows are a shape this bank asks, in a subject it is thin in, with one French answer`
  )

  const fresh = asked.filter((row) => !DATED.test(row.translations.fr ?? ''))

  console.info(
    `  ${fresh.length} of those do not name the present, so they will still be true next year`
  )

  const answerIds = fresh.flatMap((row) => {
    const answer = singleFrenchAnswer(row)

    return answer === null ? [] : [answer.name]
  })

  const answerViews = await frenchViewsOf({
    entityIds: answerIds,
    label: 'answers'
  })
  const known = fresh.filter((row) => {
    const answer = singleFrenchAnswer(row)

    return (
      answer !== null && (answerViews.get(answer.name) ?? 0) >= ANSWER_VIEWS
    )
  })

  console.info(
    `  ${known.length} of those answer with something a French room could produce from nothing`
  )

  const subjectViews = await frenchViewsOf({
    entityIds: known.flatMap(subjectsOf),
    label: 'subjects'
  })
  const grounded = known.filter((row) =>
    subjectsOf(row).every(
      (entityId) => (subjectViews.get(entityId) ?? 0) >= SUBJECT_VIEWS
    )
  )

  console.info(
    `  ${grounded.length} of those are about something the room has heard of`
  )

  const dressable: Candidate[] = []

  for (const row of grounded) {
    const answer = singleFrenchAnswer(row)
    const category = CATEGORY_OF_MINTAKA[row.category]
    const views = answerViews.get(answer?.name ?? '') ?? 0

    if (answer === null || category === undefined || answer.label.fr == null) {
      continue
    }

    dressable.push({
      answer: answer.label.fr,
      answerId: answer.name,
      category,
      isWellKnown: isWellKnownInFrench(views),
      prompt: row.translations.fr ?? '',
      row,
      views
    })
  }

  const candidates = withoutOverusedAnswers(dressable)

  console.info(
    `  ${candidates.length} of those do not answer what ${MOST_ROWS_PER_ANSWER} rows in the subject already answered`
  )

  const entries = await poolEntries(rows)
  const kinds = await kindsOf({
    entityIds: entries.map(({ entityId }) => entityId)
  })
  const years = await birthYearsOf({
    entityIds: entries.map(({ entityId }) => entityId)
  })
  const pools = poolsByKind({ entries, kinds })

  console.info(
    `  ${entries.length} entities over ${pools.size} kinds of ${SMALLEST_POOL} or more are what the wrong answers are drawn from`
  )

  const dressed = candidates.map((candidate) => ({
    candidate,
    pool: poolFor({
      answerId: candidate.answerId,
      category: candidate.category,
      kinds,
      pools
    })
  }))
  const caps = decoyCaps(dressed)

  const uses = new Map<string, number>()
  const banked: Dressed[] = []

  for (const { candidate, pool } of dressed) {
    if (pool === null) {
      rejections.push(
        `${candidate.row.id}: "${candidate.answer}" is the only one of its kind here`
      )
      continue
    }

    const decoys = decoysFor({
      candidate,
      cap: caps.get(pool) ?? SMALLEST_DECOY_CAP,
      pool,
      uses,
      years
    })

    if (decoys === null) {
      rejections.push(
        `${candidate.row.id}: "${candidate.answer}" has no three wrong answers left in its kind`
      )
      continue
    }

    banked.push({ candidate, decoys })
  }

  const aliases = await aliasesOf({
    entityIds: banked.flatMap(({ candidate, decoys }) => [
      candidate.answerId,
      ...decoys.map(({ entityId }) => entityId)
    ]),
    language: 'fr'
  })

  const questions = banked.map(({ candidate, decoys }) => {
    const [first, second, third] = decoys
    const wrong: [string, string, string] = [
      first.label,
      second.label,
      third.label
    ]

    return toBankedQuestion({
      accepted: acceptedOf({
        answer: candidate.answer,
        decoys: wrong,
        spellings: aliases.get(candidate.answerId) ?? [],
        wrongSpellings: decoys.flatMap(
          ({ entityId }) => aliases.get(entityId) ?? []
        )
      }),
      candidate,
      decoys: wrong
    })
  })

  console.info(
    `  ${questions.filter(({ accepted }) => accepted.length > 0).length} of those answer to a name a room may shorten, and now take it`
  )

  return { attribution: ATTRIBUTION, questions, rejections }
}
