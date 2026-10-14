/**
 * Runs pending migrations during the Vercel build (`pnpm run ci`), replacing
 * `payload migrate`, then checks that the database has every table and column the
 * code expects.
 *
 * When `next dev` has ever pushed its schema straight into the database, Payload
 * leaves a "dev" migration row (batch -1) and `payload migrate` then stops at an
 * interactive "you've run Payload in dev mode" prompt. A CI build can't answer it,
 * so the command exited successfully WITHOUT migrating and the build failed later
 * on missing columns. This clears that marker and migrates non-interactively; any
 * failure exits non-zero so the deploy stops before touching a half-migrated site.
 */
import { getPayload, type Payload } from 'payload'
import config from '@payload-config'
import { sql, type VercelPostgresAdapter } from '@payloadcms/db-vercel-postgres'

// Same as `payload migrate`: never auto-push the dev schema while migrating.
process.env.PAYLOAD_MIGRATING = 'true'

/**
 * Tables/columns the current config needs but the database lacks. Plugins that are
 * only enabled by env vars (R2 storage, search) add columns too, so a migration
 * generated without production's env can miss them — this names them up front
 * instead of the build failing mid-way on a "column does not exist" query.
 */
const findMissingSchema = async (payload: Payload) => {
  const db = payload.db as unknown as VercelPostgresAdapter
  const { rows } = await db.drizzle.execute<{ table_name: string; column_name: string }>(sql`
    SELECT table_name, column_name FROM information_schema.columns WHERE table_schema = 'public'
  `)

  const tables = new Set(rows.map((row) => row.table_name))
  const columns = new Set(rows.map((row) => `${row.table_name}.${row.column_name}`))
  const missing: string[] = []

  for (const table of Object.values(db.rawTables)) {
    if (!tables.has(table.name)) {
      missing.push(`table "${table.name}"`)
      continue
    }
    for (const column of Object.values(table.columns)) {
      if (!columns.has(`${table.name}.${column.name}`)) missing.push(`"${table.name}"."${column.name}"`)
    }
  }

  return missing
}

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

  const missing = await findMissingSchema(payload)
  if (missing.length > 0) {
    payload.logger.error(
      `The database is missing ${missing.length} table(s)/column(s) the code needs:\n  ${missing.join('\n  ')}\n` +
        'Create a migration with the same env vars as production (e.g. R2_* for media storage) ' +
        'via `pnpm payload migrate:create`, then redeploy.',
    )
    process.exit(1)
  }

  payload.logger.info('Database schema matches the config.')
  process.exit(0)
} catch (error) {
  console.error('Migration failed:', error)
  process.exit(1)
}
