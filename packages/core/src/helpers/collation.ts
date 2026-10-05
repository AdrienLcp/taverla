/**
 * Fixed rather than the runtime's: the Worker, the host's laptop and a phone
 * set to another language must order the same names the same way, or the
 * wall and the phone disagree on who is fourth.
 */
const COLLATION_LOCALE = 'fr'

export const compareText = new Intl.Collator(COLLATION_LOCALE).compare
