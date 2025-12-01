import type { CollectionAfterChangeHook, CollectionAfterDeleteHook } from 'payload'

import { revalidatePath, revalidateTag } from 'next/cache'

import type { Post, Category } from '../../../payload-types'

const DAYS_OLD_THRESHOLD = 30

const isRecentPost = (post: Post): boolean => {
  if (!post.publishedAt) return true

  const publishedDate = new Date(post.publishedAt)
  const daysSincePublished = (Date.now() - publishedDate.getTime()) / (1000 * 60 * 60 * 24)

  return daysSincePublished <= DAYS_OLD_THRESHOLD
}

const revalidatePostPages = async (
  post: Post,
  payload: any,
  action: 'publish' | 'unpublish' | 'delete',
) => {
  const paths: string[] = []
  const isRecent = isRecentPost(post)
  const isDeleteOrUnpublish = action === 'delete' || action === 'unpublish'

  if (isDeleteOrUnpublish || isRecent) {
    if (post.slug) {
      const postPath = `/posts/${post.slug}`
      paths.push(postPath)
      payload.logger.info(`[${action}] Revalidating post: ${postPath}`)
    }
  } else {
    payload.logger.info(
      `[${action}] Skipping individual post revalidation for old post: /posts/${post.slug} (published ${Math.round((Date.now() - new Date(post.publishedAt!).getTime()) / (1000 * 60 * 60 * 24))} days ago, will use time-based revalidation)`,
    )
  }

  paths.push('/')
  payload.logger.info(`[${action}] Revalidating homepage`)

  paths.push('/posts')
  payload.logger.info(`[${action}] Revalidating posts index and pagination`)

  paths.push('/categories')
  payload.logger.info(`[${action}] Revalidating categories index`)

  if (
    (isRecent || isDeleteOrUnpublish) &&
    post.categories &&
    Array.isArray(post.categories) &&
    post.categories.length > 0
  ) {
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
  } else if (!isRecent && !isDeleteOrUnpublish && post.categories) {
    payload.logger.info(
      `[${action}] Skipping category revalidation for old post (category pages show recent posts first)`,
    )
  }

  const uniquePaths = Array.from(new Set(paths))

  for (const path of uniquePaths) {
    try {
      revalidatePath(path, 'page')
      if (path === '/posts' || path === '/categories' || path === '/') {
        revalidatePath(path, 'layout')
      }
    } catch (error) {
      payload.logger.error(
        `Failed to revalidate ${path}: ${error instanceof Error ? error.message : 'Unknown error'}`,
      )
    }
  }

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

    if (previousDoc?.slug && previousDoc.slug !== doc.slug) {
      const oldPath = `/posts/${previousDoc.slug}`
      const isOldPost = previousDoc.publishedAt
        ? (Date.now() - new Date(previousDoc.publishedAt).getTime()) / (1000 * 60 * 60 * 24) >
          DAYS_OLD_THRESHOLD
        : false

      if (!isOldPost) {
        payload.logger.info(`[publish] Slug changed, revalidating old path: ${oldPath}`)
        revalidatePath(oldPath, 'page')
      } else {
        payload.logger.info(
          `[publish] Slug changed, but old path is for old post, skipping: ${oldPath}`,
        )
      }
    }

    // If categories changed, revalidate old categories too
    if (previousDoc?.categories && Array.isArray(previousDoc.categories)) {
      const oldCategoryIds = new Set(
        previousDoc.categories.map((cat) => (typeof cat === 'object' ? cat.id : cat)),
      )
      const newCategoryIds = new Set(
        (doc.categories || []).map((cat: any) => (typeof cat === 'object' ? cat.id : cat)),
      )

      const isRecent = isRecentPost(doc)

      for (const oldCatId of oldCategoryIds) {
        if (!newCategoryIds.has(oldCatId)) {
          if (isRecent) {
            try {
              const categoryData = await payload.findByID({
                collection: 'categories',
                id: oldCatId,
                depth: 0,
              })
              if (categoryData?.slug) {
                const categoryPath = `/categories/${categoryData.slug}`
                payload.logger.info(`[publish] Revalidating removed category: ${categoryPath}`)
                revalidatePath(categoryPath, 'page')
              }
            } catch (error) {
              payload.logger.error(
                `Failed to revalidate old category ${oldCatId}: ${error instanceof Error ? error.message : 'Unknown error'}`,
              )
            }
          } else {
            payload.logger.info(
              `[publish] Skipping category revalidation for removed category (old post)`,
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
