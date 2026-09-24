import type { PlayerId } from '@taverla/protocol/identifiers'

import { normalizeAnswer } from '../round/answer-matching'

export type SheetAnswer = {
  playerId: PlayerId
  text: string
}

export type AnswerGroup = {
  /** The normalised form every member shares — what a verdict is filed under. */
  key: string
  playerIds: PlayerId[]
  /** The spelling most of them wrote, for the wall. */
  text: string
}

/**
 * The shared normalisation and nothing more: case, accents, spacing and a
 * leading article. No typo tolerance — a group is *the same answer*, and
 * whether a near miss is close enough is the host's call, made on the wall.
 * No catalogue-noise folding either; that is the blind test's alone.
 */
export const answerGroupKey = (text: string): string => normalizeAnswer(text)

/** A line with nothing a group could be filed under — never written, or only punctuation. */
export const isBlankAnswer = (text: string | null): boolean =>
  text === null || answerGroupKey(text) === ''

/**
 * One item's answers, grouped so one verdict covers every player who wrote the
 * same thing. Blanks are left out: there is nothing in them to validate.
 * Largest group first, then alphabetical, so the wall reads the same after a
 * reload.
 */
export const groupAnswers = (
  answers: readonly SheetAnswer[]
): AnswerGroup[] => {
  const byKey = new Map<string, SheetAnswer[]>()

  for (const answer of answers) {
    const key = answerGroupKey(answer.text)

    if (key !== '') {
      byKey.set(key, [...(byKey.get(key) ?? []), answer])
    }
  }

  return [...byKey]
    .map(([key, members]) => ({
      key,
      playerIds: members.map((member) => member.playerId),
      text: mostWritten(members)
    }))
    .toSorted(
      (one, other) =>
        other.playerIds.length - one.playerIds.length ||
        one.text.localeCompare(other.text)
    )
}

const mostWritten = (members: readonly SheetAnswer[]): string => {
  const counts = new Map<string, number>()

  for (const { text } of members) {
    counts.set(text, (counts.get(text) ?? 0) + 1)
  }

  let chosen = members[0]?.text ?? ''

  for (const [text, count] of counts) {
    if (count > (counts.get(chosen) ?? 0)) {
      chosen = text
    }
  }

  return chosen
}
