/**
 * The locale to open on, out of what the caller asked for. Callers hand out
 * BCP-47 tags carrying a region the app may have no dictionary for, so each tag
 * is tried whole, then with one subtag dropped at a time — and at every one of
 * those steps, a supported locale that *extends* the candidate will do.
 *
 * Both directions are needed and neither is enough alone. Walking up only, a
 * plain `fr` finds nothing in an app shipping `fr-FR` and `fr-CA`, and
 * answering English to someone asking for French is worse than answering the
 * wrong French. Walking down only, `fr-CA` misses a plain `fr`.
 *
 * Order across tags matters more than presence: a device listing
 * `de-DE, fr-FR, en` wants French, not the first supported language that
 * happens to appear anywhere in the list — so one tag is exhausted in both
 * directions before the next is looked at.
 *
 * It reads nothing on its own — not `navigator.languages`, not
 * `Accept-Language`, not a cookie. Where the preferences come from is the
 * caller's business, which is what lets the same function serve a browser
 * booting and a server rendering a mail for a stored account setting.
 */
export const negotiateLocale = <Locale extends string>(
  preferred: readonly string[],
  { fallback, supported }: { fallback: Locale; supported: readonly Locale[] }
): Locale => {
  const byTag = new Map(
    supported.map((locale) => [locale.toLowerCase(), locale])
  )

  for (const tag of preferred) {
    for (const candidate of tagAndParentTags(tag.toLowerCase())) {
      const exact = byTag.get(candidate)

      if (exact !== undefined) {
        return exact
      }

      // Declaration order decides between two regions of one language: an app
      // listing `fr-FR` before `fr-CA` answers a bare `fr` with `fr-FR`.
      const extending = supported.find((locale) =>
        locale.toLowerCase().startsWith(`${candidate}-`)
      )

      if (extending !== undefined) {
        return extending
      }
    }
  }

  return fallback
}

const tagAndParentTags = (tag: string): string[] => {
  const tags: string[] = []
  let current = tag

  while (current !== '') {
    tags.push(current)
    current = current.replace(/-?[^-]+$/, '')
  }

  return tags
}
