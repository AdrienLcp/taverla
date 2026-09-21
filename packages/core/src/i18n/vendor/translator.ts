import type {
  DefinedTranslation,
  PluralForms,
  RelativeTime,
  TranslationOptions
} from './define-translation'
import type {
  Dictionary,
  DictionaryFor,
  DotPath,
  LeafAt,
  ParameterizedKey,
  PlainKey,
  RichValuesFor,
  ValuesFor
} from './dictionary'

export type Translator<Reference> = {
  <Key extends PlainKey<Reference>>(key: Key): string
  <
    Key extends ParameterizedKey<Reference>,
    Values extends ValuesFor<LeafAt<Reference, Key>>
  >(
    key: Key,
    values: Values
  ): string
  /**
   * The same message, cut at the spans it marks, each one handed to the
   * function named after it. What comes back is the pieces in order — strings
   * for the plain parts, whatever the functions returned for the marked ones —
   * which a UI framework renders as a list and a string consumer joins.
   *
   * This is how a sentence keeps one key while still carrying a link or a bold
   * word: splitting it into three keys instead would break the moment a
   * language puts the words in another order.
   */
  rich: <Key extends DotPath<Reference> & string, Node>(
    key: Key,
    values: RichValuesFor<LeafAt<Reference, Key>, Node>
  ) => (string | Node)[]
}

type TranslatorOptions<Reference> = {
  dictionary: Dictionary & DictionaryFor<Reference>
  locale: string
}

/**
 * The reference dictionary is the contract and every locale is an
 * implementation of it, so the keys and their values are typed from the
 * reference even when the strings being read are another language's.
 *
 * One translator holds one locale's dictionary and nothing else — no registry
 * of every language, no cascade from one to the next. Choosing the locale is
 * `negotiateLocale`'s job, and loading only the chosen dictionary is the
 * caller's, which is what lets an app `import()` it rather than bundle every
 * language it ships. There is no key-level fallback to another locale because
 * `DictionaryFor` makes a missing key fail to compile; a dictionary that fails
 * to *load* has no keys at all, and the caller answers that by keeping the
 * translator it already had.
 */
export const createTranslator = <Reference>({
  dictionary,
  locale
}: TranslatorOptions<Reference>): Translator<Reference> => {
  const formatters = createFormatters(locale)

  function translate<Key extends PlainKey<Reference>>(key: Key): string
  function translate<
    Key extends ParameterizedKey<Reference>,
    Values extends ValuesFor<LeafAt<Reference, Key>>
  >(key: Key, values: Values): string
  function translate(key: string, values?: Record<string, unknown>): string {
    const translation = findLeaf(dictionary, key)

    if (translation === undefined) {
      return key
    }

    if (typeof translation === 'string') {
      return substitute({
        formatters,
        message: translation,
        options: {},
        values: values ?? {}
      })
    }

    const [message, options] = translation

    return substitute({ formatters, message, options, values: values ?? {} })
  }

  const rich = <Node>(
    key: string,
    values: Record<string, unknown>
  ): (string | Node)[] => {
    const translation = findLeaf(dictionary, key)

    if (translation === undefined) {
      return [key]
    }

    const [message, options] =
      typeof translation === 'string'
        ? ([translation, {}] as const)
        : translation

    // The spans are cut before anything is substituted, so a value that itself
    // reads `<b>` is written out as text rather than becoming a span — the same
    // rule the placeholders follow, for the same reason.
    return splitSpans(message).map((span) => {
      const text = substitute({
        formatters,
        message: span.text,
        options,
        values
      })

      if (span.tag === undefined) {
        return text
      }

      const render = values[span.tag]

      return typeof render === 'function' ? render(text) : text
    })
  }

  return Object.assign(translate, { rich })
}

const SPAN = /<(\w+)>([\s\S]*?)<\/\1>/g

type Span = { tag: string | undefined; text: string }

/**
 * A span cannot hold another span: the inner one would have to be rendered
 * before the outer function could be given a string, and a string is all a
 * function receives. Nesting is the price of that simplicity, and no sentence
 * has needed it yet.
 */
const splitSpans = (message: string): Span[] => {
  const spans: Span[] = []
  let cursor = 0

  for (const match of message.matchAll(SPAN)) {
    const [whole, tag, children] = match

    if (tag === undefined || children === undefined) {
      continue
    }

    const before = message.slice(cursor, match.index)

    if (before !== '') {
      spans.push({ tag: undefined, text: before })
    }

    spans.push({ tag, text: children })
    cursor = match.index + whole.length
  }

  const tail = message.slice(cursor)

  if (tail !== '' || spans.length === 0) {
    spans.push({ tag: undefined, text: tail })
  }

  return spans
}

const isLeaf = (
  branch: string | DefinedTranslation | Dictionary
): branch is string | DefinedTranslation =>
  typeof branch === 'string' || Array.isArray(branch)

const findLeaf = (
  dictionary: Dictionary,
  key: string
): string | DefinedTranslation | undefined => {
  let branch: string | DefinedTranslation | Dictionary | undefined = dictionary

  for (const segment of key.split('.')) {
    if (branch === undefined || isLeaf(branch)) {
      return undefined
    }

    branch = branch[segment]
  }

  return branch !== undefined && isLeaf(branch) ? branch : undefined
}

const PLACEHOLDER = /\{(\w+)(?::(\w+))?\}/g

const FORMATTED_COUNT = '{?}'

/**
 * One pass over the message, so a value that itself reads `{like this}` is
 * written out and never looked at again. Substituting argument by argument
 * would feed each result back to the next argument's turn.
 *
 * The one thing read twice is the alternative a placeholder resolved to — a
 * plural form, an enum member — which `expand` runs through a pass of its own.
 * That is dictionary text rather than a caller's value, so the rule above is
 * untouched.
 *
 * A value of the wrong type, or one the message never asked for, leaves its
 * placeholder standing rather than throwing: one bad value costs one word, not
 * the whole sentence.
 */
const substitute = ({
  expanding = [],
  formatters,
  message,
  options,
  values
}: {
  expanding?: readonly string[]
  formatters: Formatters
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
          ? formatters.date(options.date?.[name]).format(value)
          : placeholder
      case 'displayname':
        return typeof value === 'string'
          ? (displayName({
              formatters,
              of: value,
              options: options.displayname?.[name]
            }) ?? placeholder)
          : placeholder
      case 'enum': {
        const member =
          typeof value === 'string' ? options.enum?.[name]?.[value] : undefined

        return member === undefined
          ? placeholder
          : expand({
              expanding,
              formatters,
              message: member,
              name,
              options,
              placeholder,
              values
            })
      }
      case 'list':
        return Array.isArray(value)
          ? formatters.list(options.list?.[name]).format(value)
          : placeholder
      case 'number':
        return typeof value === 'number'
          ? formatters.number(options.number?.[name]).format(value)
          : placeholder
      case 'plural':
        return typeof value === 'number'
          ? expand({
              expanding,
              formatters,
              message: pluralize({
                count: value,
                formatters,
                forms: options.plural?.[name]
              }),
              name,
              options,
              placeholder,
              values
            })
          : placeholder
      case 'relative':
        return typeof value === 'number'
          ? (relativeTime({
              count: value,
              formatters,
              unit: options.relative?.[name]
            }) ?? placeholder)
          : placeholder
      default:
        return String(value)
    }
  })

/**
 * A plural form and an enum member are dictionary text, so a placeholder one
 * carries is substituted like the rest of the sentence — `{?} messages from
 * {sender}` prints the sender rather than the word. `rich` already substitutes
 * inside the spans it cuts, and the two paths would otherwise disagree.
 *
 * Only the alternative the dictionary chose is read again, never a caller's
 * value: feeding a value back through is what prints a number of seconds inside
 * a player who named themselves `{seconds}`.
 *
 * `expanding` is the floor the recursion has none of otherwise. A form naming
 * the placeholder it was selected for — `other: '{count:plural} left'` under
 * `count` — would expand forever, so a name already being expanded leaves its
 * placeholder standing, which is what a value of the wrong type does too.
 */
const expand = ({
  expanding,
  formatters,
  message,
  name,
  options,
  placeholder,
  values
}: {
  expanding: readonly string[]
  formatters: Formatters
  message: string
  name: string
  options: TranslationOptions
  placeholder: string
  values: Record<string, unknown>
}): string =>
  expanding.includes(name)
    ? placeholder
    : substitute({
        expanding: [...expanding, name],
        formatters,
        message,
        options,
        values
      })

/**
 * Neither English nor French has a CLDR `zero` category, so a `zero` form would
 * never be selected on its own — yet "nobody has answered" at 0 is the sentence
 * a screen actually wants. Declaring one opts into it.
 */
const pluralize = ({
  count,
  formatters,
  forms
}: {
  count: number
  formatters: Formatters
  forms: PluralForms | undefined
}): string => {
  if (forms === undefined) {
    return String(count)
  }

  const category =
    count === 0 && forms.zero !== undefined
      ? 'zero'
      : formatters.plural({ type: forms.type }).select(count)

  return (forms[category] ?? forms.other).replaceAll(
    FORMATTED_COUNT,
    formatters.number(forms.formatter).format(count)
  )
}

/**
 * A message declaring `{x:displayname}` must declare the kind of name it wants,
 * so the options are never absent — but the runtime shape stays loose, and
 * `Intl.DisplayNames` throws without a `type`. Nothing rather than a crash.
 */
const displayName = ({
  formatters,
  of,
  options
}: {
  formatters: Formatters
  of: string
  options: Intl.DisplayNamesOptions | undefined
}): string | undefined =>
  options === undefined ? undefined : formatters.displayname(options).of(of)

/** Same reasoning: the unit is declared with the message, or there is none. */
const relativeTime = ({
  count,
  formatters,
  unit
}: {
  count: number
  formatters: Formatters
  unit: RelativeTime | undefined
}): string | undefined =>
  unit === undefined
    ? undefined
    : formatters.relative(unit).format(count, unit.unit)

type Formatters = {
  date: (options?: Intl.DateTimeFormatOptions) => Intl.DateTimeFormat
  displayname: (options: Intl.DisplayNamesOptions) => Intl.DisplayNames
  list: (options?: Intl.ListFormatOptions) => Intl.ListFormat
  number: (options?: Intl.NumberFormatOptions) => Intl.NumberFormat
  plural: (options?: Intl.PluralRulesOptions) => Intl.PluralRules
  relative: (
    options?: Intl.RelativeTimeFormatOptions
  ) => Intl.RelativeTimeFormat
}

/**
 * Building an `Intl` formatter costs far more than using one — it resolves the
 * locale data — and a message asks for the same one on every render. Held per
 * translator rather than in a module-level map, so the memory a locale takes
 * goes away with the translator that used it, and a test starts from nothing.
 *
 * Keyed on the options as written: two equivalent option objects whose keys are
 * in a different order get an entry each. They come from dictionary literals,
 * so there are as many entries as the dictionary has distinct formats.
 */
const createFormatters = (locale: string): Formatters => {
  const dates = new Map<string, Intl.DateTimeFormat>()
  const displayNames = new Map<string, Intl.DisplayNames>()
  const lists = new Map<string, Intl.ListFormat>()
  const numbers = new Map<string, Intl.NumberFormat>()
  const plurals = new Map<string, Intl.PluralRules>()
  const relatives = new Map<string, Intl.RelativeTimeFormat>()

  return {
    date: (options) =>
      remembered(
        dates,
        options,
        () => new Intl.DateTimeFormat(locale, options)
      ),
    displayname: (options) =>
      remembered(
        displayNames,
        options,
        () => new Intl.DisplayNames(locale, options)
      ),
    list: (options) =>
      remembered(lists, options, () => new Intl.ListFormat(locale, options)),
    number: (options) =>
      remembered(
        numbers,
        options,
        () => new Intl.NumberFormat(locale, options)
      ),
    plural: (options) =>
      remembered(plurals, options, () => new Intl.PluralRules(locale, options)),
    relative: (options) =>
      remembered(
        relatives,
        options,
        () => new Intl.RelativeTimeFormat(locale, options)
      )
  }
}

const remembered = <Formatter>(
  cache: Map<string, Formatter>,
  options: unknown,
  build: () => Formatter
): Formatter => {
  const key = JSON.stringify(options ?? null)
  const built = cache.get(key)

  if (built !== undefined) {
    return built
  }

  const created = build()
  cache.set(key, created)

  return created
}
