import { renderToStaticMarkup } from 'react-dom/server'
import {
  createStaticHandler,
  createStaticRouter,
  StaticRouterProvider
} from 'react-router'

import { shelvedGames } from '@taverla/protocol/game'
import { LOCALES, type Locale } from '@taverla/protocol/locale'

import {
  creditsPathFor,
  gameHomePathFor,
  homePathFor,
  paths
} from '@/infrastructure/router/navigation'
import { pageModuleFor, routes } from '@/infrastructure/router/routes'
import { AppProviders } from '@/presentation/app-providers'
import {
  IMAGE_ALTS,
  type IndexedPage,
  OPEN_GRAPH_LOCALES,
  PAGE_HEADS,
  type PageHead
} from '@/presentation/head/document-head'
import { ROUTE_FALLBACK_CLASS } from '@/presentation/route-fallback'

export type PrerenderedPage = {
  locale: Locale
  /** How Vite's build manifest keys the chunk this page renders, which is what says whose stylesheet the document inlines. */
  module: string
  page: IndexedPage
  /** Where the document is served, from the site root — `/fr/credits`. */
  path: string
}

export type RenderedPage = Pick<PageHead, 'description'> & {
  /** What goes inside `#root`, the page's hoisted `<title>` ahead of it, so there is something to paint before any script runs. */
  html: string
}

/**
 * Re-exported so the build script reads the tags from the bundle Vite made for
 * it, rather than keeping a second copy of them: it needs a *sibling's* tag for
 * `og:locale:alternate`, which no single rendered page can hand it.
 */
export { IMAGE_ALTS as imageAlts, OPEN_GRAPH_LOCALES as openGraphLocales }

const pagesFor = (locale: Locale): PrerenderedPage[] => [
  {
    locale,
    module: pageModuleFor(paths.home),
    page: 'home',
    path: homePathFor(locale)
  },
  {
    locale,
    module: pageModuleFor(paths.credits),
    page: 'credits',
    path: creditsPathFor(locale)
  },
  ...shelvedGames.map(
    (game): PrerenderedPage => ({
      locale,
      module: pageModuleFor(paths.game),
      page: game,
      path: gameHomePathFor({ game, locale })
    })
  )
]

/**
 * Every document the build writes: each indexable page, in each language. Read
 * off `shelvedGames` and `LOCALES` rather than listed, because a game that
 * reaches the shelf without a document of its own is a front door no crawler
 * ever finds, and a hardcoded count is what would let that ship in silence — the
 * plan for this stage said twelve documents and was already wrong by two.
 */
export const prerenderedPages: PrerenderedPage[] = LOCALES.flatMap(pagesFor)

const handler = createStaticHandler(routes)

/**
 * `createStaticHandler` rather than a memory router, because every page is
 * `lazy` and `query` is the only thing that awaits those chunks. A synchronous
 * render over an unresolved tree writes the route fallback into all fourteen
 * documents and leaves the build green.
 */
export const renderPage = async ({
  locale,
  page,
  path
}: PrerenderedPage): Promise<RenderedPage> => {
  const context = await handler.query(new Request(`http://prerender${path}`))

  if (context instanceof Response) {
    throw new Error(
      `${path} answered with ${context.status} rather than with a page`
    )
  }

  // `dataRoutes` rather than `routes`: it is the tree `query` resolved every
  // `lazy` into. Handed the original, the router has no component to mount and
  // renders `HydrateFallback` instead — a loader, in all fourteen documents,
  // with nothing red anywhere.
  const markup = renderToStaticMarkup(
    <AppProviders locale={locale}>
      <StaticRouterProvider
        context={context}
        hydrate={false}
        router={createStaticRouter(handler.dataRoutes, context)}
      />
    </AppProviders>
  )

  if (markup.includes(ROUTE_FALLBACK_CLASS)) {
    throw new Error(`${path} rendered the route fallback rather than a page`)
  }

  return { description: PAGE_HEADS[locale][page].description, html: markup }
}
