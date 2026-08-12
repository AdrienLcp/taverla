import { z } from 'zod'

import {
  type HostQuestion,
  hostQuestionSchema,
  type QuestionCategory,
  type QuestionDrawSettings,
  questionLanguageSchema
} from '@taverla/protocol/question'

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
  /** Drawn only for a room whose host asked for it — see `allowsAdultContent`. */
  isAdult: z.boolean(),
  language: questionLanguageSchema,
  /** The upstream pack, so a question that turns out to be wrong is traceable. */
  theme: z.string()
})

/**
 * Parsed once, at boot. A bank that no longer matches the schema is a broken
 * deploy rather than a round that fails in front of a room — and the cost is
 * paid while nobody is playing.
 */
const QUESTIONS = z.array(bankedQuestionSchema).parse(bank.questions)

/**
 * A row as the bank holds it, which is more than a round needs: the rating that
 * decides whether it may be drawn, and the pack it came from. Neither belongs
 * to the game, so `hostQuestionOf` names the fields that do rather than
 * spreading the row into a round.
 */
export type BankedQuestion = (typeof QUESTIONS)[number]

/**
 * Split once, at boot, because a room only ever draws from one of them: the two
 * banks are separate downloads from separate sources, and scanning the other
 * four and a half thousand rows on every draw was work that could never match.
 */
const BY_LANGUAGE = Map.groupBy(QUESTIONS, (question) => question.language)

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
 * Le Fake passes one because a quarter of the English bank presupposes the four
 * candidates it is normally read beside; the quiz passes none, because there
 * every banked question is a question it can ask.
 */
export const drawQuestion = ({
  isUsable,
  playedIds,
  settings
}: {
  isUsable?: (question: BankedQuestion) => boolean
  playedIds: ReadonlySet<string>
  settings: QuestionDrawSettings
}): BankedQuestion | null => {
  const eligible = (BY_LANGUAGE.get(settings.language) ?? []).filter(
    (question) =>
      !playedIds.has(question.id) &&
      (settings.allowsAdultContent || !question.isAdult) &&
      (settings.categories.length === 0 ||
        settings.categories.includes(question.category)) &&
      (isUsable === undefined || isUsable(question))
  )

  const byCategory = new Map<QuestionCategory, BankedQuestion[]>()

  for (const question of eligible) {
    byCategory.set(question.category, [
      ...(byCategory.get(question.category) ?? []),
      question
    ])
  }

  return pickOne(pickOne([...byCategory.values()]) ?? [])
}

const pickOne = <TItem>(from: readonly TItem[]): TItem | null =>
  from[Math.floor(Math.random() * from.length)] ?? null
