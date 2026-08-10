import { useState } from 'react'
import { useNavigate } from 'react-router'

import { createRoom } from '@/infrastructure/api/taverla-api'
import { hostPathFor } from '@/infrastructure/router/navigation'
import { Button } from '@/presentation/components/button'
import { useTranslate } from '@/presentation/i18n/i18n-provider'
import {
  apiErrorKey,
  type TranslationKey
} from '@/presentation/i18n/translation'

import './blindtest-home-page.sass'

/**
 * The game's own front door. Creating a room lives here rather than on the
 * shelf because a room is opened *for* a game — which is true today even
 * though the room does not carry which one, and stays true when it does.
 */
export const BlindTestHomePage = () => {
  const navigate = useNavigate()
  const translate = useTranslate()
  const [error, setError] = useState<TranslationKey | null>(null)
  const [isCreating, setIsCreating] = useState(false)

  const startHosting = async (): Promise<void> => {
    setIsCreating(true)
    setError(null)

    const created = await createRoom()

    setIsCreating(false)

    if (created.status === 'failure') {
      setError(apiErrorKey(created.error))

      return
    }

    await navigate(hostPathFor(created.data.code))
  }

  return (
    <main className='blindtest-home-page'>
      <header>
        <p className='wordmark'>{translate('blindtest.name')}</p>
        <h1>{translate('blindtest.tagline')}</h1>
      </header>

      <p className='pitch'>{translate('blindtest.home.description')}</p>

      <div className='start'>
        <Button
          isPending={isCreating}
          onPress={() => {
            void startHosting()
          }}
          size='large'
        >
          {translate('join.host.action')}
        </Button>
        <p className='aside'>{translate('join.host.description')}</p>
      </div>

      {error !== null && (
        <p className='error' role='alert'>
          {translate(error)}
        </p>
      )}
    </main>
  )
}
