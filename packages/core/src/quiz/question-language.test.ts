import { describe, expect, it } from 'vitest'

import { LOCALES } from '@taverla/protocol/locale'

import { questionLanguageFor } from './question-language'

describe('questionLanguageFor', () => {
  /**
   * A tripwire as much as an assertion. It holds while every locale has a bank
   * behind it, and the day one ships without, it goes red on that locale — which
   * is the moment somebody has to decide what a host reading it should be dealt,
   * rather than discovering it as an empty draw in front of a room.
   */
  it('[question-language] draws in the language the host is reading', () => {
    for (const locale of LOCALES) {
      expect(questionLanguageFor(locale)).toBe(locale)
    }
  })
})
