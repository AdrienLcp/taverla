/** Resolves after the given delay, for a script pacing its requests. */
export const wait = async (milliseconds: number): Promise<void> =>
  new Promise((resolve) => setTimeout(resolve, milliseconds))
