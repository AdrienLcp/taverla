import type {
  DefinedTranslation,
  OptionsFor,
  PluralForms
} from './define-translation'

/**
 * A tree of messages for one locale: every leaf is a sentence, every branch a
 * namespace. A branch is never also a leaf — `host.answerWindow.label`, not
 * `host.answerWindow` doubling as both.
 */
export type Dictionary = {
  [segment: string]: string | DefinedTranslation | Dictionary
}

/**
 * A bare string is enough until a placeholder needs alternatives to choose
 * between — and `{n:plural}` or `{n:enum}` written as one resolves to `never`
 * here rather than putting the raw key on screen at runtime.
 *
 * The last branch has to name `Dictionary` rather than map over anything: a
 * mapped type over a primitive returns that primitive, so a leaf holding a
 * number, a `Date` or a function would otherwise pass through unexamined.
 */
type WellFormed<Message> = Message extends string
  ? Record<string, never> extends OptionsFor<Message>
    ? Message
    : never
  : Message extends DefinedTranslation
    ? Message
    : Message extends Dictionary
      ? { [Segment in keyof Message]: WellFormed<Message[Segment]> }
      : never

/**
 * The reference dictionary — the one every key and every value is typed from.
 *
 * A function rather than a type to `satisfies`, because a type describing a
 * dictionary has to reach its members through an index signature, and their
 * type then cannot depend on the message written at each key.
 */
export const defineDictionary = <
  const T extends { [Segment in keyof T]: WellFormed<T[Segment]> }
>(
  dictionary: T
): T => dictionary

/**
 * What a second locale owes the reference one: the same tree down to the same
 * leaves, and for a leaf whose placeholders carry alternatives, its own
 * alternatives in the same shape. The plural categories may differ — French
 * answers `one` where English answers `other` — so only `other` is required of
 * either.
 *
 * Written as a type to annotate with rather than a function to call, so that
 * TypeScript's excess property check does the other half of the work: a key the
 * reference does not have is rejected at the literal, at every depth.
 *
 * ```ts
 * export const FR_DICTIONARY: DictionaryFor<typeof EN_DICTIONARY> = { … }
 * ```
 */
export type DictionaryFor<Reference> = {
  [Segment in keyof Reference]: Reference[Segment] extends readonly [
    string,
    infer Options
  ]
    ? readonly [string, LocalizedOptions<Options>]
    : Reference[Segment] extends string
      ? string
      : Reference[Segment] extends Dictionary
        ? DictionaryFor<Reference[Segment]>
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
 * losing a key quietly — with a misleading error, since the whole path union
 * collapses at once.
 */
type NextLevel = [never, 0, 1, 2, 3, 4, 5, 6, 7, 8, 9]

type Level = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10

/** Every leaf, as the dotted path that reaches it. */
export type DotPath<T, Remaining extends Level = 10> = {
  [Segment in keyof T]: T[Segment] extends string | DefinedTranslation
    ? Segment
    : NextLevel[Remaining] extends Level
      ? Join<Segment, DotPath<T[Segment], NextLevel[Remaining]>>
      : never
}[keyof T]

export type LeafAt<T, Path> = Path extends `${infer Segment}.${infer Rest}`
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

/**
 * A key whose message carries no placeholder, so it renders from nothing but
 * itself. It is what a lookup table or a piece of state may hold: a key needing
 * values cannot be translated by whoever ends up reading it back.
 */
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
