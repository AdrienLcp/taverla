import type React from 'react'

import type { Verdict } from '@taverla/protocol/scoring'
import type { HostTrack } from '@taverla/protocol/track'

import { Button } from '@/presentation/components/button'
import { useTranslate } from '@/presentation/i18n/i18n-provider'
import type { TranslationKey } from '@/presentation/i18n/translation'

import './verdict-panel.sass'

/**
 * One tap per outcome rather than two toggles and a confirm. The host is reading
 * a name off a screen while someone shouts an answer across the room, and every
 * extra tap is time the other players spend watching them fiddle.
 */
const CHOICES: readonly {
  key: TranslationKey
  tone: 'win' | 'half' | 'miss'
  verdict: Verdict
}[] = [
  {
    key: 'host.verdict.both',
    tone: 'win',
    verdict: { artistCorrect: true, titleCorrect: true }
  },
  {
    key: 'host.verdict.titleOnly',
    tone: 'half',
    verdict: { artistCorrect: false, titleCorrect: true }
  },
  {
    key: 'host.verdict.artistOnly',
    tone: 'half',
    verdict: { artistCorrect: true, titleCorrect: false }
  },
  {
    key: 'host.verdict.miss',
    tone: 'miss',
    verdict: { artistCorrect: false, titleCorrect: false }
  }
]

type VerdictPanelProps = {
  /** Who is holding the buzzer. The host needs the name to look up at the room. */
  nickname: string
  onJudge: (verdict: Verdict) => void
  /**
   * The answer, shown here and at the reveal and nowhere else — so the host
   * screen can face the room for the rest of the round.
   */
  track: HostTrack
}

export const VerdictPanel: React.FC<VerdictPanelProps> = ({
  nickname,
  onJudge,
  track
}) => {
  const translate = useTranslate()

  return (
    <section className='verdict-panel'>
      <h2>{translate('blindtest.theyBuzzed', { nickname })}</h2>

      <div className='answer'>
        <p className='title'>{track.title}</p>
        <p className='artist'>{track.artist}</p>
      </div>

      <div className='choices'>
        {CHOICES.map((choice) => (
          <Button
            className={`choice ${choice.tone}`}
            key={choice.key}
            onPress={() => {
              onJudge(choice.verdict)
            }}
            size='large'
            variant={choice.tone === 'miss' ? 'outlined' : 'filled'}
          >
            {translate(choice.key)}
          </Button>
        ))}
      </div>
    </section>
  )
}
