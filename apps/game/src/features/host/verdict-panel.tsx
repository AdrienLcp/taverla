import type React from 'react'

import type { ActiveBuzz, HostRoundContent } from '@taverla/protocol/room'
import type { Verdict } from '@taverla/protocol/scoring'

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
    key: 'host.verdict.right',
    tone: 'win',
    verdict: { isCorrect: true, kind: 'single' }
  },
  {
    key: 'host.verdict.wrong',
    tone: 'miss',
    verdict: { isCorrect: false, kind: 'single' }
  }
]

type VerdictPanelProps = {
  /** Who holds the floor, and how long they have left of it. */
  buzz: ActiveBuzz
  clock: ClockEstimate | null
  /**
   * The round in the vocabulary of the game asking it, which decides both what
   * is printed here and whether the verdict has halves.
   */
  content: HostRoundContent
  /** Who is holding the buzzer. The host needs the name to look up at the room. */
  nickname: string
  onJudge: (verdict: Verdict) => void
}

export const VerdictPanel: React.FC<VerdictPanelProps> = ({
  buzz,
  clock,
  content,
  nickname,
  onJudge
}) => {
  const translate = useTranslate()
  const choices =
    verdictKindFor(content.kind) === 'halves' ? HALVES_CHOICES : SINGLE_CHOICES

  return (
    <section className='verdict-panel'>
      <h2>{translate('buzz.theyBuzzed', { nickname })}</h2>
      <FloorClock buzz={buzz} clock={clock} />

      <Answer content={content} />

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

/**
 * The answer, shown here and at the reveal and nowhere else — so the host screen
 * can face the room for the rest of the round. A game whose question the room
 * owns has nothing to print, and neither has a host who took a seat: the server
 * stops sending them what they are meant to be guessing.
 */
const Answer = ({ content }: { content: HostRoundContent }) => {
  switch (content.kind) {
    case 'blindtest':
      return content.track === null ? null : (
        <div className='answer'>
          <p className='title'>{content.track.title}</p>
          <p className='artist'>{content.track.artist}</p>
        </div>
      )
    case 'buzzer':
      return null
    case 'quiz':
      return content.question === null ? null : (
        <div className='answer'>
          <p className='title'>{content.question.answer}</p>
        </div>
      )
  }
}
