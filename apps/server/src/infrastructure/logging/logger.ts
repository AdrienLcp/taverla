type LogContext = Record<string, unknown>

const format = (message: string, context?: LogContext): string =>
  context === undefined ? message : `${message} ${JSON.stringify(context)}`

/**
 * Never pass a raw inbound frame as context. A rejected message can carry a
 * nickname, a session id or a signed audio URL — log the reason the decoder
 * produced, which names the field and the rule but not the value.
 */
export const logger = {
  error: (message: string, context?: LogContext): void => {
    console.error(format(message, context))
  },
  info: (message: string, context?: LogContext): void => {
    console.info(format(message, context))
  },
  warn: (message: string, context?: LogContext): void => {
    console.warn(format(message, context))
  }
}
