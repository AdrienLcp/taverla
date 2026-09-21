import { defineTranslation } from './define-translation'
import { defineDictionary } from './dictionary'

/**
 * A dictionary in a module of its own, `export default`ed, so that a test can
 * register `() => import('./dictionary-de.fixture')` and prove the shape a real
 * bundler split produces — not a promise a test made up.
 *
 * It declares no type of its own on purpose: what holds it to the reference is
 * the registry it is handed to, across a module boundary. `defineDictionary` is
 * what keeps its messages literal that far, which is what leaves the registry
 * something to compare.
 */
export default defineDictionary({
  greeting: 'Hallo {name}',
  round: { none: 'Niemand hat es gefunden' },
  score: defineTranslation('{count:plural}', {
    plural: { count: { one: '{?} Punkt', other: '{?} Punkte' } }
  })
})
