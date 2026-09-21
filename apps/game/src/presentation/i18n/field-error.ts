import type { PlainTranslationKey, Translate } from './translation'

/** Held as a key rather than a rendered string, so it follows a locale switch. */
export type FieldError =
  | { key: PlainTranslationKey }
  | {
      key: 'join.roomCode.unsupportedCharacters'
      values: { characters: string }
    }
  | { key: 'join.roomCode.wrongLength'; values: { length: number } }

/**
 * One case per key that carries values, and the two that read alike cannot be
 * folded into one: a key and its values taken off several arms at once are two
 * unions standing side by side rather than a pair, and the translator then asks
 * for every arm's placeholders at once — neither of these messages takes the
 * other's.
 */
export const fieldErrorMessage = ({
  error,
  translate
}: {
  error: FieldError | null
  translate: Translate
}): string | undefined => {
  if (error === null) {
    return undefined
  }

  switch (error.key) {
    case 'join.roomCode.unsupportedCharacters':
      return translate(error.key, error.values)
    case 'join.roomCode.wrongLength':
      return translate(error.key, error.values)
    default:
      return translate(error.key)
  }
}
