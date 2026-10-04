import { z } from 'zod'

const envSchema = z.object({
  /** Comma-separated. Only consulted when the browser is not behind the Vite dev proxy. */
  ALLOWED_ORIGINS: z.string().default('http://localhost:5273'),
  DEEZER_API_URL: z.url().default('https://api.deezer.com'),
  /** Set by the deploy job to the commit it ships. Absent from a checkout. */
  GIT_COMMIT: z.string().optional()
})

const parsed = envSchema.safeParse(process.env)

if (!parsed.success) {
  throw new Error(`Invalid environment: ${z.prettifyError(parsed.error)}`)
}

const SHORT_COMMIT_LENGTH = 7

export const env = {
  ...parsed.data,
  allowedOrigins: parsed.data.ALLOWED_ORIGINS.split(',').map((origin) =>
    origin.trim()
  ),
  build: parsed.data.GIT_COMMIT?.slice(0, SHORT_COMMIT_LENGTH) ?? 'dev'
}
