import type React from 'react'

import type { ActiveBuzz, HostRoundContent } from '@taverla/protocol/room'
import type { Verdict } from '@taverla/protocol/scoring'

import { cueOf, whatTheRoomNames } from '@taverla/core/blindtest/typed-answer'
import { verdictKindFor } from '@taverla/core/scoring/verdict'
import type { ClockEstimate } from '@taverla/core/time/clock-sync'

import { Button } from '@/presentation/components/button'
import { FloorClock } from '@/presentation/components/floor-clock'
import { useTranslate } from '@/presentation/i18n/i18n-provider'
import type { PlainTranslationKey } from '@/presentation/i18n/translation'

import './verdict-panel.sass'

type VerdictChoice = {
  /**
   * What this outcome is called where the halves are a film and its composer,
   * and `null` for the two that name neither half.
   */
  filmKey: PlainTranslationKey | null
  key: PlainTranslationKey
  tone: 'win' | 'half' | 'miss'
  verdict: Verdict
}

/**
 * One press per outcome rather than two toggles and a confirm. The host is
 * reading a name off a screen while someone shouts an answer across the room,
 * and every extra press is time the other players spend watching them fiddle.
 */
const HALVES_CHOICES: readonly VerdictChoice[] = [
  {
    filmKey: 'blindtest.verdict.bothFilm',
    key: 'blindtest.verdict.both',
    tone: 'win',
    verdict: { artistCorrect: true, kind: 'halves', titleCorrect: true }
  },
  {
    filmKey: 'blindtest.verdict.filmOnly',
    key: 'blindtest.verdict.titleOnly',
    tone: 'half',
    verdict: { artistCorrect: false, kind: 'halves', titleCorrect: true }
  },
  {
    filmKey: 'blindtest.verdict.composerOnly',
    key: 'blindtest.verdict.artistOnly',
    tone: 'half',
    verdict: { artistCorrect: true, kind: 'halves', titleCorrect: false }
  },
  {
    filmKey: null,
    key: 'blindtest.verdict.miss',
    tone: 'miss',
    verdict: { artistCorrect: false, kind: 'halves', titleCorrect: false }
  }
]

const SINGLE_CHOICES: readonly VerdictChoice[] = [
  {
    filmKey: null,
    key: 'host.verdict.right',
    tone: 'win',
    verdict: { isCorrect: true, kind: 'single' }
  },
  {
    filmKey: null,
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
  const asksForAFilm =
    content.kind === 'blindtest' && (content.track?.film ?? null) !== null

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
            {translate(
              asksForAFilm && choice.filmKey !== null
                ? choice.filmKey
                : choice.key
            )}
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
const Answer: React.FC<{ content: HostRoundContent }> = ({ content }) => {
  switch (content.kind) {
    case 'blindtest':
      return content.track === null ? null : (
        <div className='answer'>
          <p className='title'>{whatTheRoomNames(content.track)}</p>
          <p className='artist'>{content.track.artist}</p>
          {cueOf(content.track) !== null && (
            <p className='note'>{cueOf(content.track)}</p>
          )}
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
