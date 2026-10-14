import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-vercel-postgres'

// Payload 3.90's cloud-storage plugin (R2 media) stores each file's object key.
export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "media" ADD COLUMN IF NOT EXISTS "_objectkey" varchar;`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "media" DROP COLUMN IF EXISTS "_objectkey";`)
}
