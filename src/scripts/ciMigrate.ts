/**
 * Runs pending migrations during the Vercel build (`pnpm run ci`), replacing
 * `payload migrate`.
 *
 * When `next dev` has ever pushed its schema straight into the database, Payload
 * leaves a "dev" migration row (batch -1) and `payload migrate` then stops at an
 * interactive "you've run Payload in dev mode" prompt. A CI build can't answer it,
 * so the command exited successfully WITHOUT migrating and the build failed later
 * on missing columns. This clears that marker and migrates non-interactively; any
 * failure exits non-zero so the deploy stops before touching a half-migrated site.
 */
import { getPayload } from 'payload'
import config from '@payload-config'

// Same as `payload migrate`: never auto-push the dev schema while migrating.
process.env.PAYLOAD_MIGRATING = 'true'

try {
  const payload = await getPayload({ config, disableOnInit: true })

  const devPush = await payload.delete({
    collection: 'payload-migrations',
    where: { batch: { equals: -1 } },
  })
  if (devPush.docs.length > 0) {
    payload.logger.warn(
      'Cleared the "dev" schema-push marker; avoid running `pnpm dev` against the production database.',
    )
  }

  await payload.db.migrate()
  process.exit(0)
} catch (error) {
  console.error('Migration failed:', error)
  process.exit(1)
}
