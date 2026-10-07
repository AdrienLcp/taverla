import { Hono } from 'hono'

import {
  answerNotFound,
  answerUnexpected
} from '@/infrastructure/http/error-responses'

/** The Hono app both runtimes build on, already answering a miss and a throw in the API's error body. */
export const createHttpApp = (): Hono => {
  const app = new Hono()

  app.notFound(answerNotFound)
  app.onError(answerUnexpected)

  return app
}
