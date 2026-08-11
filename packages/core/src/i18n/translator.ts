import type {
  DefinedTranslation,
  OptionsFor,
  PluralForms,
  TranslationOptions
} from './define-translation'

export type Translations = {
  [segment: string]: string | DefinedTranslation | Translations
}

/**
 * A bare string is enough until a placeholder needs alternatives to choose
 * between — and `{n:plural}` or `{n:enum}` written as one resolves to `never`
 * here rather than falling back to the raw value at runtime.
 */
type WellFormed<Translation> = Translation extends string
  ? Record<string, never> extends OptionsFor<Translation>
    ? Translation
    : never
  : Translation extends DefinedTranslation
    ? Translation
    : { [Segment in keyof Translation]: WellFormed<Translation[Segment]> }

export const defineTranslations = <
  const T extends { [Segment in keyof T]: WellFormed<T[Segment]> }
>(
  translations: T
): T => translations

type Join<Segment, Rest> = Segment extends string
  ? Rest extends string
    ? `${Segment}.${Rest}`
    : never
  : never

/**
 * Recursion over a dictionary whose type is still a type parameter has no floor
 * of its own — TypeScript keeps descending into `T[Segment]` and gives up with
 * TS2589. A registered dictionary would be concrete and would need none of
 * this; a generic one has to count the levels down. Past the last one a path
 * resolves to `never`, so nesting deeper than this fails to compile rather than
 * losing a key quietly.
 */
type NextLevel = [never, 0, 1, 2, 3, 4, 5, 6, 7, 8, 9]

type Level = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10

/**
 * Every leaf, as the dotted path that reaches it. A branch is not a key: only
 * the string or `defineTranslation` at the end of one is.
 */
export type DotPath<T, Remaining extends Level = 10> = {
  [Segment in keyof T]: T[Segment] extends string | DefinedTranslation
    ? Segment
    : NextLevel[Remaining] extends Level
      ? Join<Segment, DotPath<T[Segment], NextLevel[Remaining]>>
      : never
}[keyof T]

type LeafAt<T, Path> = Path extends `${infer Segment}.${infer Rest}`
  ? Segment extends keyof T
    ? LeafAt<T[Segment], Rest>
    : never
  : Path extends keyof T
    ? T[Path]
    : never

type MessageOf<Translation> = Translation extends readonly [
  infer Message extends string,
  unknown
]
  ? Message
  : Translation extends string
    ? Translation
    : never

type OptionsOf<Translation> = Translation extends readonly [
  string,
  infer Options
]
  ? Options
  : unknown

type EnumsOf<Options> = Options extends { enum: infer Enums }
  ? Enums
  : Record<string, Record<string, string>>

type ValueForParam<
  Type extends string,
  Name extends string,
  Enums
> = Type extends 'date'
  ? Date
  : Type extends 'enum'
    ? Name extends keyof Enums
      ? keyof Enums[Name]
      : never
    : Type extends 'list'
      ? readonly string[]
      : Type extends 'number' | 'plural'
        ? number
        : never

/**
 * An untyped `{name}` is text, so it takes a string. A number never arrives
 * unformatted: it declares `:number` or `:plural` and the locale prints it.
 */
type ValuesIn<
  Message extends string,
  Enums
> = Message extends `${string}{${infer Param}}${infer Rest}`
  ? Param extends `${infer Name}:${infer Type}`
    ? { [K in Name]: ValueForParam<Type, Name, Enums> } & ValuesIn<Rest, Enums>
    : { [K in Param]: string } & ValuesIn<Rest, Enums>
  : unknown

export type ValuesFor<Translation> = ValuesIn<
  MessageOf<Translation>,
  EnumsOf<OptionsOf<Translation>>
>

export type PlainKey<T> = {
  [Path in DotPath<T>]: keyof ValuesFor<LeafAt<T, Path>> extends never
    ? Path
    : never
}[DotPath<T>]

export type ParameterizedKey<T> = {
  [Path in DotPath<T>]: keyof ValuesFor<LeafAt<T, Path>> extends never
    ? never
    : Path
}[DotPath<T>]

export type Translator<T> = {
  <K extends PlainKey<T>>(key: K): string
  <K extends ParameterizedKey<T>, V extends ValuesFor<LeafAt<T, K>>>(
    key: K,
    values: V
  ): string
}

/**
 * What a second locale owes the reference one: the same tree down to the same
 * leaves, and for a leaf whose placeholders carry alternatives, its own
 * alternatives in the same shape. The plural categories may differ — French
 * answers `one` where English answers `other` — so only `other` is required of
 * either.
 */
export type TranslationsLike<Reference> = {
  [Segment in keyof Reference]: Reference[Segment] extends readonly [
    string,
    infer Options
  ]
    ? readonly [string, LocalizedOptions<Options>]
    : Reference[Segment] extends string
      ? string
      : Reference[Segment] extends Translations
        ? TranslationsLike<Reference[Segment]>
        : never
}

type LocalizedOptions<Options> = {
  [K in keyof Options]: K extends 'plural'
    ? { [Name in keyof Options[K]]: PluralForms }
    : K extends 'enum'
      ? {
          [Name in keyof Options[K]]: Record<
            keyof Options[K][Name] & string,
            string
          >
        }
      : Options[K]
}

const PLACEHOLDER = /\{(\w+)(?::(\w+))?\}/g

const FORMATTED_COUNT = '{?}'

/**
 * The reference dictionary is the contract and every locale is an
 * implementation of it, so the keys and their values are typed from the
 * reference even when the strings being read are another language's.
 */
export const createTranslator = <T>({
  locale,
  translations
}: {
  locale: string
  translations: Translations & TranslationsLike<T>
}): Translator<T> => {
  function translate<K extends PlainKey<T>>(key: K): string
  function translate<
    K extends ParameterizedKey<T>,
    V extends ValuesFor<LeafAt<T, K>>
  >(key: K, values: V): string
  function translate(key: string, values?: Record<string, unknown>): string {
    const translation = findLeaf(translations, key)

    if (translation === undefined) {
      return key
    }

    if (typeof translation === 'string') {
      return substitute({
        locale,
        message: translation,
        options: {},
        values: values ?? {}
      })
    }

    const [message, options] = translation

    return substitute({ locale, message, options, values: values ?? {} })
  }

  return translate
}

const isLeaf = (
  branch: string | DefinedTranslation | Translations
): branch is string | DefinedTranslation =>
  typeof branch === 'string' || Array.isArray(branch)

const findLeaf = (
  translations: Translations,
  key: string
): string | DefinedTranslation | undefined => {
  let branch: string | DefinedTranslation | Translations | undefined =
    translations

  for (const segment of key.split('.')) {
    if (branch === undefined || isLeaf(branch)) {
      return undefined
    }

    branch = branch[segment]
  }

  return branch !== undefined && isLeaf(branch) ? branch : undefined
}

const substitute = ({
  locale,
  message,
  options,
  values
}: {
  locale: string
  message: string
  options: TranslationOptions
  values: Record<string, unknown>
}): string =>
  message.replace(PLACEHOLDER, (placeholder, name: string, type?: string) => {
    const value = values[name]

    if (value === undefined) {
      return placeholder
    }

    switch (type) {
      case 'date':
        return value instanceof Date
          ? new Intl.DateTimeFormat(locale, options.date?.[name]).format(value)
          : placeholder
      case 'enum':
        return typeof value === 'string'
          ? (options.enum?.[name]?.[value] ?? placeholder)
          : placeholder
      case 'list':
        return Array.isArray(value)
          ? new Intl.ListFormat(locale, options.list?.[name]).format(value)
          : placeholder
      case 'number':
        return typeof value === 'number'
          ? new Intl.NumberFormat(locale, options.number?.[name]).format(value)
          : placeholder
      case 'plural':
        return typeof value === 'number'
          ? pluralize({ count: value, forms: options.plural?.[name], locale })
          : placeholder
      default:
        return String(value)
    }
  })

/**
 * Neither English nor French has a CLDR `zero` category, so a `zero` form would
 * never be selected on its own — yet "nobody has answered" at 0 is the sentence
 * a room actually wants. Declaring one opts into it.
 */
const pluralize = ({
  count,
  forms,
  locale
}: {
  count: number
  forms: PluralForms | undefined
  locale: string
}): string => {
  if (forms === undefined) {
    return String(count)
  }

  const category =
    count === 0 && forms.zero !== undefined
      ? 'zero'
      : new Intl.PluralRules(locale, { type: forms.type }).select(count)

  return (forms[category] ?? forms.other).replaceAll(
    FORMATTED_COUNT,
    new Intl.NumberFormat(locale, forms.formatter).format(count)
  )
}
