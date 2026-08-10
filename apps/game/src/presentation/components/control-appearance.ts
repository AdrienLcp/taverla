import type { ClassNameOrFunction } from 'react-aria-components'

import { composeClassName } from './compose-class-name'

export type ControlSize = 'small' | 'medium' | 'large'

export type ControlVariant = 'filled' | 'outlined' | 'ghost'

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
   * Visual weight (default: `'filled'`):
   * - `'filled'` — the accent action, one per screen
   * - `'outlined'` — a secondary action of equal standing
   * - `'ghost'` — a tertiary action that should not compete
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
