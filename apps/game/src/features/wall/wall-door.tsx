import type React from 'react'

import { paths } from '@/infrastructure/router/navigation'
import { Disclosure } from '@/presentation/components/disclosure'
import { ScreenIcon } from '@/presentation/components/icons'
import { Link } from '@/presentation/components/link'
import { useTranslate } from '@/presentation/i18n/i18n-provider'

/**
 * The front door for a screen that will show a table rather than run or join
 * one: a television, a projector, a laptop turned to face the sofa. It grants
 * nothing on its own — the screen it opens shows a code, and only the device
 * holding the table's token can answer it.
 *
 * Folded, because it is a rare job beside the two the page is for. A third
 * door at the weight of *open a table* and *join* is a fork every
 * visitor has to read past to reach the two that are theirs.
 */
export const WallDoor: React.FC<{
  /** Set while the page is already opening a room, which is where it is about to go. */
  isDisabled: boolean
}> = ({ isDisabled }) => {
  const translate = useTranslate()

  return (
    <Disclosure
      className='wall-door'
      icon={<ScreenIcon />}
      label={translate('wall.door.label')}
      summary={translate('wall.door.summary')}
    >
      <p className='description'>{translate('wall.door.description')}</p>
      <Link href={paths.wallPairing} isDisabled={isDisabled} variant='outlined'>
        {translate('wall.door.action')}
      </Link>
    </Disclosure>
  )
}
