import { createContext, use } from 'react'

/**
 * Returns `[Context, useSafe, useOptional]`. `useSafe` throws when the provider
 * is missing, which turns a whole class of `undefined` bugs into one loud error
 * naming the provider that should have been mounted.
 */
export const createSafeContext = <TValue>(name: string) => {
  const Context = createContext<TValue | undefined>(undefined)

  const useSafeContext = (): TValue => {
    const value = use(Context)

    if (value === undefined) {
      throw new Error(`${name} was read outside of its provider`)
    }

    return value
  }

  const useOptionalContext = (): TValue | undefined => use(Context)

  return [Context, useSafeContext, useOptionalContext] as const
}
