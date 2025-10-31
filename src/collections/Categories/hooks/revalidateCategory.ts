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

  // 5. Revalidate all common pages that have the header (which shows categories)
  // Since header is in the layout, we need to revalidate layout for all these paths
  const commonPaths = [
    '/',
    '/posts',
    '/categories',
    '/search',
    '/authors',
  ]

  // Execute all revalidations with layout revalidation (for header updates)
  for (const path of [...paths, ...commonPaths]) {
    try {
      revalidatePath(path)
      revalidatePath(path, 'layout') // This will revalidate the header since it's in the layout
    } catch (error) {
      payload.logger.error(
        `Failed to revalidate ${path}: ${error instanceof Error ? error.message : 'Unknown error'}`,
      )
    }
  }

  // Also use a tag approach - if the header component uses unstable_cache with this tag,
  // it will be revalidated. But for now, layout revalidation should work.
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

    // Also revalidate common pages for header updates
    const commonPaths = [
      '/',
      '/posts',
      '/categories',
      '/search',
      '/authors',
    ]

    // Execute all revalidations with layout revalidation (for header updates)
    for (const path of [...paths, ...commonPaths]) {
      try {
        revalidatePath(path)
        revalidatePath(path, 'layout') // This will revalidate the header since it's in the layout
      } catch (error) {
        payload.logger.error(
          `Failed to revalidate ${path}: ${error instanceof Error ? error.message : 'Unknown error'}`,
        )
      }
    }

    // Revalidate category tag
    revalidateTag('categories-header')
    payload.logger.info(`[category-delete] Revalidated category tag for header`)
  }

  return doc
}
