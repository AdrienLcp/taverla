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
export type WellFormed<Message> = Message extends string
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

/**
 * What a second locale owes the reference beyond its shape: the same
 * placeholders, in the same message. `DictionaryFor` types every message as a
 * bare `string`, so `'Willkommen {nom}'` sits opposite `'Welcome {name}'` and
 * compiles — the keys are compared across locales, the placeholders inside them
 * are not. At two languages that is theoretical; at five it is a matter of time.
 *
 * The comparison runs both ways, because a locale declaring *fewer*
 * placeholders than the reference is as wrong as one declaring more, and a
 * `{count}` written where the reference formats `{count:number}` asks its caller
 * for a different value. A leaf that disagrees resolves to `never`, which no
 * message is assignable to, so the error lands on the key that disagrees.
 *
 * There is only something to compare while the messages are still literal
 * types, which is why every dictionary is written through `defineDictionary`.
 * An annotation widens each message to `string` and takes its placeholders with
 * it — and so does `satisfies`, whose contextual type is that same `string`.
 */
export type MatchingDictionary<Reference, Candidate> = {
  [Segment in keyof Reference]: MatchingLeaf<
    Reference[Segment],
    Segment extends keyof Candidate ? Candidate[Segment] : never
  >
} & {
  /**
   * A key the reference does not have, demanded as `never` so that whatever
   * was written under it is refused. TypeScript's own excess property check
   * cannot do this here: it fires on a literal with a type of its own, and a
   * dictionary reaches the registry as a value, from another module as often
   * as not.
   */
  [Segment in Exclude<keyof Candidate, keyof Reference>]: never
}

type MatchingLeaf<Reference, Candidate> = Reference extends readonly [
  string,
  infer Options
]
  ? Matches<Reference, Candidate> extends true
    ? readonly [string, LocalizedOptions<Options>]
    : never
  : Reference extends string
    ? Matches<Reference, Candidate> extends true
      ? string
      : never
    : Reference extends Dictionary
      ? MatchingDictionary<Reference, Candidate>
      : never

/**
 * Everything the message asks of the outside: the values a caller passes, and
 * the spans a rich rendering marks up. A `<link>` the reference opens and a
 * locale drops takes the link off the screen as quietly as a renamed
 * placeholder puts the wrong word on it, so both are compared at once.
 */
type Matches<Reference, Candidate> = Same<
  RichValuesFor<Reference, unknown>,
  RichValuesFor<Candidate, unknown>
>

/** Assignable both ways, so that a difference in either is a difference. */
type Same<Left, Right> = [Left] extends [Right]
  ? [Right] extends [Left]
    ? true
    : false
  : false

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
  : Type extends 'displayname'
    ? string
    : Type extends 'enum'
      ? Name extends keyof Enums
        ? keyof Enums[Name]
        : never
      : Type extends 'list'
        ? readonly string[]
        : Type extends 'number' | 'plural' | 'relative'
          ? number
          : never

/**
 * Every placeholder a message writes, left as written — `name`, `at:date`. What
 * a caller owes is built from that union in one mapped type rather than folded
 * together message by message, which is what lets the alternatives a `:plural`
 * or an `:enum` chooses between be read with the same grammar as the sentence
 * and land in the same object.
 *
 * `{?}` is the plural count's own marker and not a value anyone passes:
 * `pluralize` fills it from the number it was already handed.
 */
type ParamsIn<Message extends string> =
  Message extends `${string}{${infer Param}}${infer Rest}`
    ? (Param extends '?' ? never : Param) | ParamsIn<Rest>
    : never

/**
 * The text a translation carries besides its sentence: every plural form, every
 * enum member. The runtime substitutes inside whichever one it selects, so a
 * placeholder written there asks its caller for a value exactly as one in the
 * sentence does — and the cross-locale comparison holds a locale to it too.
 *
 * All of them are read, not the one a count will select: which category answers
 * is the locale's business, and unknowable from here.
 */
type AlternativesIn<Options> =
  | (Options extends { enum: infer Enums } ? TextsIn<Enums> : never)
  | (Options extends { plural: infer Plurals } ? TextsIn<Plurals> : never)

/**
 * Two levels down is every alternative and nothing else: `formatter` is an
 * object and drops out at `& string`, and `type` is a bare word with no
 * placeholder in it.
 */
type TextsIn<Groups> = {
  [Name in keyof Groups]: Groups[Name][keyof Groups[Name]]
}[keyof Groups] &
  string

/**
 * An untyped `{name}` is text, so it takes a string. A number never arrives
 * unformatted: it declares `:number` or `:plural` and the locale prints it.
 *
 * A message asking for nothing resolves to `unknown`, the neutral element of an
 * intersection, where `{}` would survive one: `RichValuesFor` intersects this
 * with a function per span, and a sentence carrying a `<link>` and no
 * placeholder has to come out as exactly that function.
 */
type ValuesForParams<Params extends string, Enums> = [Params] extends [never]
  ? unknown
  : {
      [Param in Params as Param extends `${infer Name}:${string}`
        ? Name
        : Param]: Param extends `${infer Name}:${infer Type}`
        ? ValueForParam<Type, Name, Enums>
        : string
    }

export type ValuesFor<Translation> = ValuesForParams<
  | ParamsIn<MessageOf<Translation>>
  | ParamsIn<AlternativesIn<OptionsOf<Translation>>>,
  EnumsOf<OptionsOf<Translation>>
>

/**
 * The names a message marks a span with — `Read the <link>terms</link>` names
 * `link`. Closing tags are skipped rather than collected: they carry the same
 * name, and a name is wanted once.
 */
type TagsIn<Message extends string> =
  Message extends `${string}<${infer Tag}>${infer Rest}`
    ? Tag extends `/${string}`
      ? TagsIn<Rest>
      : Tag | TagsIn<Rest>
    : never

/**
 * What a rich rendering asks for: the message's values, plus one function per
 * marked span. The function decides what a span becomes — a React element, an
 * HTML string, a terminal escape — which is why nothing here names a framework.
 */
export type RichValuesFor<Translation, Node> = ValuesFor<Translation> & {
  [Tag in TagsIn<MessageOf<Translation>>]: (children: string) => Node
}

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
