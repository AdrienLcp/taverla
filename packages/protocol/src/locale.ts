import { z } from 'zod'

/**
 * The interface languages this product ships a dictionary for. It lives in the
 * contract rather than in the app because it crosses the wire once: opening a
 * room carries the host's, which is the only signal available for a setting the
 * table has not been asked about yet.
 *
 * It is deliberately *not* `QuestionLanguage`. The two hold the same two members
 * today and mean different things — this one is a dictionary this app ships,
 * that one is a bank somebody wrote — so the map between them is a rule with a
 * fallback, in `@taverla/core/quiz/question-language`.
 */
export const LOCALES = ['en', 'fr'] as const

export const localeSchema = z.enum(LOCALES)

/**
 * What a request that names no locale is read as. It sits here rather than with
 * the negotiation rule because it is the contract's own fallback: a create-room
 * frame from a tab opened before this field existed still has to mean something.
 */
export const DEFAULT_LOCALE = 'en' as const satisfies Locale

export type Locale = z.infer<typeof localeSchema>
