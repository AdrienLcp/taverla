import type React from 'react'

import './spinner.sass'

/**
 * Decorative on purpose. Every place this appears already announces its own
 * state — a react-aria `Button` announces `isPending` by itself — so a second
 * live region would say the same thing twice. It paints itself in
 * `--on-control` when a control provides one, and in `currentColor` otherwise.
 */
export const Spinner: React.FC = () => (
  <span aria-hidden='true' className='spinner' />
)
