import { z } from 'zod'

import {
  type HostQuestion,
  hostQuestionSchema,
  type QuestionDrawSettings,
  questionLanguageSchema
} from '@taverla/protocol/question'

import { pickRandom } from '@taverla/core/helpers/random'

import bank from './question-bank.json' with { type: 'json' }

/**
 * The one module that knows where the questions came from. Everything above it
 * speaks `HostQuestion`, so moving to another bank — a second language, a
 * curated file, an API somebody finally publishes — is a rewrite of this file
 * and of nothing else.
 *
 * The bank is a bundled asset rather than a network call, and that is a
 * property worth keeping: a quiz whose data weighs less than a photograph has
 * no business going down because somebody else's web server did, in the middle
 * of a party.
 */
const bankedQuestionSchema = hostQuestionSchema.extend({
  /**
   * Whether the prompt is only a question with its own three decoys under it.
   * *Which country drives on the left side of the road?* answers Japan, and so
   * does India: the sentence names no set, so only the four on screen do. Drawn
   * for a room that will show them and nowhere else — see `drawQuestion`.
   */
  choiceOnly: z.boolean(),
  /** Drawn only for a room whose host asked for it — see `allowsAdultContent`. */
  isAdult: z.boolean(),
  /**
   * Whether the room can be expected to have heard of what this asks about.
   * The two halves reach it their own way — Open Trivia DB rates its own rows,
   * and a French row is read off the traffic its subject's Wikipedia article
   * takes — and the field says only what the room is promised.
   */
  isWellKnown: z.boolean(),
  language: questionLanguageSchema,
  /** The upstream pack, so a question that turns out to be wrong is traceable. */
  theme: z.string()
})

/**
 * Parsed once, on the first draw rather than at boot. Every cold start of a
 * Durable Object evaluates this module, and most rooms are not a quiz: parsing
 * 5.6 MB of rows there held each first request for seconds. A bank that no
 * longer matches the schema is still caught before a deploy, by the corpus
 * sweep in `question-bank.test.ts`, which reads the rows through this same
 * parse.
 *
 * The parse rather than the JSON's own type: the type TypeScript infers from
 * the literal degraded the day the English half started carrying `accepted`
 * spellings, and a `decoys` silently widening to `any` takes the sweep's
 * guarantees with it.
 */
let parsedBank: BankedQuestion[] | undefined

export const bankedQuestions = (): BankedQuestion[] => {
  parsedBank ??= z.array(bankedQuestionSchema).parse(bank.questions)

  return parsedBank
}

/**
 * A row as the bank holds it, which is more than a round needs: the rating that
 * decides whether it may be drawn, and the pack it came from. Neither belongs
 * to the game, so `hostQuestionOf` names the fields that do rather than
 * spreading the row into a round.
 */
export type BankedQuestion = z.infer<typeof bankedQuestionSchema>

/**
 * Split once, with the parse, because a room only ever draws from one of them:
 * the two banks are separate downloads from separate sources, and scanning the
 * other four and a half thousand rows on every draw was work that could never
 * match.
 */
let questionsByLanguage: Map<string, BankedQuestion[]> | undefined

const byLanguage = (): Map<string, BankedQuestion[]> => {
  questionsByLanguage ??= Map.groupBy(
    bankedQuestions(),
    (question) => question.language
  )

  return questionsByLanguage
}

export const hostQuestionOf = ({
  accepted,
  answer,
  category,
  decoys,
  id,
  note,
  prompt
}: BankedQuestion): HostQuestion => ({
  accepted,
  answer,
  category,
  decoys,
  id,
  note,
  prompt
})

/**
 * One question the room has not had yet. `playedIds` is the room's memory
 * rather than this module's: two rooms playing at once must be able to draw the
 * same question, and a bank that remembered would leak one party into another.
 *
 * An empty `categories` means every category, the same way an empty genre list
 * does for the blind test.
 *
 * **The category is drawn first, then a question inside it**, which is what
 * makes "every subject" a mix rather than a reflection of how lopsided a bank
 * happens to be. Drawing uniformly over questions gave an English room a video
 * game once every five rounds and a history question once every twenty, because
 * `arts` is 55% of that bank and `history` 10%. It self-corrects as an evening
 * runs: a category whose questions have all been played is not in `eligible`
 * any more, so it stops being offered.
 *
 * `isUsable` is how a game asks for a shape of question rather than a subject.
 * A `choiceOnly` row wants its own decoys on screen, which is true of a quiz in
 * `choice` mode and of nothing else: typed mode has a text field.
 */
export const drawQuestion = ({
  isUsable,
  playedIds,
  settings
}: {
  isUsable: (question: BankedQuestion) => boolean
  playedIds: ReadonlySet<string>
  settings: QuestionDrawSettings
}): BankedQuestion | null => {
  const eligible = (byLanguage().get(settings.language) ?? []).filter(
    (question) =>
      !playedIds.has(question.id) &&
      (settings.allowsAdultContent || !question.isAdult) &&
      (!settings.wellKnownOnly || question.isWellKnown) &&
      (settings.categories.length === 0 ||
        settings.categories.includes(question.category)) &&
      isUsable(question)
  )

  const byCategory = Map.groupBy(eligible, (question) => question.category)

  return pickRandom(pickRandom([...byCategory.values()]) ?? [])
}
