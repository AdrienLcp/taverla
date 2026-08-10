import type React from 'react'
import { useState } from 'react'
import { Form } from 'react-aria-components'

import { Button } from '@/presentation/components/button'
import { TextField } from '@/presentation/components/text-field'
import { useTranslate } from '@/presentation/i18n/i18n-provider'

import './host-seat.sass'

type HostSeatProps = {
  /** Reopens the socket with a name on it, which is what takes the seat. */
  onTakeSeat: (nickname: string) => void
  takenAs: string | null
}

/**
 * The phone in the middle of the table is the speaker and a player at once.
 * Offered only where it is coherent — a buzzer round needs a judge, and a judge
 * who is also answering is not one — and the caller decides that.
 *
 * Taking it withholds the track from this screen's own payload until the
 * reveal, so the seat costs the host what it costs everyone else.
 */
export const HostSeat: React.FC<HostSeatProps> = ({ onTakeSeat, takenAs }) => {
  const translate = useTranslate()
  const [nickname, setNickname] = useState('')

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
          description={translate('host.seat.description')}
          label={translate('host.seat.label')}
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
