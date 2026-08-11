import type React from 'react'

import type { GameKind } from '@taverla/protocol/game'
import type { ActiveBuzz } from '@taverla/protocol/room'
import type { Verdict } from '@taverla/protocol/scoring'
import type { HostTrack } from '@taverla/protocol/track'

import { verdictKindFor } from '@taverla/core/scoring/verdict'
import type { ClockEstimate } from '@taverla/core/time/clock-sync'

import { Button } from '@/presentation/components/button'
import { FloorClock } from '@/presentation/components/floor-clock'
import { useTranslate } from '@/presentation/i18n/i18n-provider'
import type { PlainTranslationKey } from '@/presentation/i18n/translation'

import './verdict-panel.sass'

type VerdictChoice = {
  key: PlainTranslationKey
  tone: 'win' | 'half' | 'miss'
  verdict: Verdict
}

/**
 * One tap per outcome rather than two toggles and a confirm. The host is reading
 * a name off a screen while someone shouts an answer across the room, and every
 * extra tap is time the other players spend watching them fiddle.
 */
const HALVES_CHOICES: readonly VerdictChoice[] = [
  {
    key: 'blindtest.verdict.both',
    tone: 'win',
    verdict: { artistCorrect: true, kind: 'halves', titleCorrect: true }
  },
  {
    key: 'blindtest.verdict.titleOnly',
    tone: 'half',
    verdict: { artistCorrect: false, kind: 'halves', titleCorrect: true }
  },
  {
    key: 'blindtest.verdict.artistOnly',
    tone: 'half',
    verdict: { artistCorrect: true, kind: 'halves', titleCorrect: false }
  },
  {
    key: 'blindtest.verdict.miss',
    tone: 'miss',
    verdict: { artistCorrect: false, kind: 'halves', titleCorrect: false }
  }
]

const SINGLE_CHOICES: readonly VerdictChoice[] = [
  {
    key: 'buzzer.verdict.right',
    tone: 'win',
    verdict: { isCorrect: true, kind: 'single' }
  },
  {
    key: 'buzzer.verdict.wrong',
    tone: 'miss',
    verdict: { isCorrect: false, kind: 'single' }
  }
]

type VerdictPanelProps = {
  /** Who holds the floor, and how long they have left of it. */
  buzz: ActiveBuzz
  clock: ClockEstimate | null
  /** Which game is being judged — two halves, or one claim. */
  game: GameKind
  /** Who is holding the buzzer. The host needs the name to look up at the room. */
  nickname: string
  onJudge: (verdict: Verdict) => void
  /**
   * The answer, shown here and at the reveal and nowhere else — so the host
   * screen can face the room for the rest of the round. `null` in a game whose
   * question the room owns, where the host is already holding it.
   */
  track: HostTrack | null
}

export const VerdictPanel: React.FC<VerdictPanelProps> = ({
  buzz,
  clock,
  game,
  nickname,
  onJudge,
  track
}) => {
  const translate = useTranslate()
  const choices =
    verdictKindFor(game) === 'halves' ? HALVES_CHOICES : SINGLE_CHOICES

  return (
    <section className='verdict-panel'>
      <h2>{translate('buzz.theyBuzzed', { nickname })}</h2>
      <FloorClock buzz={buzz} clock={clock} />

      {track !== null && (
        <div className='answer'>
          <p className='title'>{track.title}</p>
          <p className='artist'>{track.artist}</p>
        </div>
      )}

      <div className='choices'>
        {choices.map((choice) => (
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
