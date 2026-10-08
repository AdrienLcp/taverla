type Declaration = { prop: string; value: string }

type FontFaceRule = {
  walkDecls: (callback: (declaration: Declaration) => void) => void
}

const ARIAL_ONLY = /^local\(\s*["']?Arial["']?\s*\)$/

const ARIAL_METRIC_TWINS = ['Arial', 'Liberation Sans', 'Arimo', 'Roboto'].map(
  (name) => `local("${name}")`
)

/**
 * Widens the `src` of each fallback face fontaine writes from Arial alone to
 * Arial and its metric twins. Linux ships no Arial and Android only Roboto, so
 * without them the fallback face never loads there and the swap moves every
 * line. Runs after `fontaine/postcss`.
 */
export const arialMetricTwins = () => ({
  AtRule: {
    'font-face': (rule: FontFaceRule) => {
      rule.walkDecls((declaration) => {
        if (declaration.prop === 'src' && ARIAL_ONLY.test(declaration.value)) {
          declaration.value = ARIAL_METRIC_TWINS.join(', ')
        }
      })
    }
  },
  postcssPlugin: 'arial-metric-twins'
})
