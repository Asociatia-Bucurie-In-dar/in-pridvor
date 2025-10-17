import type { CollectionAfterChangeHook, CollectionAfterDeleteHook } from 'payload'

import { revalidatePath, revalidateTag } from 'next/cache'

import type { Post, Category } from '../../../payload-types'

/**
 * Revalidates all pages that might display a post
 */
const revalidatePostPages = async (
  post: Post,
  payload: any,
  action: 'publish' | 'unpublish' | 'delete',
) => {
  const paths: string[] = []

  // 1. Revalidate the specific post page
  if (post.slug) {
    const postPath = `/posts/${post.slug}`
    paths.push(postPath)
    payload.logger.info(`[${action}] Revalidating post: ${postPath}`)
  }

  // 2. Revalidate homepage (may contain ArchiveBlocks with recent posts)
  paths.push('/')
  payload.logger.info(`[${action}] Revalidating homepage`)

  // 3. Revalidate posts index page and all pagination pages
  paths.push('/posts')
  payload.logger.info(`[${action}] Revalidating posts index and pagination`)

  // 4. Revalidate categories index page
  paths.push('/categories')
  payload.logger.info(`[${action}] Revalidating categories index`)

  // 5. Revalidate all category pages this post belongs to
  if (post.categories && Array.isArray(post.categories) && post.categories.length > 0) {
    for (const category of post.categories) {
      let categoryData: Category | null = null

      // Handle both populated and unpopulated categories
      if (typeof category === 'object' && category !== null && 'slug' in category) {
        categoryData = category as Category
      } else if (typeof category === 'number' || typeof category === 'string') {
        // Fetch the category to get its slug
        try {
          const result = await payload.findByID({
            collection: 'categories',
            id: category,
            depth: 0,
          })
          categoryData = result
        } catch (error) {
          payload.logger.error(
            `Failed to fetch category ${category}: ${error instanceof Error ? error.message : 'Unknown error'}`,
          )
        }
      }

      if (categoryData?.slug) {
        const categoryPath = `/categories/${categoryData.slug}`
        paths.push(categoryPath)
        payload.logger.info(`[${action}] Revalidating category: ${categoryPath}`)
      }
    }
  }

  // Execute all revalidations
  for (const path of paths) {
    try {
      revalidatePath(path)
      revalidatePath(path, 'layout') // Also revalidate layouts
      // For /posts path, also revalidate all nested pagination pages
      if (path === '/posts') {
        revalidatePath(path, 'page') // Revalidates /posts/page/[pageNumber]
      }
    } catch (error) {
      payload.logger.error(
        `Failed to revalidate ${path}: ${error instanceof Error ? error.message : 'Unknown error'}`,
      )
    }
  }

  // Revalidate sitemap
  revalidateTag('posts-sitemap')
}

export const revalidatePost: CollectionAfterChangeHook<Post> = async ({
  doc,
  previousDoc,
  req: { payload, context },
}) => {
  if (context.disableRevalidate) {
    return doc
  }

  // Handle newly published posts
  if (doc._status === 'published') {
    await revalidatePostPages(doc, payload, 'publish')

    // If slug changed, also revalidate the old slug
    if (previousDoc?.slug && previousDoc.slug !== doc.slug) {
      const oldPath = `/posts/${previousDoc.slug}`
      payload.logger.info(`[publish] Slug changed, revalidating old path: ${oldPath}`)
      revalidatePath(oldPath)
    }

    // If categories changed, revalidate old categories too
    if (previousDoc?.categories && Array.isArray(previousDoc.categories)) {
      const oldCategoryIds = new Set(
        previousDoc.categories.map((cat) => (typeof cat === 'object' ? cat.id : cat)),
      )
      const newCategoryIds = new Set(
        (doc.categories || []).map((cat: any) => (typeof cat === 'object' ? cat.id : cat)),
      )

      // Find categories that were removed
      for (const oldCatId of oldCategoryIds) {
        if (!newCategoryIds.has(oldCatId)) {
          try {
            const categoryData = await payload.findByID({
              collection: 'categories',
              id: oldCatId,
              depth: 0,
            })
            if (categoryData?.slug) {
              const categoryPath = `/categories/${categoryData.slug}`
              payload.logger.info(`[publish] Revalidating removed category: ${categoryPath}`)
              revalidatePath(categoryPath)
            }
          } catch (error) {
            payload.logger.error(
              `Failed to revalidate old category ${oldCatId}: ${error instanceof Error ? error.message : 'Unknown error'}`,
            )
          }
        }
      }
    }
  }

  // Handle unpublishing (published -> draft)
  if (previousDoc?._status === 'published' && doc._status !== 'published') {
    await revalidatePostPages(previousDoc, payload, 'unpublish')
  }

  return doc
}

export const revalidateDelete: CollectionAfterDeleteHook<Post> = async ({
  doc,
  req: { payload, context },
}) => {
  if (!context.disableRevalidate && doc) {
    await revalidatePostPages(doc, payload, 'delete')
  }

  return doc
}
