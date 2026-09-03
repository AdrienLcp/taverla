/**
 * A placeholder written `{name}` is text and takes a string. One written
 * `{name:type}` is a value the locale has to format, and the type decides both
 * what the caller must pass and what this file demands alongside the message.
 *
 * `plural` and `enum` carry their alternatives here rather than in the sentence,
 * because those alternatives are what differs between locales.
 */
export type PluralForms = Partial<
  Record<Exclude<Intl.LDMLPluralRule, 'other'>, string>
> & {
  formatter?: Intl.NumberFormatOptions
  other: string
  type?: Intl.PluralRuleType
}

export type TranslationOptions = {
  date?: Record<string, Intl.DateTimeFormatOptions>
  enum?: Record<string, Record<string, string>>
  list?: Record<string, Intl.ListFormatOptions>
  number?: Record<string, Intl.NumberFormatOptions>
  plural?: Record<string, PluralForms>
}

type OptionsForParam<
  Type extends string,
  Name extends string
> = Type extends 'date'
  ? { date?: { [K in Name]?: Intl.DateTimeFormatOptions } }
  : Type extends 'enum'
    ? { enum: { [K in Name]: Record<string, string> } }
    : Type extends 'list'
      ? { list?: { [K in Name]?: Intl.ListFormatOptions } }
      : Type extends 'number'
        ? { number?: { [K in Name]?: Intl.NumberFormatOptions } }
        : Type extends 'plural'
          ? { plural: { [K in Name]: PluralForms } }
          : never

export type OptionsFor<Message extends string> =
  Message extends `${string}{${infer Param}}${infer Rest}`
    ? Param extends `${infer Name}:${infer Type}`
      ? OptionsForParam<Type, Name> & OptionsFor<Rest>
      : OptionsFor<Rest>
    : unknown

export type DefinedTranslation = readonly [string, TranslationOptions]

/**
 * Pairs a message with the alternatives its placeholders choose between. Only
 * `plural` and `enum` need one: the other three types configure a formatter,
 * and a message wanting the locale's default formatting is written as a bare
 * string.
 */
export const defineTranslation = <
  Message extends string,
  const Options extends OptionsFor<Message>
>(
  message: Message,
  options: Options
): readonly [Message, Options] => [message, options]
