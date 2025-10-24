-- Fix corrupted posts with empty IDs
-- This script will clean up posts that have empty string IDs or other invalid data

-- First, let's see what we have
SELECT COUNT(*) as total_posts FROM posts;
SELECT COUNT(*) as corrupted_posts FROM posts WHERE id IS NULL OR id::text = '' OR title IS NULL OR title = '' OR slug IS NULL OR slug = '';

-- Show some examples of corrupted posts
SELECT id, title, slug, created_at FROM posts WHERE id IS NULL OR id::text = '' OR title IS NULL OR title = '' OR slug IS NULL OR slug = '' LIMIT 10;

-- Delete corrupted posts
DELETE FROM posts 
WHERE id IS NULL 
   OR id::text = '' 
   OR title IS NULL 
   OR title = '' 
   OR slug IS NULL 
   OR slug = '';

-- Show final count
SELECT COUNT(*) as remaining_posts FROM posts;
