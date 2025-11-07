-- Script to safely delete a post from Neon database
-- Replace :post_id with the actual post ID you want to delete

-- Step 1: Delete all comments for this post
DELETE FROM comments WHERE post_id = :post_id;

-- Step 2: Delete post relationship records
DELETE FROM posts_rels WHERE parent_id = :post_id;
DELETE FROM _posts_v_rels WHERE parent_id = :post_id;

-- Step 3: Delete post versions
DELETE FROM _posts_v WHERE id = :post_id;

-- Step 4: Delete search index entries
DELETE FROM payload_search WHERE "relationTo" = 'posts' AND id::text = :post_id::text;

-- Step 5: Delete locked documents
DELETE FROM payload_locked_documents WHERE document->>'relationTo' = 'posts' AND (document->>'value')::int = :post_id;

-- Step 6: Update redirects
UPDATE redirects SET "to" = NULL WHERE "to"->>'type' = 'reference' AND "to"->>'relationTo' = 'posts' AND ("to"->>'value')::int = :post_id;

-- Step 7: Remove from related posts
UPDATE posts SET related_posts = array_remove(related_posts, :post_id::text) WHERE :post_id::text = ANY(related_posts);

-- Step 8: Finally, delete the post itself
DELETE FROM posts WHERE id = :post_id;

