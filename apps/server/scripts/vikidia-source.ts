import type { QuestionCategory } from '@taverla/protocol/question'

import { frenchViewsOfTitles, isWellKnownInFrench } from './frwiki-notability'
import {
  type Attribution,
  type BankedQuestion,
  cached,
  chunked,
  decoysOf,
  type IngestedQuestions,
  readCachedEntries,
  writeCachedEntries
} from './question-source'

/**
 * Vikidia is the French encyclopedia written for eight-to-thirteens, and its
 * quiz namespace is the only open French-native source found with any science
 * in it — every other candidate with depth is an English corpus translated
 * after the fact. See `docs/plans/22-thin-french-subjects.md`.
 */
const API_URL = 'https://fr.vikidia.org/w/api.php'
const FRENCH_WIKIPEDIA_API = 'https://fr.wikipedia.org/w/api.php'

/** Wikimedia asks that an automated client say who it is and where to complain. */
const USER_AGENT =
  'TaverlaQuestionBank/1.0 (https://github.com/AdrienLcp/taverla)'

/** The namespace the wiki files its quizzes in, and the only one read here. */
const QUIZ_NAMESPACE = 104

/** Titles per action-API request, which is the anonymous limit on both wikis. */
const TITLES_PER_REQUEST = 50

/** Where a subject's French Wikipedia article is remembered, `null` meaning there is none. */
const ARTICLES_CACHE = 'vikidia-articles.json'

const ATTRIBUTION: Attribution = {
  author: 'Vikidia contributors',
  language: 'fr',
  licence: 'CC BY-SA 3.0',
  source: 'Vikidia',
  url: 'https://fr.vikidia.org/wiki/Vikidia:Quiz'
}

/**
 * What a quiz page is about, for the hundred and eighty that carry a `<quiz>`
 * block. Two things no rule in this file could work out on its own:
 *
 * - **the category**, because Vikidia has no rubrics to fold. Its own
 *   categories say `Quiz` on five hundred and sixty-one rows out of eight
 *   hundred and twenty-seven, so the page title is the whole of the signal and
 *   reading it is a person's job;
 * - **`article`**, the French Wikipedia page the questions are about, given
 *   only where the quiz's own title is not it. It is what the notability rule
 *   is measured on, and a title that resolves to the wrong article scores the
 *   wrong subject — *Hoopa* is a Pokémon, and the nearest page French Wikipedia
 *   offers is about a people of California.
 *
 * A page absent from this map is refused and named in the build's report, which
 * is how the ten pages about the wiki itself — *Bureaucrate*, *Patrouilleur*,
 * *Règles de Vikidia* — stay out of a bank about the world.
 */
type QuizSubject = {
  article?: string
  category: QuestionCategory
}

const QUIZ_SUBJECTS: Record<string, QuizSubject> = {
  'Quiz:5 mondes': { category: 'arts' },
  'Quiz:Abyssin': { category: 'science' },
  'Quiz:Accord du participe passé': { category: 'everyday' },
  'Quiz:Ace Attorney': { category: 'arts' },
  'Quiz:Addition': { category: 'science' },
  'Quiz:Aile de Pluie': { article: 'Les Royaumes de feu', category: 'arts' },
  'Quiz:Aldebert': { article: 'Aldebert (chanteur)', category: 'arts' },
  'Quiz:Algèbre': { category: 'science' },
  'Quiz:Amel Bent': { category: 'arts' },
  'Quiz:Anatomie': { category: 'science' },
  'Quiz:Anglais': { category: 'everyday' },
  'Quiz:Angle': { category: 'science' },
  'Quiz:Angleterre': { category: 'geography' },
  'Quiz:Animaux': { category: 'science' },
  'Quiz:Animaux (2)': { category: 'science' },
  'Quiz:Annie au milieu': { category: 'arts' },
  'Quiz:Antonio Vivaldi': { category: 'arts' },
  'Quiz:Astronautique': { category: 'science' },
  'Quiz:Astronomie': { category: 'science' },
  'Quiz:Astronomie (2)': { category: 'science' },
  'Quiz:Atome': { category: 'science' },
  'Quiz:Belgique': { category: 'geography' },
  'Quiz:Blaise Pascal': { category: 'science' },
  'Quiz:Blob': { article: 'Physarum polycephalum', category: 'science' },
  'Quiz:Blue (Les Royaumes de feu)': {
    article: 'Les Royaumes de feu',
    category: 'arts'
  },
  'Quiz:Boeing 737': { category: 'science' },
  'Quiz:Botanique': { category: 'science' },
  'Quiz:Bravelands': { category: 'arts' },
  'Quiz:Bus 24 de Strasbourg': { category: 'geography' },
  'Quiz:Canada': { category: 'geography' },
  'Quiz:Carré': { category: 'science' },
  'Quiz:Catherine II de Russie': { category: 'history' },
  'Quiz:Centre-Val de Loire': { category: 'geography' },
  'Quiz:Cercle': { category: 'science' },
  'Quiz:Chat': { category: 'science' },
  'Quiz:Chat (difficile)': { category: 'science' },
  'Quiz:Cheval et équitation': { article: 'Équitation', category: 'sport' },
  'Quiz:Cheval et équitation (difficile)': {
    article: 'Équitation',
    category: 'sport'
  },
  'Quiz:Chien': { category: 'science' },
  'Quiz:Château de Versailles': { category: 'history' },
  'Quiz:Colomiers': { category: 'geography' },
  'Quiz:Conjugaison': { category: 'everyday' },
  'Quiz:Corse': { category: 'geography' },
  'Quiz:Coupe du monde de rugby': {
    article: 'Coupe du monde de rugby à XV',
    category: 'sport'
  },
  'Quiz:Céline Dion': { category: 'arts' },
  'Quiz:Dinosaures': { category: 'science' },
  'Quiz:Diode électroluminescente': { category: 'science' },
  'Quiz:Droite': { article: 'Droite (mathématiques)', category: 'science' },
  'Quiz:Détective Conan': { category: 'arts' },
  'Quiz:Ellana': { article: 'Le Pacte des Marchombres', category: 'arts' },
  'Quiz:Empire byzantin': { category: 'history' },
  'Quiz:Europa-Park': { category: 'everyday' },
  'Quiz:European shorthair': { category: 'science' },
  'Quiz:Fairy Tail': { category: 'arts' },
  'Quiz:Figures de la Révolution': {
    article: 'Révolution française',
    category: 'history'
  },
  'Quiz:Films Disney': { article: 'Walt Disney Pictures', category: 'arts' },
  'Quiz:Football': { category: 'sport' },
  'Quiz:Fractions': {
    article: 'Fraction (mathématiques)',
    category: 'science'
  },
  'Quiz:François Ier de France': { category: 'history' },
  'Quiz:Gardiens des cités perdues': { category: 'arts' },
  'Quiz:Girondins de Bordeaux': { category: 'sport' },
  'Quiz:Gloria (Les Royaumes de feu)': {
    article: 'Les Royaumes de feu',
    category: 'arts'
  },
  "Quiz:Groupe d'intervention de la Gendarmerie nationale": {
    category: 'everyday'
  },
  'Quiz:Guerre de Troie': { category: 'arts' },
  'Quiz:Gymnastique': { category: 'sport' },
  'Quiz:Géographie de la France': { category: 'geography' },
  'Quiz:Halloween': { category: 'everyday' },
  'Quiz:Hamlet': { category: 'arts' },
  'Quiz:Harry Potter 2': { category: 'arts' },
  'Quiz:Harry potter': { article: 'Harry Potter', category: 'arts' },
  'Quiz:Histoire de Les Royaumes de feu': {
    article: 'Les Royaumes de feu',
    category: 'arts'
  },
  'Quiz:Hommes préhistoriques': { category: 'history' },
  'Quiz:Hoopa': { article: 'Pokémon', category: 'arts' },
  'Quiz:Hunger Games': { category: 'arts' },
  "Quiz:Héros de l'Olympe": { category: 'arts' },
  'Quiz:Identité remarquable': { category: 'science' },
  'Quiz:Imagine Dragons': { category: 'arts' },
  'Quiz:Jeu vidéo': { category: 'everyday' },
  'Quiz:Juline Dizznee': {
    article: 'Gardiens des cités perdues',
    category: 'arts'
  },
  'Quiz:Kangourou roux': { category: 'science' },
  'Quiz:Koh Lanta': { article: 'Koh-Lanta', category: 'arts' },
  "Quiz:L'Affaire Petit Prince": { category: 'arts' },
  'Quiz:La Grande Sophie': { category: 'arts' },
  'Quiz:La Guerre des Clans': { category: 'arts' },
  'Quiz:La Guerre des Clans (facile)': {
    article: 'La Guerre des clans',
    category: 'arts'
  },
  'Quiz:La Guerre des Clans (moyen)': {
    article: 'La Guerre des clans',
    category: 'arts'
  },
  "Quiz:La Pat' Patrouille": { category: 'arts' },
  "Quiz:La Révolution et l'Empire à travers les arts": {
    article: 'Révolution française',
    category: 'history'
  },
  'Quiz:Langue néerlandaise': { article: 'Néerlandais', category: 'everyday' },
  'Quiz:Les Aventures de Tintin': { category: 'arts' },
  'Quiz:Les Chroniques de Kane': { category: 'arts' },
  'Quiz:Les dates': { article: 'Chronologie', category: 'history' },
  'Quiz:Les filles au chocolat': {
    article: 'Les Filles au chocolat',
    category: 'arts'
  },
  'Quiz:Les Royaumes de Feu': { category: 'arts' },
  'Quiz:Licorne': { category: 'arts' },
  'Quiz:Lille': { category: 'geography' },
  'Quiz:Lion': { category: 'science' },
  'Quiz:Louis Pasteur': { category: 'science' },
  'Quiz:Louis XIV de France': { category: 'history' },
  'Quiz:Loutre': { category: 'science' },
  'Quiz:Loutre cendrée': { category: 'science' },
  'Quiz:Lune Claire': { article: 'La Guerre des clans', category: 'arts' },
  'Quiz:Lynx': { category: 'science' },
  'Quiz:Lyon': { category: 'geography' },
  'Quiz:Mario': { article: 'Mario (personnage)', category: 'arts' },
  'Quiz:Mars (planète)': { category: 'science' },
  'Quiz:Marvel': { article: 'Marvel Comics', category: 'arts' },
  'Quiz:Minecraft': { category: 'arts' },
  'Quiz:Miraculous': {
    article: 'Miraculous, les aventures de Ladybug et Chat Noir',
    category: 'arts'
  },
  'Quiz:Mode': { article: 'Mode (habillement)', category: 'everyday' },
  'Quiz:Mortelle Adèle': { category: 'arts' },
  'Quiz:Multiplication': { category: 'science' },
  'Quiz:Mythologie gréco-romaine': { category: 'arts' },
  'Quiz:Métaux': { category: 'science' },
  'Quiz:Napoléon': { category: 'history' },
  'Quiz:Navette spatiale Bourane': {
    article: 'Programme Bourane',
    category: 'science'
  },
  'Quiz:Nicolas Boileau': { category: 'arts' },
  'Quiz:Nintendo 64': { category: 'arts' },
  'Quiz:Nombre': { category: 'science' },
  'Quiz:Nombre négatif': { category: 'science' },
  'Quiz:Orthographe': { category: 'everyday' },
  'Quiz:Panda géant': { category: 'science' },
  'Quiz:Paris': { category: 'geography' },
  'Quiz:Pays de la Loire': { category: 'geography' },
  "Quiz:Peloton de surveillance et d'intervention de la Gendarmerie": {
    category: 'everyday'
  },
  'Quiz:Percussions': { category: 'arts' },
  'Quiz:Percy Jackson': { category: 'arts' },
  'Quiz:Pierre Bottero': { category: 'arts' },
  'Quiz:Pirates des Caraïbes': { category: 'arts' },
  'Quiz:Pokemon': { article: 'Pokémon', category: 'arts' },
  'Quiz:Pokemon partie (2)': { article: 'Pokémon', category: 'arts' },
  'Quiz:Politique en France': { category: 'everyday' },
  'Quiz:Protection du littoral': { article: 'Littoral', category: 'geography' },
  'Quiz:PSP': { article: 'PlayStation Portable', category: 'arts' },
  'Quiz:Python/Difficile': { article: 'Python (langage)', category: 'science' },
  'Quiz:Python/Facile': { article: 'Python (langage)', category: 'science' },
  'Quiz:Pétrole': { category: 'science' },
  'Quiz:Québec': { category: 'geography' },
  'Quiz:Rainbow Friends': { category: 'arts' },
  'Quiz:RC Lens': { category: 'sport' },
  'Quiz:Rectangle': { category: 'science' },
  'Quiz:Rocket league': { article: 'Rocket League', category: 'arts' },
  'Quiz:Rouletabille': { category: 'arts' },
  "Quiz:Rubik's Cube": { category: 'everyday' },
  'Quiz:Russie': { category: 'geography' },
  "Quiz:Résidence de chef d'État": {
    article: 'Résidence officielle',
    category: 'geography'
  },
  'Quiz:Saint-Zacharie (Var)': { category: 'geography' },
  'Quiz:Seconde Guerre Mondiale': { category: 'history' },
  'Quiz:Serdaigle': { article: 'Poudlard', category: 'arts' },
  'Quiz:Singapura': { category: 'science' },
  'Quiz:Soleil': { category: 'science' },
  'Quiz:Sonic': { article: 'Sonic the Hedgehog', category: 'arts' },
  'Quiz:Sonic The Hedgehog': {
    article: 'Sonic the Hedgehog',
    category: 'arts'
  },
  'Quiz:Soustraction': { category: 'science' },
  'Quiz:Spy x Family': { article: 'Spy × Family', category: 'arts' },
  'Quiz:Star Wars': { category: 'arts' },
  'Quiz:Stray Kids': { category: 'arts' },
  'Quiz:Séries': { article: 'Série télévisée', category: 'arts' },
  'Quiz:The Mandalorian': { category: 'arts' },
  'Quiz:Triangle': { category: 'science' },
  "Quiz:Trompe-l'œil": { category: 'arts' },
  'Quiz:Union Européenne': {
    article: 'Union européenne',
    category: 'geography'
  },
  'Quiz:URSS': { category: 'history' },
  'Quiz:Vienne (Isère)': { category: 'geography' },
  'Quiz:Vitry-sur-Seine': { category: 'geography' },
  'Quiz:Volcan': { category: 'science' },
  'Quiz:Windows 10': { category: 'science' },
  'Quiz:Zelda': { article: 'The Legend of Zelda', category: 'arts' },
  'Quiz:Écologie': { category: 'science' },
  'Quiz:États-Unis': { category: 'geography' }
}

type WikiPage = {
  missing?: boolean
  revisions?: Array<{ slots: { main: { '*': string } } }>
  title: string
}

type WikiResponse = {
  continue?: Record<string, string>
  query?: {
    allpages?: Array<{ title: string }>
    normalized?: Array<{ from: string; to: string }>
    pages?: Record<string, WikiPage> | WikiPage[]
    redirects?: Array<{ from: string; to: string }>
  }
}

const ask = async (
  api: string,
  parameters: Record<string, string>
): Promise<WikiResponse> => {
  const response = await fetch(
    `${api}?${new URLSearchParams({ action: 'query', format: 'json', ...parameters })}`,
    { headers: { 'user-agent': USER_AGENT } }
  )

  if (!response.ok) {
    throw new Error(`${api} answered ${response.status}`)
  }

  return response.json() as Promise<WikiResponse>
}

const pagesIn = (response: WikiResponse): WikiPage[] =>
  Object.values(response.query?.pages ?? {})

/**
 * Every quiz page and its wikitext, as one cached download. The listing is a
 * single request and the content six more, which is the whole of what this
 * source costs: 265 pages fit under the anonymous ceiling with no continuation
 * to follow, so a rebuild after a parser change asks Vikidia for nothing.
 */
const quizPages = async (): Promise<Record<string, string>> =>
  JSON.parse(
    await cached('vikidia-quizzes.json', async () => {
      const listing = await ask(API_URL, {
        aplimit: '500',
        apnamespace: String(QUIZ_NAMESPACE),
        list: 'allpages'
      })

      const titles = (listing.query?.allpages ?? []).map(({ title }) => title)
      const wikitexts: Record<string, string> = {}

      for (const batch of chunked({
        items: titles,
        size: TITLES_PER_REQUEST
      })) {
        const page = await ask(API_URL, {
          prop: 'revisions',
          rvprop: 'content',
          rvslots: 'main',
          titles: batch.join('|')
        })

        for (const { revisions, title } of pagesIn(page)) {
          const wikitext = revisions?.[0]?.slots.main['*']

          if (wikitext !== undefined) {
            wikitexts[title] = wikitext
          }
        }
      }

      console.info(`  ${Object.keys(wikitexts).length} quiz pages`)

      return JSON.stringify(wikitexts)
    })
  ) as Record<string, string>

/**
 * The French Wikipedia article each subject actually lives at, redirects
 * followed, `null` where there is none. Vikidia and Wikipedia name the same
 * thing differently often enough that skipping this hop reads the traffic of
 * the wrong page: *Animaux* redirects to *Animal* and scores three hundred
 * readers on its own, which would rate the source's single largest block —
 * fifty-one questions about elephants and whales — as one nobody has heard of.
 *
 * The hop is made here rather than in `frenchViewsOfTitles` because following
 * redirects there would move the rating of every row the other three sources
 * already banked, and what the existing bank is rated on is not this stage's to
 * change.
 *
 * Cached one subject at a time rather than in a batch, so a title added to
 * `QUIZ_SUBJECTS` resolves on the next run instead of being answered from a
 * file that was written before it existed.
 */
const frenchArticles = async (
  subjects: readonly string[]
): Promise<Map<string, string | null>> => {
  const articles = await readCachedEntries<string | null>(ARTICLES_CACHE)
  const unresolved = subjects.filter((subject) => !(subject in articles))

  console.info(`  ${unresolved.length} subjects left to resolve`)

  for (const batch of chunked({
    items: unresolved,
    size: TITLES_PER_REQUEST
  })) {
    const page = await ask(FRENCH_WIKIPEDIA_API, {
      formatversion: '2',
      redirects: '1',
      titles: batch.join('|')
    })

    const normalized = new Map(
      (page.query?.normalized ?? []).map(({ from, to }) => [from, to])
    )
    const redirected = new Map(
      (page.query?.redirects ?? []).map(({ from, to }) => [from, to])
    )
    const missing = new Set(
      pagesIn(page)
        .filter(({ missing: isMissing }) => isMissing === true)
        .map(({ title }) => title)
    )

    for (const subject of batch) {
      const known = normalized.get(subject) ?? subject
      const article = redirected.get(known) ?? known

      articles[subject] = missing.has(article) ? null : article
    }

    await writeCachedEntries({ entries: articles, name: ARTICLES_CACHE })
  }

  return new Map(
    subjects.map((subject) => [subject, articles[subject] ?? null])
  )
}

/**
 * Templates unwrapped to what they print, because the text they carry is the
 * answer. Deleting `{{unité|-63|°C}}` leaves *la température moyenne sur Mars
 * est à peu près de…* with no temperature and three empty candidates, and that
 * row reaches a room as a question with nothing in it.
 *
 * Anything still holding a template after this is refused rather than stripped:
 * a sentence with a hole in it is worse than a row the bank does not have.
 */
const PRINTED_TEMPLATES: ReadonlyArray<[RegExp, string]> = [
  [/\{\{\s*unité\s*\|([^|}]*)\|([^|}]*)\}\}/giu, '$1 $2'],
  [/\{\{\s*unité\s*\|([^|}]*)\}\}/giu, '$1'],
  [/\{\{\s*formatnum:([^}]*)\}\}/giu, '$1'],
  [/\{\{\s*(?:citation|")\s*\|([^}]*)\}\}/giu, '« $1 »'],
  [/\{\{\s*avjc\s*\}\}/giu, 'av. J.-C.'],
  [/\{\{\s*souverain2?-\s*\|([^}]*)\}\}/giu, '$1'],
  [/\{\{\s*(1er|1re|er|re|e)\s*\}\}/giu, '$1'],
  [/\{\{\s*lien (?:interne|externe)\s*\|([^|}]*)[^}]*\}\}/giu, '$1'],
  [/\{\{\s*---\s*\}\}/giu, ' — '],
  [/\{\{\s*localyear\s*\}\}/giu, '2026']
]

const printed = (raw: string): string =>
  PRINTED_TEMPLATES.reduce(
    (text, [pattern, replacement]) => text.replace(pattern, replacement),
    raw
  )

const clean = (raw: string): string =>
  printed(raw)
    .replace(/<!--[\s\S]*?-->/gu, '')
    .replace(/<ref[^>]*\/>/giu, '')
    .replace(/<ref[^>]*>[\s\S]*?<\/ref>/giu, '')
    .replace(/<br\s*\/?>/giu, ' ')
    .replace(/<\/?(?:nowiki|code|span|small|big|u|i|b)\b[^>]*>/giu, '')
    .replace(/\[\[\s*(?:Fichier|Image|File)\s*:[^\]]*\]\]/giu, '')
    .replace(/\[\[([^\]]*)\]\]/gu, (_link, target: string) =>
      target.slice(target.lastIndexOf('|') + 1)
    )
    .replace(/\[(?:https?:)?\/\/\S+\s+([^\]]*)\]/gu, '$1')
    .replace(/'''''|'''|''/gu, '')
    .replace(/\s+/gu, ' ')
    .trim()

/**
 * Markup a screen showing plain text cannot honour, each of which changes the
 * answer rather than merely looking wrong. `<math>` is the whole of an algebra
 * identity, a `<gallery>` is the pictures the question is about, and `<sup>`
 * flattened turns ten cubed into a hundred and three. A template or a link that
 * survived `clean` is upstream markup this parser has not met, which is the
 * same problem one page later.
 */
const UNREADABLE =
  /<(?:math|gallery|syntaxhighlight|source|pre|sup|sub|table)\b|\{\{|\}\}|\[\[|\]\]/iu

type ParsedRow = {
  options: Array<{ isAnswer: boolean; text: string }>
  prompt: string
}

/**
 * A `+` or `-` opening a line is a candidate. Wikitext's horizontal rule opens
 * the same way, so a line of dashes is not one.
 */
const CANDIDATE_LINE = /^\s*([+-])\s*(?!-)(\S.*)$/u

const rowsIn = (block: string): ParsedRow[] =>
  block
    .split(/^\s*\{/mu)
    .slice(1)
    .map((chunk) => {
      const stem: string[] = []
      const options: ParsedRow['options'] = []

      for (const line of chunk.split('\n')) {
        const [, sign, text] = CANDIDATE_LINE.exec(line) ?? []

        if (sign !== undefined && text !== undefined) {
          options.push({ isAnswer: sign === '+', text: clean(text) })
          continue
        }

        if (options.length === 0) {
          stem.push(line)
        }
      }

      return {
        options,
        prompt: clean(
          stem
            .join(' ')
            .replace(/\|\s*types?\s*=[\s\S]*$/u, '')
            .replace(/^\s*\{+/u, '')
            .replace(/\}\s*$/u, '')
        )
      }
    })

/**
 * Which of the many ways a row can be no question this one is, or `null` where
 * it is one. Only the last is a judgement; the rest are the shape the bank
 * needs and the source not holding it.
 */
const refusalOf = (row: ParsedRow): string | null => {
  const right = row.options.filter(({ isAnswer }) => isAnswer)

  if (right.length === 0) {
    return row.options.length === 0
      ? 'no candidates — a fill-in-the-blank or a heading'
      : 'no candidate marked right'
  }

  if (right.length > 1) {
    return `${right.length} right answers — a checkbox row`
  }

  if (row.options.length < 4) {
    return `${row.options.length} candidates, and the bank asks for four`
  }

  if (row.prompt.length === 0) {
    return 'no question above the candidates'
  }

  if (
    UNREADABLE.test(row.prompt) ||
    row.options.some(({ text }) => UNREADABLE.test(text))
  ) {
    return 'markup a plain-text screen cannot show'
  }

  const spellings = new Set(row.options.map(({ text }) => text.toLowerCase()))

  return spellings.size === row.options.length
    ? null
    : 'two candidates spelled the same'
}

/** The wiki title as a readable id fragment, so a repair can be traced to its page. */
const slugOf = (title: string): string =>
  title
    .replace(/^Quiz:/u, '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/gu, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/gu, '-')
    .replace(/^-|-$/gu, '')

/**
 * The subject a page's title names, with the suffixes that say how hard the
 * quiz is rather than what it is about taken off — *Chat (difficile)* and
 * *Python/Facile* are two quizzes about one thing.
 */
const subjectOf = (title: string): string =>
  title
    .replace(/^Quiz:/u, '')
    .replace(/\/(?:Facile|Difficile)$/iu, '')
    .replace(/\s*\((?:2|3|difficile|facile|moyen)\)$/iu, '')
    .trim()

/**
 * A row with everything but the one field that costs a network round trip, the
 * way OpenQuizzDB's ingestion holds one: every page is walked before a single
 * article is looked up. It holds the subject the page *asks* about rather than
 * the article that answers to it, because resolving eight hundred rows costs
 * four requests over the hundred and seventy subjects behind them.
 */
type Unrated = Omit<BankedQuestion, 'isWellKnown'> & { subject: string }

export const ingestVikidia = async (): Promise<IngestedQuestions> => {
  const pages = await quizPages()
  const unrated: Unrated[] = []
  const rejections: string[] = []
  const unmapped: string[] = []

  for (const [title, wikitext] of Object.entries(pages).sort()) {
    const blocks = [...wikitext.matchAll(/<quiz>([\s\S]*?)(?:<\/quiz>|$)/giu)]

    if (blocks.length === 0) {
      continue
    }

    const page = QUIZ_SUBJECTS[title]

    if (page === undefined) {
      unmapped.push(title)
      continue
    }

    const slug = slugOf(title)

    for (const [index, row] of blocks
      .flatMap(([, block]) => rowsIn(block ?? ''))
      .entries()) {
      const refusal = refusalOf(row)

      if (refusal !== null) {
        rejections.push(`${title} #${index + 1}: ${refusal}`)
        continue
      }

      const answer = row.options.find(({ isAnswer }) => isAnswer)?.text ?? ''
      const decoys = decoysOf({
        answer,
        candidates: row.options
          .filter(({ isAnswer }) => !isAnswer)
          .slice(0, 3)
          .map(({ text }) => text)
      })

      if (decoys === null) {
        rejections.push(
          `${title} #${index + 1}: the answer is among its decoys`
        )
        continue
      }

      unrated.push({
        accepted: [],
        answer,
        category: page.category,
        choiceOnly: false,
        decoys,
        id: `vikidia-${slug}-${index + 1}`,
        isAdult: false,
        language: 'fr',
        note: null,
        prompt: row.prompt,
        subject: page.article ?? subjectOf(title),
        theme: subjectOf(title)
      })
    }
  }

  for (const title of unmapped) {
    rejections.push(`${title}: no subject mapped for the page`)
  }

  const subjects = [
    ...new Set(
      Object.entries(QUIZ_SUBJECTS).map(
        ([title, { article }]) => article ?? subjectOf(title)
      )
    )
  ]
  const articles = await frenchArticles(subjects)

  const views = await frenchViewsOfTitles({
    label: 'Vikidia subjects',
    titles: [...articles.values()].filter(
      (article): article is string => article !== null
    )
  })

  const questions = unrated.map(({ subject, ...banked }) => {
    const article = articles.get(subject) ?? null

    return {
      ...banked,
      isWellKnown:
        article !== null && isWellKnownInFrench(views.get(article) ?? 0)
    }
  })

  console.info(
    `  ${questions.filter(({ isWellKnown }) => isWellKnown).length} of ${questions.length} are about a subject the room has heard of`
  )

  return { attribution: ATTRIBUTION, questions, rejections }
}
