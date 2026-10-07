import type { Context, ErrorHandler, NotFoundHandler } from 'hono'
import { HTTPException } from 'hono/http-exception'
import { z } from 'zod'

import type { ApiErrorResponse } from '@taverla/protocol/http'

import { logger } from '@/infrastructure/logging/logger'

type ValidationOutcome =
  | { error: z.core.$ZodError; success: false }
  | { success: true }

/** The one hook every `zValidator` takes, so a refused body reads the same on every route. */
export const invalidInput = (
  outcome: ValidationOutcome,
  context: Context
): Response | undefined => {
  if (outcome.success) {
    return undefined
  }

  const body: ApiErrorResponse = {
    code: 'invalid_input',
    message: z.prettifyError(outcome.error)
  }

  return context.json(body, 400)
}

export const answerNotFound: NotFoundHandler = (context) => {
  const body: ApiErrorResponse = {
    code: 'not_found',
    message: `Nothing is served at ${context.req.path}`
  }

  return context.json(body, 404)
}

/**
 * An `HTTPException` is Hono refusing the request itself — a body that is not
 * JSON — so it keeps its status. Anything else is a bug, logged once here
 * rather than caught route by route.
 */
export const answerUnexpected: ErrorHandler = (error, context) => {
  if (error instanceof HTTPException) {
    const body: ApiErrorResponse = {
      code: 'invalid_input',
      message: error.message
    }

    return context.json(body, error.status)
  }

  logger.error('Unhandled error', {
    message: error.message,
    path: context.req.path,
    stack: error.stack
  })

  const body: ApiErrorResponse = {
    code: 'internal_error',
    message: 'Something went wrong on the server'
  }

  return context.json(body, 500)
}
