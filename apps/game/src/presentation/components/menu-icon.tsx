import type React from 'react'

import { Icon } from './icon'

export const MenuIcon: React.FC = () => (
  <Icon className='menu-icon' strokeLinecap='round' strokeWidth={2.6}>
    <path d='M4 7h16M4 12h16M4 17h16' />
  </Icon>
)
