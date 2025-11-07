-- Run this SQL in your Neon database SQL editor
-- This will add CASCADE DELETE to the comments.post_id foreign key constraint
-- This means when you delete a post, all its comments will be automatically deleted

-- Step 1: Find the current constraint name (optional - just to see what it's called)
SELECT conname, pg_get_constraintdef(oid) 
FROM pg_constraint 
WHERE conrelid = 'comments'::regclass 
  AND confrelid = 'posts'::regclass 
  AND contype = 'f';

-- Step 2: Drop and recreate the constraint with CASCADE DELETE
-- This will work for most Payload setups. If you get an error about the constraint name,
-- run Step 1 first to see the actual constraint name, then replace 'comments_post_id_fkey' below

-- Drop the existing constraint (try common names)
ALTER TABLE comments DROP CONSTRAINT IF EXISTS comments_post_id_fkey;
ALTER TABLE comments DROP CONSTRAINT IF EXISTS comments_post_fkey;
ALTER TABLE comments DROP CONSTRAINT IF EXISTS fk_comments_post;

-- Recreate with CASCADE DELETE
ALTER TABLE comments 
ADD CONSTRAINT comments_post_id_fkey 
FOREIGN KEY (post_id) 
REFERENCES posts(id) 
ON DELETE CASCADE;

-- Verify it worked
SELECT 
    conname AS constraint_name,
    conrelid::regclass AS table_name,
    confrelid::regclass AS referenced_table,
    pg_get_constraintdef(oid) AS constraint_definition
FROM pg_constraint
WHERE conrelid = 'comments'::regclass
  AND confrelid = 'posts'::regclass
  AND contype = 'f';

