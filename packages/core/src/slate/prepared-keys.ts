/**
 * The slate's answer key with one prepared entry changed, by item index, `''`
 * clearing it. The list keeps no trailing gap, so a key cleared at the end
 * shortens it.
 */
export const withPreparedKey = ({
  itemIndex,
  key,
  keys
}: {
  itemIndex: number
  key: string
  keys: readonly (string | null)[]
}): (string | null)[] => {
  const next = Array.from(
    { length: Math.max(keys.length, itemIndex + 1) },
    (_, index) =>
      index === itemIndex ? key.trim() || null : (keys[index] ?? null)
  )
  const lastKept = next.findLastIndex((entry) => entry !== null)

  return next.slice(0, lastKept + 1)
}
