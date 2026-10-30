// Public on purpose. Signing in with this email and password starts a private demo session:
// the server creates a fresh user (email ending in DEMO_DOMAIN) with its own sample season.
// Kept separate from demo.ts so client components don't pull in server-only code.
export const DEMO_EMAIL = 'demo@hockeytracker.app'
export const DEMO_PASSWORD = 'demo-account'

export const DEMO_DOMAIN = '@demo.hockeytracker.app'
export const DEMO_TTL_MS = 24 * 60 * 60 * 1000

export const isDemoUser = (email?: string | null) => email === DEMO_EMAIL || !!email?.endsWith(DEMO_DOMAIN)
