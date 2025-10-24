-- Comprehensive database cleanup using direct SQL
-- This will delete all posts, media, and related data to start fresh

-- Step 1: Check current data counts
SELECT 'Current Data Counts:' as info;
SELECT 'Posts' as table_name, COUNT(*) as count FROM posts
UNION ALL
SELECT 'Media' as table_name, COUNT(*) as count FROM media
UNION ALL
SELECT 'Categories' as table_name, COUNT(*) as count FROM categories
UNION ALL
SELECT 'Users' as table_name, COUNT(*) as count FROM users
UNION ALL
SELECT 'Comments' as table_name, COUNT(*) as count FROM comments;

-- Step 2: Delete all posts (this will cascade to related data)
DELETE FROM posts;

-- Step 3: Delete all media
DELETE FROM media;

-- Step 4: Reset category relationships (keep structure but clear post counts)
-- Note: Categories are kept for structure, but any post-related fields are cleared
UPDATE categories SET 
  "createdAt" = NOW(),
  "updatedAt" = NOW()
WHERE true;

-- Step 5: Clear any orphaned comments
DELETE FROM comments;

-- Step 6: Verify cleanup
SELECT 'After Cleanup:' as info;
SELECT 'Posts' as table_name, COUNT(*) as count FROM posts
UNION ALL
SELECT 'Media' as table_name, COUNT(*) as count FROM media
UNION ALL
SELECT 'Categories' as table_name, COUNT(*) as count FROM categories
UNION ALL
SELECT 'Users' as table_name, COUNT(*) as count FROM users
UNION ALL
SELECT 'Comments' as table_name, COUNT(*) as count FROM comments;

-- Step 7: Reset sequences (if using auto-increment IDs)
-- This ensures new imports start with clean IDs
SELECT setval('posts_id_seq', 1, false);
SELECT setval('media_id_seq', 1, false);
SELECT setval('comments_id_seq', 1, false);

SELECT 'Database cleanup completed! Ready for fresh import.' as status;
