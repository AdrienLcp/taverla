/**
 * Fisher-Yates, over a copy. Every game that offers four candidates needs the
 * order to carry nothing: the answer sitting third every round is a pattern a
 * room finds within an evening.
 */
export const shuffled = <TItem>(items: readonly TItem[]): TItem[] => {
  const copy = [...items]

  for (let index = copy.length - 1; index > 0; index--) {
    const swap = Math.floor(Math.random() * (index + 1))
    const held = copy[index]
    const other = copy[swap]

    if (held !== undefined && other !== undefined) {
      copy[index] = other
      copy[swap] = held
    }
  }

  return copy
}
