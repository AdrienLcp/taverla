/** What reached the root error boundary, kept for whoever opens the console next. */
export const reportUnrenderedError = (error: unknown): void => {
  console.error('The app hit an error it could not render through', error)
}
