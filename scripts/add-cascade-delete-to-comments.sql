-- Migration script to add CASCADE DELETE to comments.post_id foreign key
-- Run this in your Neon database SQL editor

-- First, find the constraint name
-- You can run this to see the current constraints:
-- SELECT conname, conrelid::regclass, confrelid::regclass 
-- FROM pg_constraint 
-- WHERE confrelid = 'posts'::regclass AND conrelid = 'comments'::regclass;

-- Drop the existing foreign key constraint
-- Note: You may need to adjust the constraint name. Common names are:
-- - comments_post_id_fkey
-- - comments_post_fkey
-- - fk_comments_post

DO $$
DECLARE
    constraint_name text;
BEGIN
    -- Find the constraint name
    SELECT conname INTO constraint_name
    FROM pg_constraint
    WHERE conrelid = 'comments'::regclass
      AND confrelid = 'posts'::regclass
      AND contype = 'f'
    LIMIT 1;

    IF constraint_name IS NOT NULL THEN
        -- Drop the old constraint
        EXECUTE format('ALTER TABLE comments DROP CONSTRAINT IF EXISTS %I', constraint_name);
        
        -- Add the new constraint with CASCADE DELETE
        EXECUTE format('ALTER TABLE comments ADD CONSTRAINT %I FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE CASCADE', constraint_name);
        
        RAISE NOTICE 'Updated constraint % to use CASCADE DELETE', constraint_name;
    ELSE
        RAISE NOTICE 'No foreign key constraint found. Creating new one with CASCADE DELETE.';
        
        -- Create new constraint if none exists
        ALTER TABLE comments 
        ADD CONSTRAINT comments_post_id_fkey 
        FOREIGN KEY (post_id) 
        REFERENCES posts(id) 
        ON DELETE CASCADE;
    END IF;
END $$;

-- Verify the constraint was created
SELECT 
    conname AS constraint_name,
    conrelid::regclass AS table_name,
    confrelid::regclass AS referenced_table,
    pg_get_constraintdef(oid) AS constraint_definition
FROM pg_constraint
WHERE conrelid = 'comments'::regclass
  AND confrelid = 'posts'::regclass
  AND contype = 'f';

