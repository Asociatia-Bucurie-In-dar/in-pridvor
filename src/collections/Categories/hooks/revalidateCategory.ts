import type { CollectionAfterChangeHook, CollectionAfterDeleteHook } from 'payload'

import type { Category } from '../../../payload-types'
import { expireHeaderCategories, revalidatePostListings } from '@/utilities/revalidate'

/**
 * Categories appear in the header (rendered by the layout, so on every page) and on
 * post cards. Expiring the header tag invalidates every page that rendered it.
 */
export const revalidateCategory: CollectionAfterChangeHook<Category> = ({
  doc,
  req: { payload, context },
}) => {
  if (context.disableRevalidate) return doc

  payload.logger.info(`[category-update] Revalidating header and post listings`)

  expireHeaderCategories()
  revalidatePostListings()

  return doc
}

export const revalidateCategoryDelete: CollectionAfterDeleteHook<Category> = ({
  doc,
  req: { context },
}) => {
  if (!context.disableRevalidate && doc) {
    expireHeaderCategories()
    revalidatePostListings()
  }

  return doc
}
