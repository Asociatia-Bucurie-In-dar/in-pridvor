import type { Payload } from 'payload'

type PostLike = {
  id?: number | string
}

type CommentLike = {
  post?: number | string | { id?: number | string } | null
}

export type PostWithCommentCount<T extends PostLike> = T & {
  commentsCount: number
}

export async function appendCommentCounts<T extends PostLike>(
  payload: Payload,
  posts: T[],
): Promise<PostWithCommentCount<T>[]> {
  const postIds = posts
    .map((post) => post.id)
    .filter((id): id is number | string => id !== undefined && id !== null)
    .map(String)

  if (postIds.length === 0) {
    return posts.map((post) => ({ ...post, commentsCount: 0 }))
  }

  const comments = await payload.find({
    collection: 'comments',
    depth: 0,
    limit: 0,
    pagination: false,
    overrideAccess: false,
    select: {
      post: true,
    },
    where: {
      and: [
        {
          post: {
            in: postIds,
          },
        },
        {
          status: {
            equals: 'approved',
          },
        },
      ],
    },
  })

  const counts = new Map<string, number>()

  comments.docs.forEach((comment) => {
    const post = (comment as CommentLike).post
    const postId =
      typeof post === 'object' && post !== null
        ? post.id !== undefined && post.id !== null
          ? String(post.id)
          : null
        : post !== undefined && post !== null
          ? String(post)
          : null

    if (!postId) return

    counts.set(postId, (counts.get(postId) || 0) + 1)
  })

  return posts.map((post) => ({
    ...post,
    commentsCount: post.id === undefined || post.id === null ? 0 : counts.get(String(post.id)) || 0,
  }))
}
