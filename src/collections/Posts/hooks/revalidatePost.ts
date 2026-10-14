import type { CollectionAfterChangeHook, CollectionAfterDeleteHook } from 'payload'

import type { Post } from '../../../payload-types'
import {
  expireTag,
  PUBLISH_SCHEDULE_TAG,
  revalidatePost as revalidatePostPage,
  revalidatePostListings,
} from '@/utilities/revalidate'

export const revalidatePost: CollectionAfterChangeHook<Post> = ({
  doc,
  previousDoc,
  req: { payload, context },
}) => {
  // Any save can add, move or remove a scheduled publish date.
  expireTag(PUBLISH_SCHEDULE_TAG)

  if (context.disableRevalidate) return doc

  const wasPublished = previousDoc?._status === 'published'
  const isPublished = doc._status === 'published'

  // Draft saves (incl. autosave) don't change what visitors see.
  if (!isPublished && !wasPublished) return doc

  payload.logger.info(`Revalidating post "${doc.slug}" and post listings`)

  revalidatePostPage(doc.slug)
  if (previousDoc?.slug && previousDoc.slug !== doc.slug) {
    revalidatePostPage(previousDoc.slug)
  }
  revalidatePostListings()

  return doc
}

export const revalidateDelete: CollectionAfterDeleteHook<Post> = ({
  doc,
  req: { context },
}) => {
  expireTag(PUBLISH_SCHEDULE_TAG)

  if (!context.disableRevalidate && doc) {
    revalidatePostPage(doc.slug)
    revalidatePostListings()
  }

  return doc
}
