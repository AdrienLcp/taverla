import { createThemePreferenceStore } from '@adrienlcp/theme-preference'

/** Shared by the menu and by the Vite plugin that inlines the pre-paint script. */
export const themeStore = createThemePreferenceStore({
  storageKey: 'taverla:theme'
})
