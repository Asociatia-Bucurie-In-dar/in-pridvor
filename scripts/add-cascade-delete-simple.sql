-- Simple version: Add CASCADE DELETE to comments.post_id foreign key
-- Run this in your Neon database SQL editor

-- Step 1: Find the constraint name (run this first to see what it's called)
-- SELECT conname FROM pg_constraint 
-- WHERE conrelid = 'comments'::regclass 
--   AND confrelid = 'posts'::regclass 
--   AND contype = 'f';

-- Step 2: Replace 'comments_post_id_fkey' with the actual constraint name from Step 1
-- Then run these commands:

-- Drop the existing constraint
ALTER TABLE comments DROP CONSTRAINT IF EXISTS comments_post_id_fkey;

-- Recreate it with CASCADE DELETE
ALTER TABLE comments 
ADD CONSTRAINT comments_post_id_fkey 
FOREIGN KEY (post_id) 
REFERENCES posts(id) 
ON DELETE CASCADE;

