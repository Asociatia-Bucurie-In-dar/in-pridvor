import { MigrateUpArgs, MigrateDownArgs } from '@payloadcms/db-vercel-postgres'
import { sql } from 'drizzle-orm'

export async function up({ payload }: MigrateUpArgs): Promise<void> {
  // Drop the entire comments table and let Payload recreate it
  await payload.db.drizzle.execute(sql`DROP TABLE IF EXISTS comments CASCADE`)
  await payload.db.drizzle.execute(sql`DROP TYPE IF EXISTS enum_comments_status CASCADE`)
}

export async function down({ payload }: MigrateDownArgs): Promise<void> {
  // No-op, table will be recreated by Payload
}
