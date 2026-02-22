import React from 'react'
import { getPayload } from 'payload'
import configPromise from '@payload-config'
import { unstable_cache } from 'next/cache'
import { CommentList } from './CommentList'
import { CommentFormWrapper } from './CommentFormWrapper'

interface CommentsProps {
  postId: string
}

const getCachedComments = unstable_cache(
  async (postId: string) => {
    const payload = await getPayload({ config: configPromise })

    const commentsData = await payload.find({
      collection: 'comments',
      where: {
        and: [{ post: { equals: postId } }, { status: { equals: 'approved' } }],
      },
      sort: '-createdAt',
      limit: 100,
      depth: 0,
      select: {
        name: true,
        comment: true,
        createdAt: true,
        parent: true,
      } as any,
    })

    return commentsData.docs.map((comment) => ({
      id: String(comment.id),
      name: comment.name,
      comment: comment.comment,
      createdAt:
        typeof comment.createdAt === 'string'
          ? comment.createdAt
          : new Date(comment.createdAt).toISOString(),
      parent: comment.parent
        ? typeof comment.parent === 'object' && comment.parent.id
          ? String(comment.parent.id)
          : String(comment.parent)
        : null,
    }))
  },
  ['post-comments'],
  { tags: ['comments'], revalidate: 300 },
)

export async function Comments({ postId }: CommentsProps) {
  const allComments = await getCachedComments(postId)

  // Organize comments into tree structure
  const buildCommentTree = (comments: typeof allComments) => {
    type CommentNode = (typeof allComments)[0] & { replies: CommentNode[] }

    const commentMap = new Map<string, CommentNode>()
    const rootComments: CommentNode[] = []

    // First pass: create map of all comments with empty replies array
    comments.forEach((comment) => {
      commentMap.set(comment.id, { ...comment, replies: [] })
    })

    // Second pass: organize into tree
    comments.forEach((comment) => {
      const commentWithReplies = commentMap.get(comment.id)
      if (!commentWithReplies) return

      if (comment.parent && commentMap.has(comment.parent)) {
        const parent = commentMap.get(comment.parent)
        if (!parent) return
        parent.replies.push(commentWithReplies)
      } else {
        rootComments.push(commentWithReplies)
      }
    })

    // Sort replies by date (oldest first for replies)
    const sortReplies = (commentList: CommentNode[]) => {
      commentList.forEach((comment) => {
        if (comment.replies && comment.replies.length > 0) {
          comment.replies.sort((a, b) => {
            const dateA = new Date(a.createdAt).getTime()
            const dateB = new Date(b.createdAt).getTime()
            return dateA - dateB
          })
          sortReplies(comment.replies)
        }
      })
    }

    sortReplies(rootComments)

    return rootComments
  }

  const comments = buildCommentTree(allComments)

  return (
    <div className="max-w-3xl mx-auto mt-16 mb-12">
      {/* <div className="mb-8">
        <h2 className="text-3xl font-bold font-playfair text-gray-900 mb-2">Comentarii</h2>
        <div className="h-1 w-20 bg-gray-900 rounded-full"></div>
      </div> */}
      <CommentList comments={comments} postId={postId} />
      <CommentFormWrapper postId={postId} />
    </div>
  )
}
