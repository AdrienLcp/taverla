import { z } from 'zod'

/**
 * Ports are offset from the usual 3000/5173 so this repo runs side by side with
 * the other dev servers on this machine — nothing here needs the default ports,
 * and having to stop another project to start this one is a bad trade.
 */
const envSchema = z.object({
  /** Comma-separated. Only consulted when the browser is not behind the Vite dev proxy. */
  ALLOWED_ORIGINS: z.string().default('http://localhost:5273'),
  DEEZER_API_URL: z.url().default('https://api.deezer.com'),
  PORT: z.coerce.number().int().positive().default(3100),
  /**
   * Path to the built SPA, relative to the working directory. Set in
   * production and absent in development, where Vite serves the app and
   * proxies to this process — its presence is what switches on serving both
   * surfaces from one origin, which is the requirement the QR code imposes.
   */
  SERVE_GAME_FROM: z.string().optional()
})

const parsed = envSchema.safeParse(process.env)

if (!parsed.success) {
  throw new Error(`Invalid environment: ${z.prettifyError(parsed.error)}`)
}

export const env = {
  ...parsed.data,
  allowedOrigins: parsed.data.ALLOWED_ORIGINS.split(',').map((origin) =>
    origin.trim()
  )
}
