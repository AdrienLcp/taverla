import { type FormEvent, useState } from 'react'
import { Form } from 'react-aria-components'
import { useNavigate } from 'react-router'

import { ROOM_CODE_LENGTH } from '@taverla/protocol/identifiers'

import { parseRoomCodeInput } from '@taverla/core/room/room-code'

import { invitePathFor } from '@/infrastructure/router/navigation'
import { Button } from '@/presentation/components/button'
import { Disclosure } from '@/presentation/components/disclosure'
import { TextField } from '@/presentation/components/text-field'
import { useTranslate } from '@/presentation/i18n/i18n-provider'
import type { PlainTranslationKey } from '@/presentation/i18n/translation'

/** Held as a key rather than a rendered string, so it follows a locale switch. */
type FieldError =
  | { key: PlainTranslationKey }
  | {
      key: 'join.roomCode.unsupportedCharacters'
      values: { characters: string }
    }
  | { key: 'join.roomCode.wrongLength'; values: { length: number } }

/**
 * The third door to the poster, and the only one that starts from a code rather
 * than from a room somebody is already in: the laptop wired to the projector at
 * an event is rarely the laptop hosting.
 *
 * **Typing a code here grants nothing** — no seat, no console, no token, no
 * frame sent. That is the whole difference between this field and the one the
 * backlog refuses on the same page, which would hand over the room to whoever
 * read the code off the wall. So it does not collapse into the join field
 * either: that one seats you, this one shows what the table is already showing.
 *
 * It asks the server nothing. Whether the code opens a room is the poster's own
 * question, answered on the screen that would be projecting it — a front door
 * that waited on a request to fold out a rarely-used panel would be spending
 * everybody's first second on somebody else's evening.
 *
 * Folded, because it is a rare job beside the two the page is for. A third
 * field at the weight of *open a table* and *pull up a chair* is a fork every
 * visitor has to read past to reach the two that are theirs.
 */
export const ProjectWithCode = () => {
  const navigate = useNavigate()
  const translate = useTranslate()
  const [code, setCode] = useState('')
  const [codeError, setCodeError] = useState<FieldError | null>(null)

  const project = async (event: FormEvent): Promise<void> => {
    event.preventDefault()

    const parsed = parseRoomCodeInput(code)

    if (parsed.status === 'unsupported_characters') {
      setCodeError({
        key: 'join.roomCode.unsupportedCharacters',
        values: { characters: parsed.characters.join(', ') }
      })

      return
    }

    if (parsed.status === 'wrong_length') {
      setCodeError({
        key: 'join.roomCode.wrongLength',
        values: { length: ROOM_CODE_LENGTH }
      })

      return
    }

    await navigate(invitePathFor(parsed.code))
  }

  return (
    <Disclosure
      className='project-with-code'
      label={translate('invite.door.label')}
      summary={translate('invite.door.summary')}
    >
      <Form
        onSubmit={(event) => {
          void project(event)
        }}
      >
        <TextField
          autoCapitalize='characters'
          autoComplete='off'
          description={translate('invite.door.description')}
          errorMessage={
            codeError === null
              ? undefined
              : 'values' in codeError
                ? translate(codeError.key, codeError.values)
                : translate(codeError.key)
          }
          isInvalid={codeError !== null}
          label={translate('join.roomCode.label')}
          maxLength={ROOM_CODE_LENGTH + 2}
          name='roomCode'
          onChange={(next) => {
            setCode(next)
            setCodeError(null)
          }}
          placeholder={'•'.repeat(ROOM_CODE_LENGTH)}
          value={code}
        />
        <Button type='submit' variant='outlined'>
          {translate('invite.door.action')}
        </Button>
      </Form>
    </Disclosure>
  )
}
