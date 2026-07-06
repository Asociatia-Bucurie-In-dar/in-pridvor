import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-vercel-postgres'

/**
 * ADDITIVE-ONLY migration for the English translation feature.
 *
 * This migration was intentionally HAND-WRITTEN rather than left as the output
 * of `payload migrate:create`. The auto-generated diff was contaminated by
 * pre-existing drift between the committed schema snapshot and the live config
 * (unrelated media image-size removals, block tables, enum changes, etc.) and
 * included destructive `DROP COLUMN` statements. Per the project requirement
 * — Romanian data is the source of truth and nothing existing may be modified
 * or dropped — this migration contains ONLY additive `ADD COLUMN` statements
 * for the new non-localized English shadow fields.
 *
 * All columns are new (the `en_*` namespace did not exist before this feature),
 * and every statement is guarded with IF NOT EXISTS / IF EXISTS so the
 * migration is idempotent and safe to apply regardless of the exact current
 * production schema.
 */
export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
    -- Pages: English shadow fields (title, hero rich text, SEO meta)
    ALTER TABLE "pages" ADD COLUMN IF NOT EXISTS "en_title" varchar;
    ALTER TABLE "pages" ADD COLUMN IF NOT EXISTS "en_hero_rich_text" jsonb;
    ALTER TABLE "pages" ADD COLUMN IF NOT EXISTS "en_meta_title" varchar;
    ALTER TABLE "pages" ADD COLUMN IF NOT EXISTS "en_meta_description" varchar;

    -- Pages versions table (drafts/autosave)
    ALTER TABLE "_pages_v" ADD COLUMN IF NOT EXISTS "version_en_title" varchar;
    ALTER TABLE "_pages_v" ADD COLUMN IF NOT EXISTS "version_en_hero_rich_text" jsonb;
    ALTER TABLE "_pages_v" ADD COLUMN IF NOT EXISTS "version_en_meta_title" varchar;
    ALTER TABLE "_pages_v" ADD COLUMN IF NOT EXISTS "version_en_meta_description" varchar;

    -- Posts: English shadow fields (title, content, SEO meta title)
    ALTER TABLE "posts" ADD COLUMN IF NOT EXISTS "en_title" varchar;
    ALTER TABLE "posts" ADD COLUMN IF NOT EXISTS "en_content" jsonb;
    ALTER TABLE "posts" ADD COLUMN IF NOT EXISTS "en_meta_title" varchar;

    -- Posts versions table (drafts/autosave)
    ALTER TABLE "_posts_v" ADD COLUMN IF NOT EXISTS "version_en_title" varchar;
    ALTER TABLE "_posts_v" ADD COLUMN IF NOT EXISTS "version_en_content" jsonb;
    ALTER TABLE "_posts_v" ADD COLUMN IF NOT EXISTS "version_en_meta_title" varchar;

    -- Categories: English shadow title
    ALTER TABLE "categories" ADD COLUMN IF NOT EXISTS "en_title" varchar;
  `)
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
    ALTER TABLE "pages" DROP COLUMN IF EXISTS "en_title";
    ALTER TABLE "pages" DROP COLUMN IF EXISTS "en_hero_rich_text";
    ALTER TABLE "pages" DROP COLUMN IF EXISTS "en_meta_title";
    ALTER TABLE "pages" DROP COLUMN IF EXISTS "en_meta_description";

    ALTER TABLE "_pages_v" DROP COLUMN IF EXISTS "version_en_title";
    ALTER TABLE "_pages_v" DROP COLUMN IF EXISTS "version_en_hero_rich_text";
    ALTER TABLE "_pages_v" DROP COLUMN IF EXISTS "version_en_meta_title";
    ALTER TABLE "_pages_v" DROP COLUMN IF EXISTS "version_en_meta_description";

    ALTER TABLE "posts" DROP COLUMN IF EXISTS "en_title";
    ALTER TABLE "posts" DROP COLUMN IF EXISTS "en_content";
    ALTER TABLE "posts" DROP COLUMN IF EXISTS "en_meta_title";

    ALTER TABLE "_posts_v" DROP COLUMN IF EXISTS "version_en_title";
    ALTER TABLE "_posts_v" DROP COLUMN IF EXISTS "version_en_content";
    ALTER TABLE "_posts_v" DROP COLUMN IF EXISTS "version_en_meta_title";

    ALTER TABLE "categories" DROP COLUMN IF EXISTS "en_title";
  `)
}
