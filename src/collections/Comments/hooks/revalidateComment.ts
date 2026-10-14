import type { CollectionAfterChangeHook, CollectionAfterDeleteHook, PayloadRequest } from 'payload'

import {
  expireTag,
  LATEST_COMMENTS_TAG,
  revalidatePost,
  revalidatePostListings,
} from '@/utilities/revalidate'

type CommentDoc = {
  post?: number | string | { id?: number | string; slug?: string | null } | null
}

const resolvePostSlug = async (comment: CommentDoc, req: PayloadRequest) => {
  const post = comment.post
  if (!post) return null
  if (typeof post === 'object') {
    if (post.slug) return post.slug
    if (post.id == null) return null
  }

  const id = typeof post === 'object' ? post.id! : post
  const doc = await req.payload
    .findByID({ collection: 'posts', id, depth: 0, select: { slug: true }, req })
    .catch(() => null)
  return doc?.slug ?? null
}

/**
 * A comment shows up on its post page, in the "latest comments" blocks and as a
 * count on every post card, so all of those are invalidated.
 */
const revalidateForComment = async (comment: CommentDoc, req: PayloadRequest) => {
  if (req.context.disableRevalidate) return

  revalidatePost(await resolvePostSlug(comment, req))
  revalidatePostListings()
  expireTag(LATEST_COMMENTS_TAG)
}

export const revalidateComment: CollectionAfterChangeHook = async ({ doc, req }) => {
  await revalidateForComment(doc, req)
  return doc
}

export const revalidateCommentDelete: CollectionAfterDeleteHook = async ({ doc, req }) => {
  if (doc) await revalidateForComment(doc, req)
  return doc
}
