import type { ClassNameOrFunction } from 'react-aria-components'

import { composeClassName } from './compose-class-name'

export type ControlSize = 'small' | 'medium' | 'large'

export type ControlVariant = 'filled' | 'outlined' | 'underlined'

/**
 * The look `Button` and `Link` share. They render different elements for
 * different reasons — one acts, one navigates — so neither wraps the other;
 * what they have in common is this vocabulary and the `control` mixin it names.
 */
export type ControlAppearance = {
  /**
   * Physical size (default: `'medium'`):
   * - `'small'` — an action beside something, never under it
   * - `'medium'` — the default control size
   * - `'large'` — meant to be hit with a thumb, or read across a room
   */
  size?: ControlSize
  /**
   * The material the control is made of (default: `'filled'`). All three name
   * what the eye sees rather than how important the action is — an importance
   * word among descriptive ones is a name that stops telling you what you will
   * get:
   * - `'filled'` — an ink block, the one action on the screen
   * - `'outlined'` — the field behind an ink edge, an action of equal standing
   * - `'underlined'` — no ground and no edge, a tertiary action that should not
   *   compete. Still a control: it keeps the box, the case and the size
   *
   * A link inside a sentence is none of these — see `TextLink`, which is not a
   * control at all.
   */
  variant?: ControlVariant
}

type ControlClassNameOptions<TRenderProps> = ControlAppearance & {
  className: ClassNameOrFunction<TRenderProps> | undefined
  rootClassName: string
}

export const controlClassName = <TRenderProps>({
  className,
  rootClassName,
  size = 'medium',
  variant = 'filled'
}: ControlClassNameOptions<TRenderProps>) =>
  composeClassName(className, rootClassName, variant, size)
