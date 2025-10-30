import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-vercel-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TYPE "public"."enum_pages_blocks_hero_carousel_populate_by" AS ENUM('collection', 'selection');
  CREATE TYPE "public"."enum_pages_blocks_hero_carousel_relation_to" AS ENUM('posts');
  CREATE TYPE "public"."enum__pages_v_blocks_hero_carousel_populate_by" AS ENUM('collection', 'selection');
  CREATE TYPE "public"."enum__pages_v_blocks_hero_carousel_relation_to" AS ENUM('posts');
  CREATE TABLE "pages_blocks_hero_carousel" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"populate_by" "enum_pages_blocks_hero_carousel_populate_by" DEFAULT 'collection',
  	"relation_to" "enum_pages_blocks_hero_carousel_relation_to" DEFAULT 'posts',
  	"limit" numeric DEFAULT 3,
  	"autoplay_delay" numeric DEFAULT 5000,
  	"show_navigation" boolean DEFAULT true,
  	"show_pagination" boolean DEFAULT true,
  	"block_name" varchar
  );
  
  CREATE TABLE "_pages_v_blocks_hero_carousel" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"populate_by" "enum__pages_v_blocks_hero_carousel_populate_by" DEFAULT 'collection',
  	"relation_to" "enum__pages_v_blocks_hero_carousel_relation_to" DEFAULT 'posts',
  	"limit" numeric DEFAULT 3,
  	"autoplay_delay" numeric DEFAULT 5000,
  	"show_navigation" boolean DEFAULT true,
  	"show_pagination" boolean DEFAULT true,
  	"_uuid" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "users_sessions" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"created_at" timestamp(3) with time zone,
  	"expires_at" timestamp(3) with time zone NOT NULL
  );
  
  ALTER TABLE "header_rels" DROP CONSTRAINT "header_rels_categories_fk";
  
  DROP INDEX "header_rels_categories_id_idx";
  DROP INDEX "redirects_from_idx";
  ALTER TABLE "forms_emails" ALTER COLUMN "subject" SET DEFAULT 'You''ve received a new message.';
  ALTER TABLE "pages_blocks_archive" ADD COLUMN "use_custom_category_header" boolean DEFAULT false;
  ALTER TABLE "_pages_v_blocks_archive" ADD COLUMN "use_custom_category_header" boolean DEFAULT false;
  ALTER TABLE "posts" ADD COLUMN "enable_drop_cap" boolean DEFAULT true;
  ALTER TABLE "posts" ADD COLUMN "drop_cap_paragraph_index" numeric DEFAULT 1;
  ALTER TABLE "_posts_v" ADD COLUMN "version_enable_drop_cap" boolean DEFAULT true;
  ALTER TABLE "_posts_v" ADD COLUMN "version_drop_cap_paragraph_index" numeric DEFAULT 1;
  ALTER TABLE "categories" ADD COLUMN "display_order" numeric DEFAULT 0;
  ALTER TABLE "forms_blocks_select" ADD COLUMN "placeholder" varchar;
  ALTER TABLE "pages_blocks_hero_carousel" ADD CONSTRAINT "pages_blocks_hero_carousel_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."pages"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_pages_v_blocks_hero_carousel" ADD CONSTRAINT "_pages_v_blocks_hero_carousel_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_pages_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "users_sessions" ADD CONSTRAINT "users_sessions_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "pages_blocks_hero_carousel_order_idx" ON "pages_blocks_hero_carousel" USING btree ("_order");
  CREATE INDEX "pages_blocks_hero_carousel_parent_id_idx" ON "pages_blocks_hero_carousel" USING btree ("_parent_id");
  CREATE INDEX "pages_blocks_hero_carousel_path_idx" ON "pages_blocks_hero_carousel" USING btree ("_path");
  CREATE INDEX "_pages_v_blocks_hero_carousel_order_idx" ON "_pages_v_blocks_hero_carousel" USING btree ("_order");
  CREATE INDEX "_pages_v_blocks_hero_carousel_parent_id_idx" ON "_pages_v_blocks_hero_carousel" USING btree ("_parent_id");
  CREATE INDEX "_pages_v_blocks_hero_carousel_path_idx" ON "_pages_v_blocks_hero_carousel" USING btree ("_path");
  CREATE INDEX "users_sessions_order_idx" ON "users_sessions" USING btree ("_order");
  CREATE INDEX "users_sessions_parent_id_idx" ON "users_sessions" USING btree ("_parent_id");
  CREATE UNIQUE INDEX "redirects_from_idx" ON "redirects" USING btree ("from");
  ALTER TABLE "header_rels" DROP COLUMN "categories_id";`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "pages_blocks_hero_carousel" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_pages_v_blocks_hero_carousel" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "users_sessions" DISABLE ROW LEVEL SECURITY;
  DROP TABLE "pages_blocks_hero_carousel" CASCADE;
  DROP TABLE "_pages_v_blocks_hero_carousel" CASCADE;
  DROP TABLE "users_sessions" CASCADE;
  DROP INDEX "redirects_from_idx";
  ALTER TABLE "forms_emails" ALTER COLUMN "subject" SET DEFAULT 'You''''ve received a new message.';
  ALTER TABLE "header_rels" ADD COLUMN "categories_id" integer;
  ALTER TABLE "header_rels" ADD CONSTRAINT "header_rels_categories_fk" FOREIGN KEY ("categories_id") REFERENCES "public"."categories"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "header_rels_categories_id_idx" ON "header_rels" USING btree ("categories_id");
  CREATE INDEX "redirects_from_idx" ON "redirects" USING btree ("from");
  ALTER TABLE "pages_blocks_archive" DROP COLUMN "use_custom_category_header";
  ALTER TABLE "_pages_v_blocks_archive" DROP COLUMN "use_custom_category_header";
  ALTER TABLE "posts" DROP COLUMN "enable_drop_cap";
  ALTER TABLE "posts" DROP COLUMN "drop_cap_paragraph_index";
  ALTER TABLE "_posts_v" DROP COLUMN "version_enable_drop_cap";
  ALTER TABLE "_posts_v" DROP COLUMN "version_drop_cap_paragraph_index";
  ALTER TABLE "categories" DROP COLUMN "display_order";
  ALTER TABLE "forms_blocks_select" DROP COLUMN "placeholder";
  DROP TYPE "public"."enum_pages_blocks_hero_carousel_populate_by";
  DROP TYPE "public"."enum_pages_blocks_hero_carousel_relation_to";
  DROP TYPE "public"."enum__pages_v_blocks_hero_carousel_populate_by";
  DROP TYPE "public"."enum__pages_v_blocks_hero_carousel_relation_to";`)
}
