export const THEME_PREFERENCES = ['system', 'light', 'dark'] as const

export type ThemePreference = (typeof THEME_PREFERENCES)[number]

export const isThemePreference = (value: string): value is ThemePreference =>
  THEME_PREFERENCES.some((preference) => preference === value)

/**
 * The `media` a `theme-color` tag must carry, given what the room chose.
 *
 * On a phone the browser paints its address bar and its task-switcher card from
 * these, so they are part of the first viewport. They ship scoped to the system
 * preference, which is right until somebody overrides it — and then the chrome
 * keeps the palette the page has just left, for the rest of the session.
 *
 * `'system'` puts the query back rather than choosing a colour, so the tag goes
 * on following the operating system. The tag says which scheme it is and this
 * says what to do about it, which is what lets the plain script in
 * `index.html` — the head has to answer before any of this is downloaded —
 * reach the same answer without either side knowing the other's colours.
 */
export const themeColorMediaFor = ({
  preference,
  scheme
}: {
  preference: ThemePreference
  scheme: Exclude<ThemePreference, 'system'>
}): string => {
  if (preference === 'system') {
    return `(prefers-color-scheme: ${scheme})`
  }

  return scheme === preference ? 'all' : 'not all'
}
