import type {
  Dictionary,
  DictionaryFor,
  MatchingDictionary
} from './dictionary'
import { negotiateLocale } from './negotiate-locale'
import { createTranslator, type Translator } from './translator'

/**
 * A dictionary the bundler is told to split out — `() => import('./fr')`. The
 * module `export default`s it, so TypeScript reads its type at compile time
 * even though its text arrives at run time: a locale that is fetched late is
 * held to the reference exactly like one that is imported.
 */
export type DictionaryLoader<Reference> = () => Promise<{
  default: Localized<Reference>
}>

/**
 * A dictionary for a second locale, seen from both sides at once: as the tree of
 * strings the reference demands, and as a dictionary the lookup can walk. It
 * names `Dictionary` for a second reason — a mapped type over a type parameter
 * is opaque enough that TypeScript will not rule out its being callable, and a
 * concrete member is what lets `typeof entry === 'function'` tell a dictionary
 * from a loader at all.
 *
 * The index signature that comes with it switches off TypeScript's own excess
 * property check, which is why `MatchingDictionary` demands `never` at a key the
 * reference does not have rather than leaving that to the literal.
 */
type Localized<Reference> = Dictionary & DictionaryFor<Reference>

/** What a locale registers: its dictionary, or the means of fetching it. */
type Registered<Reference> = Localized<Reference> | DictionaryLoader<Reference>

type AnyLoader = () => Promise<{ default: Dictionary }>

/**
 * One locale's entry held to the reference, whichever way it arrives. A loader
 * is compared through the dictionary its module `export default`s, so a locale
 * that is fetched late is checked exactly like one that is imported — and
 * checked before it is ever called.
 */
type Matching<Reference, Entry> = Entry extends () => Promise<{
  default: infer Loaded
}>
  ? () => Promise<{ default: MatchingDictionary<Reference, Loaded> }>
  : Localized<Reference> & MatchingDictionary<Reference, Entry>

export type I18n<
  Reference,
  Locale extends string,
  DefaultLocale extends Locale = Locale
> = {
  /**
   * A comparator for `Array.sort`, so that a list of names reads the way the
   * locale orders them — `Émile` between `Adrien` and `Zoé`, where sorting by
   * code point puts it after both.
   */
  compare: (
    locale: Locale,
    options?: Intl.CollatorOptions
  ) => (first: string, second: string) => number
  /** The locale a preference list falls back to, and the reference dictionary's own. */
  defaultLocale: DefaultLocale
  /**
   * Fetches what `locale` registered a loader for, and resolves with the
   * translator that reads it — from then on the one `translator(locale)` hands
   * out. A locale whose dictionary is already in hand resolves immediately, and
   * two calls made while one fetch is in flight share it rather than fetching
   * twice.
   *
   * It rejects when the fetch does, and forgets the attempt so that calling it
   * again retries. Ignoring that rejection is safe: `translator(locale)` goes on
   * answering with the default locale's translator, which is what the reader
   * was already seeing.
   */
  load: (locale: Locale) => Promise<Translator<Reference>>
  /** Every locale the registry knows, whether its dictionary is loaded or not. */
  locales: readonly Locale[]
  /** Which of `locales` a list of BCP-47 tags asks for. */
  negotiate: (preferred: readonly string[]) => Locale
  /**
   * The translator for one locale, synchronously and always: the locale's own
   * once its dictionary is in hand, the default locale's until then. So a page
   * renders on the first frame in a language the reader can read, and swaps to
   * theirs when `load` resolves — no blank screen, no spinner.
   *
   * The same function every time it is asked for, and a different one on either
   * side of a load. That is what a consumer memoises on.
   */
  translator: (locale: Locale) => Translator<Reference>
}

/**
 * Binds every locale to its dictionary once, so that afterwards a locale is all
 * anyone passes. It is the door callers want: `createTranslator` takes a locale
 * *and* a dictionary, and nothing there can check that the two go together — a
 * translator built with the French dictionary and the tag `'en'` reads French
 * and counts in English.
 *
 * The reference dictionary is `defaultLocale`'s, so that is where the keys and
 * the values are typed from, and every other locale is checked against it.
 *
 * A locale registers either its dictionary or a function fetching it, and the
 * guarantee holds for both — the type of `import('./fr')` is known before it is
 * ever called. Registering loaders is what keeps a bundler from shipping five
 * languages to a reader who reads one:
 *
 * ```ts
 * export const i18n = createI18n({
 *   defaultLocale: 'en',
 *   dictionaries: {
 *     en: EN_DICTIONARY,
 *     fr: () => import('./dictionary-fr'),
 *     de: () => import('./dictionary-de')
 *   }
 * })
 * ```
 *
 * The default locale's entry is a dictionary and never a loader, which the type
 * forces twice over: it is the reference every key and value is read from, so a
 * late arrival would leave TypeScript knowing nothing at the moment
 * `translate('…')` is written — and it is what a reader sees during the moment
 * their own language is in flight.
 *
 * A registry built without a single loader behaves exactly as one built before
 * they existed: everything is in hand, `translator` never falls back, and
 * `load` resolves on the spot.
 */
export const createI18n = <
  const Entries extends Record<string, Dictionary | AnyLoader>,
  const DefaultLocale extends keyof Entries & string
>({
  defaultLocale,
  dictionaries
}: {
  defaultLocale: DefaultLocale
  dictionaries: Entries & {
    [Locale in keyof Entries]: Matching<Entries[DefaultLocale], Entries[Locale]>
  } & Record<DefaultLocale, Localized<Entries[DefaultLocale]>>
}): I18n<Entries[DefaultLocale], keyof Entries & string, DefaultLocale> => {
  type Locale = keyof Entries & string
  type Reference = Entries[DefaultLocale]

  const locales = localesOf<Locale>(dictionaries)

  // Read into a map once, which is what carries the signature's promise into
  // the body. Indexed in place, an entry keeps every constraint the parameter
  // is an intersection of, and inside that knot the compiler will not tell a
  // dictionary from a loader; a map's value type is the plain alternative the
  // registry was describing all along.
  const registry = new Map<Locale, Registered<Reference>>(
    locales.map((locale) => [locale, dictionaries[locale]])
  )

  const collators = new Map<string, Intl.Collator>()
  const loaded = new Map<Locale, Localized<Reference>>()
  const loading = new Map<Locale, Promise<Translator<Reference>>>()
  const translators = new Map<Locale, Translator<Reference>>()

  for (const [locale, registered] of registry) {
    if (typeof registered !== 'function') {
      loaded.set(locale, registered)
    }
  }

  const defaultDictionary = dictionaries[defaultLocale]

  const compare = (locale: Locale, options?: Intl.CollatorOptions) => {
    const key = `${locale} ${JSON.stringify(options ?? null)}`
    const built = collators.get(key)

    if (built !== undefined) {
      return built.compare
    }

    const created = new Intl.Collator(locale, options)

    collators.set(key, created)

    return created.compare
  }

  /**
   * Built once per locale and kept. That is not a speed optimisation: a
   * consumer memoising on the translator must see a new identity when the
   * language it reads changes and the same one when it does not, or every
   * `useMemo` downstream either recomputes forever or serves the old language.
   */
  const translatorFor = (
    locale: Locale,
    dictionary: Localized<Reference>
  ): Translator<Reference> => {
    const built = translators.get(locale)

    if (built !== undefined) {
      return built
    }

    const created = createTranslator<Reference>({ dictionary, locale })

    translators.set(locale, created)

    return created
  }

  const translator = (locale: Locale): Translator<Reference> => {
    const dictionary = loaded.get(locale)

    return dictionary === undefined
      ? translatorFor(defaultLocale, defaultDictionary)
      : translatorFor(locale, dictionary)
  }

  const load = (locale: Locale): Promise<Translator<Reference>> => {
    const dictionary = loaded.get(locale)

    if (dictionary !== undefined) {
      return Promise.resolve(translatorFor(locale, dictionary))
    }

    const inFlight = loading.get(locale)

    if (inFlight !== undefined) {
      return inFlight
    }

    const registered = registry.get(locale)

    // Unreachable while every locale is either loaded or a loader, which the
    // loop above establishes — but `Map.get` cannot say so, and answering with
    // the reader's current translator beats throwing at them.
    if (registered === undefined || typeof registered !== 'function') {
      return Promise.resolve(translator(locale))
    }

    const started = fetchDictionary<Reference>(registered)
      .then((dictionary) => {
        loaded.set(locale, dictionary)

        return translatorFor(locale, dictionary)
      })
      .finally(() => {
        loading.delete(locale)
      })

    loading.set(locale, started)

    return started
  }

  return {
    compare,
    defaultLocale,
    load,
    locales,
    negotiate: (preferred) =>
      negotiateLocale(preferred, {
        fallback: defaultLocale,
        supported: locales
      }),
    translator
  }
}

/**
 * Calling the loader through a parameter of its own type, rather than as the
 * intersection the narrowing leaves behind: an intersection of two call
 * signatures resolves to the first, and the first is the one the constraint
 * wrote, which knows only that a dictionary comes back.
 */
const fetchDictionary = <Reference>(
  loader: DictionaryLoader<Reference>
): Promise<Localized<Reference>> => loader().then((module) => module.default)

/**
 * `Object.keys` widens to `string[]`, which would make the negotiated locale a
 * `string` and let any tag reach `translator`. The predicate re-establishes what
 * the record already knows — its own keys — without a cast.
 */
const localesOf = <Locale extends string>(
  dictionaries: Record<Locale, unknown>
): Locale[] =>
  Object.keys(dictionaries).filter((key): key is Locale => key in dictionaries)
