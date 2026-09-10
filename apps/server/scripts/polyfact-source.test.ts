import { describe, expect, it } from 'vitest'

import { withDecoysSpread } from './polyfact-source'

/**
 * The one rule in the ingestion that cannot be checked from the built bank. Its
 * neighbours — no decoy the matcher grades right, no decoy carrying a subject —
 * leave their evidence in `question-bank.json` and are guarded there. An era
 * does not: the row keeps the verdict and no year is banked, deliberately, so
 * the rule is asked here instead.
 */

type Options = [string, string, string, string]

const rowOf = ({ id, options }: { id: string; options: Options }) => ({
  answer_text: options[0],
  fact_id: `Q${id}|P50|Q${id}0`,
  option_a: options[0],
  option_b: options[1],
  option_c: options[2],
  option_d: options[3],
  option_ids: options.map((_, index) => `Q${id}${index}`),
  question: `Qui a écrit l'œuvre ${id} ?`,
  relation: 'author'
})

const candidateOf = ({ id, options }: { id: string; options: Options }) => ({
  answer: options[0],
  category: 'arts' as const,
  decoys: [options[1], options[2], options[3]] as [string, string, string],
  isWellKnown: true,
  row: rowOf({ id, options })
})

/** Six writers of the same century, so a swap always has somewhere to land. */
const MODERNS = [
  'Ada Moderne',
  'Bruno Moderne',
  'Carla Moderne',
  'Dino Moderne',
  'Elsa Moderne',
  'Félix Moderne'
]

const YEARS_OF_MODERNS = new Map(MODERNS.map((name) => [name, 1950]))

describe('withDecoysSpread', () => {
  it('[bank] swaps out a decoy born an era from its own answer', () => {
    const candidates = [
      candidateOf({
        id: '1',
        options: [
          MODERNS[0] ?? '',
          'Pline le Jeune',
          MODERNS[1] ?? '',
          MODERNS[2] ?? ''
        ]
      }),
      candidateOf({
        id: '2',
        options: [
          MODERNS[3] ?? '',
          MODERNS[4] ?? '',
          MODERNS[5] ?? '',
          MODERNS[1] ?? ''
        ]
      })
    ]

    const [spread] = withDecoysSpread({
      candidates,
      years: new Map([...YEARS_OF_MODERNS, ['Pline le Jeune', 61]])
    })

    expect(spread?.decoys).not.toContain('Pline le Jeune')
    expect(spread?.decoys.every((decoy) => MODERNS.includes(decoy))).toBe(true)
  })

  /**
   * The trap the first build fell into, and it only bites on the **replacement**:
   * an entity Wikidata holds no birth date for is never *known* to be an era
   * away and has never been used, so ranking on the absence of a fault put it
   * first every time — the *United States Holocaust Memorial Museum* was drawn
   * in as a possible author of a La Fontaine fable. A missing year loses to a
   * known one that fits.
   *
   * An undated decoy upstream put there itself is left alone, which is the
   * other half of the same rule: nothing here can say whether it is wrong.
   */
  it('[bank] fills a swapped slot with a dated candidate rather than an undated one', () => {
    const candidates = [
      candidateOf({
        id: '1',
        options: [
          MODERNS[0] ?? '',
          'Sophocle',
          MODERNS[1] ?? '',
          MODERNS[2] ?? ''
        ]
      }),
      candidateOf({
        id: '2',
        options: [
          MODERNS[3] ?? '',
          'Musée sans date',
          MODERNS[4] ?? '',
          MODERNS[5] ?? ''
        ]
      })
    ]

    const [spread] = withDecoysSpread({
      candidates,
      years: new Map([...YEARS_OF_MODERNS, ['Sophocle', -496]])
    })

    expect(spread?.decoys).not.toContain('Sophocle')
    expect(spread?.decoys).not.toContain('Musée sans date')
    expect(spread?.decoys.every((decoy) => MODERNS.includes(decoy))).toBe(true)
  })

  it('[bank] leaves a decoy of the answer’s own era where upstream put it', () => {
    const candidates = [
      candidateOf({
        id: '1',
        options: [
          MODERNS[0] ?? '',
          MODERNS[1] ?? '',
          MODERNS[2] ?? '',
          MODERNS[3] ?? ''
        ]
      })
    ]

    const [spread] = withDecoysSpread({
      candidates,
      years: YEARS_OF_MODERNS
    })

    expect(spread?.decoys).toEqual([MODERNS[1], MODERNS[2], MODERNS[3]])
  })
})
