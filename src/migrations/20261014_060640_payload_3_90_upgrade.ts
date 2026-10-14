import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-vercel-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  // Production's jobs tables may have been reshaped by `next dev` schema pushes, so
  // the enum cleanup only touches tables that exist. Jobs for task types that no
  // longer exist (e.g. "revalidateCache") can never run again and would block the
  // conversion, so they're dropped first.
  await db.execute(sql`
  DO $$
  BEGIN
    IF to_regclass('public.payload_jobs_log') IS NOT NULL THEN
      DELETE FROM "payload_jobs_log" WHERE "task_slug"::text NOT IN ('inline', 'schedulePublish');
      ALTER TABLE "payload_jobs_log" ALTER COLUMN "task_slug" SET DATA TYPE text;
      DROP TYPE IF EXISTS "public"."enum_payload_jobs_log_task_slug";
      CREATE TYPE "public"."enum_payload_jobs_log_task_slug" AS ENUM('inline', 'schedulePublish');
      ALTER TABLE "payload_jobs_log" ALTER COLUMN "task_slug" SET DATA TYPE "public"."enum_payload_jobs_log_task_slug" USING "task_slug"::"public"."enum_payload_jobs_log_task_slug";
    END IF;

    IF to_regclass('public.payload_jobs') IS NOT NULL THEN
      DELETE FROM "payload_jobs" WHERE "task_slug"::text NOT IN ('inline', 'schedulePublish');
      ALTER TABLE "payload_jobs" ALTER COLUMN "task_slug" SET DATA TYPE text;
      DROP TYPE IF EXISTS "public"."enum_payload_jobs_task_slug";
      CREATE TYPE "public"."enum_payload_jobs_task_slug" AS ENUM('inline', 'schedulePublish');
      ALTER TABLE "payload_jobs" ALTER COLUMN "task_slug" SET DATA TYPE "public"."enum_payload_jobs_task_slug" USING "task_slug"::"public"."enum_payload_jobs_task_slug";
    END IF;
  END $$;

  ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "reset_password_requested_at" timestamp(3) with time zone;`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TYPE "public"."enum_payload_jobs_log_task_slug" ADD VALUE 'revalidateCache' BEFORE 'schedulePublish';
  ALTER TYPE "public"."enum_payload_jobs_task_slug" ADD VALUE 'revalidateCache' BEFORE 'schedulePublish';
  ALTER TABLE "users" DROP COLUMN "reset_password_requested_at";`)
}
