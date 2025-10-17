# Caching Strategy & Revalidation

## Overview

This project uses **Next.js 14+ Incremental Static Regeneration (ISR)** with **on-demand revalidation** to ensure optimal performance while keeping content up-to-date instantly when changes are made in the CMS.

## Problem (Before)

Previously, the caching setup had these issues:
- Only individual post pages were revalidated when a post was published
- Homepage, posts index, and category pages used time-based revalidation (10 minutes)
- New posts didn't appear immediately on the homepage or category pages
- Changes to categories didn't trigger appropriate revalidation

## Solution (After)

### On-Demand Revalidation

All pages now use **on-demand revalidation** triggered by Payload CMS hooks. When content changes, only the affected pages are revalidated immediately.

### What Gets Revalidated

#### When a Post is Published/Updated

1. **The specific post page** (`/posts/[slug]`)
2. **Homepage** (`/`) - may contain ArchiveBlocks showing recent posts
3. **Posts index** (`/posts`) - lists all posts
4. **Categories index** (`/categories`) - overview page
5. **All category pages** the post belongs to (`/categories/[slug]`)
6. **Old paths** if the slug or categories changed

#### When a Post is Unpublished

All the same pages as above, ensuring the post disappears from listings immediately.

#### When a Post is Deleted

All related pages are revalidated to remove the post from listings.

#### When a Category is Created/Updated/Deleted

1. **The specific category page** (`/categories/[slug]`)
2. **Categories index** (`/categories`)
3. **Homepage** (`/`) - may have category-filtered content
4. **Old paths** if the slug changed

#### When a Page is Created/Updated/Deleted

1. **The specific page** (e.g., `/`, `/about`, etc.)
2. **Sitemap** - for SEO

## Implementation Details

### Posts Collection

**File:** `src/collections/Posts/hooks/revalidatePost.ts`

The `revalidatePost` hook:
- Runs after any post is created, updated, or published
- Intelligently determines which pages need revalidation
- Handles edge cases like slug changes and category changes
- Uses Next.js `revalidatePath()` for on-demand revalidation

Key features:
```typescript
// Revalidates both page and layout
revalidatePath(path)
revalidatePath(path, 'layout')
```

### Categories Collection

**File:** `src/collections/Categories/hooks/revalidateCategory.ts`

The `revalidateCategory` hook:
- Runs after any category is created, updated, or deleted
- Revalidates category pages and homepage
- Handles slug changes properly

### Pages Collection

**File:** `src/collections/Pages/hooks/revalidatePage.ts`

Already had proper revalidation in place for pages including the homepage.

## Performance Benefits

### Before
- ❌ 10-minute delay before new posts appeared
- ❌ Unnecessary periodic rebuilds every 10 minutes
- ❌ Inconsistent user experience
- ❌ Wasted build resources

### After
- ✅ Instant updates when content is published
- ✅ No periodic rebuilds - only when needed
- ✅ Consistent, real-time user experience
- ✅ Optimal resource usage
- ✅ Better SEO (fresh content appears immediately)

## How to Test

### Test Post Publication

1. Go to the Payload admin panel
2. Create a new post and assign it to a category
3. Publish the post
4. Check these pages immediately:
   - Homepage: `/`
   - Posts index: `/posts`
   - Category page: `/categories/[category-slug]`
   - Categories index: `/categories`

The new post should appear immediately on all relevant pages.

### Test Post Update

1. Edit an existing published post
2. Change its categories
3. Save
4. Check that old and new category pages both update immediately

### Test Category Changes

1. Create or edit a category
2. Change its slug
3. Check that both old and new category URLs work correctly

## Monitoring & Debugging

### Check Revalidation Logs

The hooks log all revalidation actions. In your server logs, look for:

```
[publish] Revalidating post: /posts/my-new-post
[publish] Revalidating homepage
[publish] Revalidating posts index
[publish] Revalidating category: /categories/news
```

### Common Issues

**Issue:** Pages not updating
- **Check:** Server logs for revalidation messages
- **Check:** That the post is actually published (not draft)
- **Check:** That `context.disableRevalidate` is not set

**Issue:** 404 errors after publishing
- **Check:** That `generateStaticParams` includes the new post/category
- **Check:** That the slug is correct

## Technical Notes

### Why Not Time-Based Revalidation?

Time-based revalidation (`revalidate = 600`) has several drawbacks:
1. Delay before users see new content
2. Unnecessary rebuilds even when content hasn't changed
3. Race conditions when multiple posts are published quickly
4. Wasted server resources

### Why On-Demand is Better

On-demand revalidation:
1. Zero delay - updates are instant
2. Only rebuilds when content actually changes
3. Predictable behavior
4. Resource-efficient
5. Better user experience

### Edge Cases Handled

1. **Slug changes:** Both old and new URLs are revalidated
2. **Category changes:** Both removed and added category pages are updated
3. **Unpublishing:** Content is removed from all listings immediately
4. **Nested categories:** Handled via `getCategoryHierarchyIds`
5. **Related posts:** Homepage and category pages show updated listings

## Configuration

### Disable Revalidation (if needed)

For bulk operations or migrations, you can disable revalidation:

```typescript
await payload.create({
  collection: 'posts',
  data: postData,
  context: {
    disableRevalidate: true, // Prevents revalidation
  },
})
```

After bulk operations, manually revalidate:

```typescript
import { revalidatePath } from 'next/cache'

revalidatePath('/')
revalidatePath('/posts')
revalidatePath('/categories')
```

## Future Enhancements

Possible improvements:
1. **Batch revalidation** - Queue multiple revalidations and execute together
2. **Selective revalidation** - Only revalidate if specific fields changed
3. **Analytics** - Track revalidation frequency and performance
4. **Cache tags** - Use Next.js cache tags for more granular control

## Conclusion

This caching strategy provides the best of both worlds:
- **Static site performance** - Pages are pre-rendered and cached
- **Dynamic site freshness** - Content updates appear instantly

No more waiting for time-based revalidation or manual cache clearing!

