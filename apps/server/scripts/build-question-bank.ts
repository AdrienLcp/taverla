import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

import type {
  QuestionCategory,
  QuestionLanguage
} from '@taverla/protocol/question'

/**
 * Rebuilds the question bank from OpenQuizzDB, who publish a four-question
 * sample per theme under CC BY-SA 4.0. Run it with
 * `pnpm --filter @taverla/server questions:build`; it is a one-off rather than
 * part of the build, because the upstream packs change a few times a year and a
 * deploy should not depend on somebody else's web server being up.
 *
 * Downloads are cached under `.cache/`, so a re-run after a mapping change
 * costs nothing.
 */
const LISTING_URL = 'https://www.openquizzdb.org/listing'
const DOWNLOAD_URL = 'https://www.openquizzdb.org/download.php'

const HERE = dirname(fileURLToPath(import.meta.url))
const CACHE_DIRECTORY = join(HERE, '.cache')
const BANK_PATH = join(
  HERE,
  '..',
  'src',
  'infrastructure',
  'quiz',
  'question-bank.json'
)

/**
 * Their rubrics folded onto the six a host can actually pick from. The fold is
 * coarse on purpose: six chips fit a phone, and a room choosing between
 * twenty-eight is a room reading a menu instead of playing.
 */
const CATEGORY_OF_RUBRIC: Record<string, QuestionCategory> = {
  ALPHAQUIZZ: 'everyday',
  ANIMAUX: 'science',
  ARCHEOLOGIE: 'history',
  ARTS: 'arts',
  BD: 'arts',
  CELEBRITES: 'arts',
  CINEMA: 'arts',
  CULTURE: 'everyday',
  DEFI: 'everyday',
  GASTRONOMIE: 'everyday',
  GEOGRAPHIE: 'geography',
  HISTOIRE: 'history',
  INFORMATIQUE: 'science',
  LITTERATURE: 'arts',
  LOISIRS: 'everyday',
  MONDE: 'geography',
  MUSIQUE: 'arts',
  NATURE: 'science',
  ORTHOQUIZZ: 'everyday',
  QUOTIDIEN: 'everyday',
  SCIENCES: 'science',
  SPORTS: 'sport',
  TELEVISION: 'arts',
  TOURISME: 'geography',
  WEB: 'science'
}

/**
 * Rubrics whose questions cannot be asked the way this game asks them. Absent
 * from the mapping above would have been enough to skip them, but a rubric that
 * simply went missing reads as an oversight — these are refusals, with reasons.
 */
const SKIPPED_RUBRICS: Record<string, string> = {
  MOTSCROISES: 'a crossword clue names the length and the first letter',
  QUADRIQUIZZ: 'asks for four answers and the pack carries one'
}

/**
 * Banked, but drawn only for a room whose host asked for it. Nothing here is
 * explicit — it is biography and innuendo, and what makes it adult is the
 * themes, which the reveal shows. `celebrities` is where those questions
 * actually belong as *subjects*, which is the whole reason the rating is a
 * field of its own rather than a seventh category.
 */
const ADULT_RUBRIC = 'ADULTES'

type UpstreamQuestion = {
  anecdote?: string
  id: number
  propositions: string[]
  question: string
  réponse: string
}

type UpstreamPack = {
  licence?: string
  quizz: UpstreamQuestion[]
  rédacteur?: string
  thème?: string
}

/** Everything upstream publishes is written in French rather than translated into it. */
const LANGUAGE: QuestionLanguage = 'fr'

type BankedQuestion = {
  accepted: string[]
  answer: string
  category: QuestionCategory
  decoys: [string, string, string]
  id: string
  /** Drawn only for a room whose host asked for it. */
  isAdult: boolean
  language: QuestionLanguage
  /** Their `anecdote`: what the host reads out once the answer is public. */
  note: string | null
  prompt: string
  /** Which pack it came from, so a question that turns out to be wrong is traceable. */
  theme: string
}

const cached = async (
  name: string,
  fetchIt: () => Promise<string>
): Promise<string> => {
  const path = join(CACHE_DIRECTORY, name)

  try {
    return await readFile(path, 'utf8')
  } catch {
    const body = await fetchIt()

    await writeFile(path, body, 'utf8')

    return body
  }
}

const packIdsByRubric = (listing: string): Map<string, number[]> => {
  const byRubric = new Map<string, number[]>()
  const tokens = listing.matchAll(/id="([A-ZÀ-Ý]+)"|goq\((\d+)\)/gu)

  let rubric: string | null = null

  for (const [, named, id] of tokens) {
    if (named !== undefined) {
      rubric = named
      continue
    }

    if (rubric === null || id === undefined) {
      continue
    }

    byRubric.set(rubric, [...(byRubric.get(rubric) ?? []), Number(id)])
  }

  return byRubric
}

const packUrl = async (packId: number): Promise<string | null> => {
  const page = await cached(`page-${packId}.html`, async () => {
    const response = await fetch(DOWNLOAD_URL, {
      body: new URLSearchParams({ id: String(packId) }),
      method: 'POST'
    })

    return response.text()
  })

  return (
    page.match(/https:\/\/download\.openquizzdb\.org\/[^"]+\.json/u)?.[0] ??
    null
  )
}

const fetchPack = async (packId: number): Promise<UpstreamPack | null> => {
  const url = await packUrl(packId)

  if (url === null) {
    return null
  }

  const body = await cached(`pack-${packId}.json`, async () => {
    const response = await fetch(url)

    return response.text()
  })

  try {
    return JSON.parse(body) as UpstreamPack
  } catch {
    return null
  }
}

const rejections: string[] = []

/**
 * Every pack sampled while writing this carried exactly four propositions with
 * the answer among them, which is what makes choice mode free. It is checked
 * rather than trusted: a pack that broke the shape would otherwise reach the
 * room as a question with two decoys, or with no right answer in the four.
 */
const toBankedQuestion = ({
  category,
  isAdult,
  packId,
  question,
  theme
}: {
  category: QuestionCategory
  isAdult: boolean
  packId: number
  question: UpstreamQuestion
  theme: string
}): BankedQuestion | null => {
  const decoys = question.propositions.filter(
    (proposition) => proposition !== question.réponse
  )

  if (question.propositions.length !== 4 || decoys.length !== 3) {
    rejections.push(
      `${packId}/${question.id}: ${question.propositions.length} propositions, ${decoys.length} of them wrong`
    )

    return null
  }

  const [first, second, third] = decoys

  if (first === undefined || second === undefined || third === undefined) {
    return null
  }

  return {
    accepted: [],
    answer: question.réponse,
    category,
    decoys: [first, second, third],
    id: `oqdb-${packId}-${question.id}`,
    isAdult,
    language: LANGUAGE,
    note: question.anecdote ?? null,
    prompt: question.question,
    theme
  }
}

const run = async (): Promise<void> => {
  await mkdir(CACHE_DIRECTORY, { recursive: true })
  await mkdir(dirname(BANK_PATH), { recursive: true })

  const listing = await cached('listing.html', async () => {
    const response = await fetch(LISTING_URL)

    return response.text()
  })

  const byRubric = packIdsByRubric(listing)
  const questions: BankedQuestion[] = []

  for (const [rubric, packIds] of [...byRubric].sort()) {
    const skipped = SKIPPED_RUBRICS[rubric]

    if (skipped !== undefined) {
      console.info(`  skip ${rubric} (${packIds.length} packs) — ${skipped}`)
      continue
    }

    const isAdult = rubric === ADULT_RUBRIC
    const category = isAdult ? 'arts' : CATEGORY_OF_RUBRIC[rubric]

    if (category === undefined) {
      console.info(`  skip ${rubric} (${packIds.length} packs) — unmapped`)
      continue
    }

    for (const packId of packIds) {
      const pack = await fetchPack(packId)

      if (pack === null) {
        rejections.push(`${packId}: no pack`)
        continue
      }

      for (const question of pack.quizz ?? []) {
        const banked = toBankedQuestion({
          category,
          isAdult,
          packId,
          question,
          theme: pack.thème ?? rubric
        })

        if (banked !== null) {
          questions.push(banked)
        }
      }
    }

    console.info(
      `  ${rubric} → ${category}${isAdult ? ' (adult)' : ''}: ${packIds.length} packs`
    )
  }

  const bank = {
    attribution: {
      author: 'Philippe Bresoux',
      licence: 'CC BY-SA 4.0',
      source: 'OpenQuizzDB',
      url: 'https://www.openquizzdb.org'
    },
    questions
  }

  await writeFile(BANK_PATH, `${JSON.stringify(bank, null, 2)}\n`, 'utf8')

  console.info(`\n${questions.length} questions → ${BANK_PATH}`)

  if (rejections.length > 0) {
    console.info(`\n${rejections.length} rejected:`)
    for (const rejection of rejections) {
      console.info(`  ${rejection}`)
    }
  }
}

await run()
