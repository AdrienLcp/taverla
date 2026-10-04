import { expect, type Page, test } from '@playwright/test'

/**
 * Not a journey: the one screen that may never scroll, measured. A question and
 * its four choices are all visible at once on every viewport, at every ratio,
 * for the worst content the bank holds — and a geometry claim only a browser
 * can check.
 *
 * The room is a stub. The socket is answered in the page with a snapshot built
 * here, so the question on screen is the one under test rather than whichever
 * the server deals, and nothing waits on a countdown.
 */

const VIEWPORTS = [
  [320, 568],
  [360, 640],
  [390, 844],
  [430, 932],
  [568, 320],
  [667, 375],
  [812, 375],
  [768, 1024],
  [1024, 768],
  [900, 900],
  [1280, 720],
  [1440, 900],
  [1920, 1080],
  [2560, 1080],
  [3440, 1440],
  [1080, 1920]
] as const

type Question = {
  category: string
  choices: [string, string, string, string]
  id: string
  prompt: string
}

/**
 * The bank rows the redesign was measured against, verbatim. The bank's one
 * 275-character choice is not here: it was repaired to 123 in
 * `question-repairs.json`, because no screen could hold it at the floor.
 */
const WORST_CASES: Question[] = [
  {
    // The longest French prompt: 192 characters.
    category: 'geography',
    choices: ['France', 'Portugal', 'République populaire de Chine', 'Brésil'],
    id: 'mintaka-8db29866',
    prompt:
      'Quel pays nous a donné la Statue de la Liberté en mille huit cent soixante-seize, pour marquer le centenaire de la Déclaration d’indépendance des États-Unis de mille sept cent soixante-seize ?'
  },
  {
    // Four long choices at once, up to 160 characters each.
    category: 'arts',
    choices: [
      'Ils ont prononcé leurs vœux et sont devenus partenaires de vie.',
      "Ils se sont dit qu'il vaudrait mieux qu'ils arrêtent de se voir pendant un moment car Céleste doit aider le Grand Esprit.",
      'Ils se sont disputés.',
      "Rocher lui a dit que, avant il était amoureux d'une autre éléphante et que Céleste lui ressemblait, c'est pour ça qu'elle l'attirait, alors elle s'est fâchée."
    ],
    id: 'vikidia-bravelands-13',
    prompt:
      "Qu'ont fait Rocher et Céleste à la mare sacré où l'a emmené Rocher ?"
  },
  {
    // The most choice text in one row: 382 characters over four tiles.
    category: 'everyday',
    choices: [
      'Les verbes du 2e groupes sont ceux qui se terminent par -ir et qui font -issons au présent, par exemple nous finissons.',
      'Les verbes du 2e groupes sont ceux qui se terminent par -issons',
      'Les verbes du 2e groupes sont ceux qui se terminent par -ir et qui font -irons au présent, par exemple nous irons.',
      'Les verbes du 2e groupes sont ceux qui se terminent par -re, par exemple nous prenons.'
    ],
    id: 'vikidia-conjugaison-4',
    prompt: 'Quels sont les verbes du 2e groupe?'
  },
  {
    // A long question over long choices, which no other row beats on both.
    category: 'arts',
    choices: [
      "Il doit porter une vieille dame jusqu'au Camp Jupiter ; la vieille dame est Junon",
      'Il doit aider un vieux monsieur à traverser la route ; le monsieur est Neptune',
      'Il doit aller dans le tunnel et ouvrir un portail car une jeune fille le lui a demandé ; cette jeune fille est Diane',
      'Il doit protéger un homme qui est saoul ; cet homme est Bacchus'
    ],
    id: 'vikidia-heros-de-l-olympe-1',
    prompt:
      "Quand Percy arrive à l'entrée du Camp Jupiter, une personne lui demande quelque chose. Que doit il faire et qui est cette personne ?"
  }
]

const ROOM_CODE = 'KWRH'

/**
 * The stub's whole notion of time: the client only ever draws the server's
 * deadline, and a frozen one keeps the round's clock where it was dealt.
 */
const SERVER_TIME = 1_800_000_000_000

const players = [
  { id: 'p1', isConnected: true, nickname: 'Wolfgangamadeusmozar', score: 11 },
  { id: 'p2', isConnected: true, nickname: 'Mamie Jo', score: 14 },
  { id: 'p3', isConnected: true, nickname: 'Théo', score: 8 }
]

const choosingView = (question: Question) => ({
  code: ROOM_CODE,
  isHostConnected: true,
  phase: 'playing',
  players,
  round: {
    activeBuzz: null,
    advancesAt: null,
    answers: [],
    awards: [],
    content: {
      choices: question.choices,
      kind: 'quiz',
      prompt: {
        category: question.category,
        id: question.id,
        prompt: question.prompt
      },
      revealedQuestion: null
    },
    id: 'r4',
    index: 4,
    joinedAfterStart: false,
    lockedOutPlayerIds: [],
    revealedAnswers: [],
    startsAt: SERVER_TIME - 2_000
  },
  roundElapsedMs: 2_000,
  settings: {
    autoAdvanceMs: null,
    countdownMs: 3_000,
    game: {
      allowsAdultContent: false,
      categories: [],
      kind: 'quiz',
      language: 'fr',
      roundDurationMs: 30_000,
      wellKnownOnly: false
    },
    mode: { kind: 'choice' },
    roundCount: 10
  },
  youId: 'p1',
  yourVerdict: null
})

/**
 * The same round on a console whose host took the first seat. It is withheld
 * the answer the way a player is, and a wall is the speaker, so nothing but the
 * four tiles asks for the screen.
 */
const seatedHostView = (question: Question) => ({
  ...choosingView(question),
  currentContent: { kind: 'quiz', question: null },
  isWallConnected: true,
  remainingPoolSize: 40
})

const table = [
  'Wolfgangamadeusmozar',
  'Mamie Jo',
  'Théo',
  'Zoé',
  'Bertrand',
  'Inès',
  'Anne-Charlotte',
  'Marc'
].map((nickname, seat) => ({
  id: `p${seat + 1}`,
  isConnected: true,
  nickname,
  score: seat * 3
}))

/**
 * The same round on a console nobody sat down at, which is the screen the room
 * reads: the four tiles printed, a full table of pawns, three of them in. It
 * has a header and a footer the other two do not, and the same rule.
 */
const consoleView = (question: Question) => {
  const view = seatedHostView(question)

  return {
    ...view,
    players: table,
    round: {
      ...view.round,
      answers: ['p2', 'p3', 'p6'].map((playerId) => ({
        atServerTime: SERVER_TIME - 1_000,
        playerId
      }))
    },
    youId: null
  }
}

type Seat = {
  /** The route the screen is opened on. */
  path: string
  role: 'host' | 'player' | 'room'
  view: (question: Question) => object
}

const SEATS: Seat[] = [
  { path: `/play/${ROOM_CODE}`, role: 'player', view: choosingView },
  { path: `/host/${ROOM_CODE}`, role: 'host', view: seatedHostView },
  { path: `/host/${ROOM_CODE}`, role: 'room', view: consoleView }
]

/**
 * Answers the screen's socket the way the room would: a welcome carrying the
 * snapshot to the hello, a pong to every ping. The protocol version is echoed
 * from the hello, so a bump never strands this check on a stale number.
 */
const serveRoom = async ({ page, view }: { page: Page; view: object }) => {
  await page.routeWebSocket(/\/ws\/rooms\//, (socket) => {
    socket.onMessage((raw) => {
      const message = JSON.parse(String(raw))

      if (message.type === 'hello') {
        socket.send(
          JSON.stringify({
            protocolVersion: message.protocolVersion,
            serverTime: SERVER_TIME,
            sessionId: message.sessionId,
            type: 'welcome',
            view
          })
        )
      }

      if (message.type === 'time.ping') {
        socket.send(
          JSON.stringify({
            clientSentAt: message.clientSentAt,
            serverTime: SERVER_TIME,
            type: 'time.pong'
          })
        )
      }
    })
  })
}

/** The legibility floor: no word of the question or a choice is drawn smaller. */
const FLOOR_PX = 14

type Overflow = {
  /** The smallest type any word of the question or the choices is set in. */
  floor: number
  /** What reaches furthest past the viewport, when anything does. */
  furthest: string | null
  page: number
  /** Every tile or card whose words run past its own box. */
  spills: string[]
  /** Every tile or card whose box runs past the viewport. */
  strays: string[]
}

const measure = (): Overflow => {
  const root = document.scrollingElement ?? document.documentElement
  const pieces = [
    ...document.querySelectorAll<HTMLElement>(
      '.answer-tile, .asked-question, .round-card'
    )
  ]

  // A folded panel keeps its contents laid out under `content-visibility:
  // hidden`, which still reports a box; nobody can see it, so it reaches
  // nowhere.
  const furthest = [...document.body.querySelectorAll<HTMLElement>('*')]
    .filter((element) => element.checkVisibility())
    .map((element) => ({
      bottom: element.getBoundingClientRect().bottom,
      element
    }))
    .filter(({ bottom }) => bottom > innerHeight + 0.5)
    .toSorted((a, b) => b.bottom - a.bottom)[0]

  const words = [
    ...document.querySelectorAll<HTMLElement>(
      '.answer-tile .title, .answer-tile .subtitle, .asked-question .prompt'
    )
  ]

  return {
    floor: Math.min(
      ...words.map((word) => Number.parseFloat(getComputedStyle(word).fontSize))
    ),
    furthest:
      furthest === undefined
        ? null
        : `${furthest.element.tagName.toLowerCase()}.${furthest.element.className} @${Math.round(furthest.bottom)}`,
    page: Math.max(
      root.scrollHeight - innerHeight,
      root.scrollWidth - innerWidth,
      0
    ),
    spills: pieces
      .filter(
        (piece) =>
          piece.scrollHeight > piece.clientHeight + 1 ||
          piece.scrollWidth > piece.clientWidth + 1
      )
      .map((piece) => piece.textContent?.slice(0, 24) ?? ''),
    strays: pieces
      .filter((piece) => {
        const box = piece.getBoundingClientRect()

        return (
          box.top < 0 ||
          box.left < 0 ||
          box.bottom > innerHeight + 0.5 ||
          box.right > innerWidth + 0.5
        )
      })
      .map((piece) => piece.textContent?.slice(0, 24) ?? '')
  }
}

test.beforeEach(async ({ context }) => {
  await context.addInitScript(() => {
    localStorage.setItem('taverla:volume', '0')
    localStorage.setItem('taverla:nickname', 'Wolfgangamadeusmozar')
  })
})

for (const seat of SEATS) {
  for (const question of WORST_CASES) {
    test(`[layout] ${seat.role}, ${question.id}: the question and its four choices never scroll`, async ({
      page
    }) => {
      await serveRoom({ page, view: seat.view(question) })
      await page.setViewportSize({ height: 844, width: 390 })
      await page.goto(seat.path)
      await expect(page.locator('.answer-tile')).toHaveCount(4)
      await page.evaluate(() => document.fonts.ready.then(() => {}))

      const faults: string[] = []

      for (const [width, height] of VIEWPORTS) {
        await page.setViewportSize({ height, width })
        await page.evaluate(() => document.fonts.ready.then(() => {}))

        const overflow = await page.evaluate(measure)

        if (
          overflow.floor < FLOOR_PX ||
          overflow.furthest !== null ||
          overflow.page > 0 ||
          overflow.spills.length > 0 ||
          overflow.strays.length > 0
        ) {
          faults.push(`${width}×${height} ${JSON.stringify(overflow)}`)
        }
      }

      expect(faults).toEqual([])
    })
  }
}
