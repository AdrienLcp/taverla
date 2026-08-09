export const THEME_PREFERENCES = ['system', 'light', 'dark'] as const

export type ThemePreference = (typeof THEME_PREFERENCES)[number]

export const isThemePreference = (value: string): value is ThemePreference =>
  THEME_PREFERENCES.some((preference) => preference === value)
