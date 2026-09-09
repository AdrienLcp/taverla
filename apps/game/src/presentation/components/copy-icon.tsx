import type React from 'react'

import { Icon } from './icon'

/** Two sheets, offset — the same object twice, which is what copying makes. */
export const CopyIcon: React.FC = () => (
  <Icon>
    <path d='M8 8h12v12H8z' />
    <path d='M16 4H4v12h2' />
  </Icon>
)
