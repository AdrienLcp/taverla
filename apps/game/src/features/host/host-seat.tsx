import type React from 'react'
import { useState } from 'react'
import { Form } from 'react-aria-components'

import { NICKNAME_MAX_LENGTH } from '@taverla/protocol/identifiers'

import { readStoredNickname } from '@/infrastructure/storage/preferences-storage'
import { Button } from '@/presentation/components/button'
import { TextField } from '@/presentation/components/text-field'
import { useTranslate } from '@/presentation/i18n/i18n-provider'
import type { PlainTranslationKey } from '@/presentation/i18n/translation'

import './host-seat.sass'

type HostSeatProps = {
  /** What the seat costs on this game, which the caller knows and this does not. */
  cost: PlainTranslationKey
  /** Reopens the socket with a name on it, which is what takes the seat. */
  onTakeSeat: (nickname: string) => void
  takenAs: string | null
}

/**
 * The screen in the middle of the table is the speaker and a player at once.
 * Offered only where it is coherent — a judged round needs a judge, and a judge
 * who is also answering is not one — and the caller decides that.
 *
 * Taking it withholds the answer from this screen's own payload until the
 * reveal, so the seat costs the host what it costs everyone else.
 */
export const HostSeat: React.FC<HostSeatProps> = ({
  cost,
  onTakeSeat,
  takenAs
}) => {
  const translate = useTranslate()
  // The same name a phone's join form fills itself in with. It is the device
  // saying what it likes being called, and a console is a device like any other.
  const [nickname, setNickname] = useState(() => readStoredNickname() ?? '')

  if (takenAs !== null) {
    return (
      <p className='host-seat taken'>
        {translate('host.seat.taken', { nickname: takenAs })}
      </p>
    )
  }

  return (
    <section className='host-seat'>
      <Form
        onSubmit={(event) => {
          event.preventDefault()
          onTakeSeat(nickname.trim())
        }}
      >
        <TextField
          autoComplete='off'
          description={translate(cost)}
          label={translate('host.seat.label')}
          maxLength={NICKNAME_MAX_LENGTH}
          onChange={setNickname}
          value={nickname}
        />
        <Button
          isDisabled={nickname.trim() === ''}
          type='submit'
          variant='outlined'
        >
          {translate('host.seat.action')}
        </Button>
      </Form>
    </section>
  )
}
