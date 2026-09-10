import { homePathFor } from '@/infrastructure/router/navigation'
import { Link } from '@/presentation/components/link'
import { TextLink } from '@/presentation/components/text-link'
import { useIndexedPageTitle } from '@/presentation/head/use-document-title'
import { useI18n, useTranslate } from '@/presentation/i18n/i18n-provider'
import type { PlainTranslationKey } from '@/presentation/i18n/translation'

import './credits-page.sass'

const LICENCE = {
  name: 'CC BY-SA 4.0',
  url: 'https://creativecommons.org/licenses/by-sa/4.0/'
}

const REPOSITORY_URL = 'https://github.com/AdrienLcp/taverla'

type QuestionCredit = {
  author: string
  /**
   * What the ingestion did to this bank. CC BY-SA asks for an indication that
   * the material was modified, and it is the one item on that list owed
   * unconditionally — the rest is "retain what the licensor supplied". It is per
   * bank because the two were reshaped differently, and it is a key rather than
   * a sentence because it travels in this table.
   */
  changes: PlainTranslationKey
  source: string
  sourceUrl: string
}

/**
 * The credit for the bundled question banks. It lives on a page of its own
 * rather than in the menu because the licence's own list is longer than a
 * popover can hold without becoming the thing you read while trying to switch
 * language — and CC BY-SA 4.0 §3(a)(2) names the link as a reasonable way to
 * satisfy it.
 *
 * One entry per source rather than per language, because nothing here is
 * translated from anything — each bank is written in its own language, and the
 * French half is now written by two people who never met. All of them are named
 * whatever the room is playing: the credit is for the data that shipped, not
 * for the rows a given evening happened to draw.
 *
 * It mirrors the `attributions` header of `question-bank.json`, which is the
 * machine-readable copy that travels with the data itself. The two are separate
 * because that file is the server's and this is the app's; keep them in step.
 */
const QUESTION_CREDITS: QuestionCredit[] = [
  {
    author: 'Philippe Bresoux',
    changes: 'credits.openquizzdb',
    source: 'OpenQuizzDB',
    sourceUrl: 'https://www.openquizzdb.org'
  },
  {
    author: 'jvonrad',
    changes: 'credits.polyfact',
    source: 'PolyFact',
    sourceUrl: 'https://huggingface.co/datasets/jvonrad/PolyFact'
  },
  {
    author: 'Amazon Science',
    changes: 'credits.mintaka',
    source: 'Mintaka',
    sourceUrl: 'https://github.com/amazon-science/mintaka'
  },
  {
    author: 'PIXELTAIL GAMES LLC',
    changes: 'credits.opentdb',
    source: 'Open Trivia DB',
    sourceUrl: 'https://opentdb.com'
  }
]

export const CreditsPage: React.FC = () => {
  const { locale } = useI18n()

  useIndexedPageTitle('credits')

  const translate = useTranslate()

  return (
    <main className='credits-page'>
      <header>
        <h1>{translate('credits.title')}</h1>
      </header>

      <ul className='banks'>
        {QUESTION_CREDITS.map((credit) => (
          <li key={credit.source}>
            <p className='source'>
              <TextLink href={credit.sourceUrl} target='_blank'>
                {credit.source}
              </TextLink>
            </p>
            <p className='author'>{credit.author}</p>
            <p className='licence'>
              <TextLink href={LICENCE.url} target='_blank'>
                {LICENCE.name}
              </TextLink>
            </p>

            <p className='what-changed'>{translate('credits.whatChanged')}</p>
            <p className='changes'>{translate(credit.changes)}</p>
          </li>
        ))}
      </ul>

      <p className='share-alike'>
        {translate('credits.shareAlike')}{' '}
        <TextLink href={REPOSITORY_URL} target='_blank'>
          {REPOSITORY_URL.replace('https://', '')}
        </TextLink>
      </p>

      <Link href={homePathFor(locale)} variant='outlined'>
        {translate('navigation.back')}
      </Link>
    </main>
  )
}
