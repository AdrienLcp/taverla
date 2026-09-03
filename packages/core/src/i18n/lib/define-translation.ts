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

/**
 * `Intl.RelativeTimeFormat` formats a number *of something*, and the message
 * cannot say which — so the unit is declared here, per placeholder, and the
 * caller passes the count alone. Negative is the past, positive the future,
 * which is `Intl`'s own convention.
 */
export type RelativeTime = Intl.RelativeTimeFormatOptions & {
  unit: Intl.RelativeTimeFormatUnit
}

export type TranslationOptions = {
  date?: Record<string, Intl.DateTimeFormatOptions>
  displayname?: Record<string, Intl.DisplayNamesOptions>
  enum?: Record<string, Record<string, string>>
  list?: Record<string, Intl.ListFormatOptions>
  number?: Record<string, Intl.NumberFormatOptions>
  plural?: Record<string, PluralForms>
  relative?: Record<string, RelativeTime>
}

type OptionsForParam<
  Type extends string,
  Name extends string
> = Type extends 'date'
  ? { date?: { [K in Name]?: Intl.DateTimeFormatOptions } }
  : Type extends 'displayname'
    ? { displayname: { [K in Name]: Intl.DisplayNamesOptions } }
    : Type extends 'enum'
      ? { enum: { [K in Name]: Record<string, string> } }
      : Type extends 'list'
        ? { list?: { [K in Name]?: Intl.ListFormatOptions } }
        : Type extends 'number'
          ? { number?: { [K in Name]?: Intl.NumberFormatOptions } }
          : Type extends 'plural'
            ? { plural: { [K in Name]: PluralForms } }
            : Type extends 'relative'
              ? { relative: { [K in Name]: RelativeTime } }
              : never

export type OptionsFor<Message extends string> =
  Message extends `${string}{${infer Param}}${infer Rest}`
    ? Param extends `${infer Name}:${infer Type}`
      ? OptionsForParam<Type, Name> & OptionsFor<Rest>
      : OptionsFor<Rest>
    : unknown

export type DefinedTranslation = readonly [string, TranslationOptions]

/**
 * Pairs a message with what its placeholders need beyond the value itself.
 * `plural` and `enum` need the alternatives to choose between; `relative` needs
 * its unit and `displayname` the kind of name to look up. The other three only
 * configure a formatter, so a message wanting the locale's defaults is written
 * as a bare string.
 */
export const defineTranslation = <
  Message extends string,
  const Options extends OptionsFor<Message>
>(
  message: Message,
  options: Options
): readonly [Message, Options] => [message, options]
