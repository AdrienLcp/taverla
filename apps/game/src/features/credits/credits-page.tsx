import { homePathFor } from '@/infrastructure/router/navigation'
import { Link } from '@/presentation/components/link'
import { TextLink } from '@/presentation/components/text-link'
import { PAGE_HEADS } from '@/presentation/head/document-head'
import { DocumentTitle } from '@/presentation/head/document-title'
import { useI18n, useTranslate } from '@/presentation/i18n/i18n-provider'
import type { PlainTranslationKey } from '@/presentation/i18n/translation'

import './credits-page.sass'

/**
 * The licences the bundled banks are published under, which are not all the
 * same one — Mintaka asks for attribution and nothing more, and Vikidia is a
 * wiki that never moved off 3.0. Naming one for all of them would state the
 * wrong terms for two of the five, which is the one thing a credits page must
 * not do.
 */
const LICENCES = {
  ccBy4: {
    name: 'CC BY 4.0',
    url: 'https://creativecommons.org/licenses/by/4.0/'
  },
  ccBySa3: {
    name: 'CC BY-SA 3.0',
    url: 'https://creativecommons.org/licenses/by-sa/3.0/'
  },
  ccBySa4: {
    name: 'CC BY-SA 4.0',
    url: 'https://creativecommons.org/licenses/by-sa/4.0/'
  }
} as const

type Licence = (typeof LICENCES)[keyof typeof LICENCES]

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
  licence: Licence
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
    licence: LICENCES.ccBySa4,
    source: 'OpenQuizzDB',
    sourceUrl: 'https://www.openquizzdb.org'
  },
  {
    author: 'jvonrad',
    changes: 'credits.polyfact',
    licence: LICENCES.ccBySa4,
    source: 'PolyFact',
    sourceUrl: 'https://huggingface.co/datasets/jvonrad/PolyFact'
  },
  {
    author: 'Amazon Science',
    changes: 'credits.mintaka',
    licence: LICENCES.ccBy4,
    source: 'Mintaka',
    sourceUrl: 'https://github.com/amazon-science/mintaka'
  },
  {
    author: 'Vikidia contributors',
    changes: 'credits.vikidia',
    licence: LICENCES.ccBySa3,
    source: 'Vikidia',
    sourceUrl: 'https://fr.vikidia.org/wiki/Vikidia:Quiz'
  },
  {
    author: 'PIXELTAIL GAMES LLC',
    changes: 'credits.opentdb',
    licence: LICENCES.ccBySa4,
    source: 'Open Trivia DB',
    sourceUrl: 'https://opentdb.com'
  }
]

export const CreditsPage: React.FC = () => {
  const { locale } = useI18n()
  const translate = useTranslate()

  return (
    <main className='credits-page'>
      <DocumentTitle>{PAGE_HEADS[locale].credits.title}</DocumentTitle>
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
              <TextLink href={credit.licence.url} target='_blank'>
                {credit.licence.name}
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
