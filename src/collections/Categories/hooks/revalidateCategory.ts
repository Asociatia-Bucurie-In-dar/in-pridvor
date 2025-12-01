import type { CollectionAfterChangeHook, CollectionAfterDeleteHook } from 'payload'

import { revalidatePath, revalidateTag } from 'next/cache'

import type { Category } from '../../../payload-types'

/**
 * Revalidates pages affected by category changes
 * Since categories appear in the header (which is in the layout), we need to revalidate all pages
 */
export const revalidateCategory: CollectionAfterChangeHook<Category> = async ({
  doc,
  previousDoc,
  req: { payload, context },
}) => {
  if (context.disableRevalidate) {
    return doc
  }

  const paths: string[] = []

  // 1. Revalidate the specific category page
  if (doc.slug) {
    const categoryPath = `/categories/${doc.slug}`
    paths.push(categoryPath)
    payload.logger.info(`[category-update] Revalidating category: ${categoryPath}`)
  }

  // 2. If slug changed, revalidate the old path
  if (previousDoc?.slug && previousDoc.slug !== doc.slug) {
    const oldPath = `/categories/${previousDoc.slug}`
    paths.push(oldPath)
    payload.logger.info(`[category-update] Slug changed, revalidating old path: ${oldPath}`)
  }

  // 3. Revalidate categories index
  paths.push('/categories')
  payload.logger.info(`[category-update] Revalidating categories index`)

  // 4. Revalidate homepage (might have category-filtered ArchiveBlocks)
  paths.push('/')
  payload.logger.info(`[category-update] Revalidating homepage`)

  const uniquePaths = Array.from(new Set(paths))

  for (const path of uniquePaths) {
    try {
      revalidatePath(path, 'page')
      if (path === '/' || path === '/posts' || path === '/categories') {
        revalidatePath(path, 'layout')
      }
    } catch (error) {
      payload.logger.error(
        `Failed to revalidate ${path}: ${error instanceof Error ? error.message : 'Unknown error'}`,
      )
    }
  }

  revalidateTag('categories-header')

  payload.logger.info(`[category-update] Revalidated category tag for header`)

  return doc
}

export const revalidateCategoryDelete: CollectionAfterDeleteHook<Category> = async ({
  doc,
  req: { payload, context },
}) => {
  if (!context.disableRevalidate && doc) {
    const paths: string[] = []

    if (doc.slug) {
      const categoryPath = `/categories/${doc.slug}`
      paths.push(categoryPath)
      payload.logger.info(`[category-delete] Revalidating deleted category: ${categoryPath}`)
    }

    paths.push('/categories')
    paths.push('/')

    const uniquePaths = Array.from(new Set(paths))

    for (const path of uniquePaths) {
      try {
        revalidatePath(path, 'page')
        if (path === '/' || path === '/posts' || path === '/categories') {
          revalidatePath(path, 'layout')
        }
      } catch (error) {
        payload.logger.error(
          `Failed to revalidate ${path}: ${error instanceof Error ? error.message : 'Unknown error'}`,
        )
      }
    }

    revalidateTag('categories-header')
    payload.logger.info(`[category-delete] Revalidated category tag for header`)
  }

  return doc
}
