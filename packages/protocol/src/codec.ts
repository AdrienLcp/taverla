import type { z } from 'zod'

export type DecodeResult<TMessage> =
  | { message: TMessage; status: 'success' }
  | { reason: string; status: 'failure' }

/**
 * A WebSocket frame is an untrusted string, so both ends run every inbound
 * frame through the schema for the role that sent it. The two failure modes —
 * malformed JSON and well-formed JSON that is not a message — collapse into one
 * `failure`, because the caller does the same thing either way: reject the
 * frame and say so.
 */
export const decodeMessage = <TMessage>(
  schema: z.ZodType<TMessage>,
  raw: string
): DecodeResult<TMessage> => {
  let parsedJson: unknown

  try {
    parsedJson = JSON.parse(raw)
  } catch {
    return { reason: 'frame is not valid JSON', status: 'failure' }
  }

  const validated = schema.safeParse(parsedJson)

  if (!validated.success) {
    return {
      reason: validated.error.issues.map(describeIssue).join('; '),
      status: 'failure'
    }
  }

  return { message: validated.data, status: 'success' }
}

export const encodeMessage = (message: unknown): string =>
  JSON.stringify(message)

/**
 * Encodes *through* the schema instead of around it. TypeScript's excess
 * property check only fires on object literals, so a host-shaped view assigned
 * into a player-shaped variable type-checks and would ship the title, the
 * artist and the audio URL to every player. Zod drops unknown keys on parse, so
 * routing player frames through here physically removes them.
 *
 * Throws on a message that does not satisfy its own schema — that is a bug in
 * the server, not bad input, and must not be swallowed.
 */
export const encodeChecked = <TMessage>(
  schema: z.ZodType<TMessage>,
  message: TMessage
): string => JSON.stringify(schema.parse(message))

/**
 * Only the path and the rule, never the received value: a frame can carry a
 * nickname or a signed audio URL, and the reason string ends up in logs.
 */
const describeIssue = (issue: z.core.$ZodIssue): string =>
  `${issue.path.join('.') || '<root>'}: ${issue.code}`
