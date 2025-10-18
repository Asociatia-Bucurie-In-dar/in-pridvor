import React from 'react'
import { getPayload } from 'payload'
import configPromise from '@payload-config'
import { CommentList } from './CommentList'
import { CommentFormWrapper } from './CommentFormWrapper'

interface CommentsProps {
  postId: string
}

export async function Comments({ postId }: CommentsProps) {
  const payload = await getPayload({ config: configPromise })

  // Fetch approved comments for this post
  const commentsData = await payload.find({
    collection: 'comments',
    where: {
      and: [
        {
          post: {
            equals: postId,
          },
        },
        {
          status: {
            equals: 'approved',
          },
        },
      ],
    },
    sort: '-createdAt',
    limit: 100,
  })

  const comments = commentsData.docs.map((comment) => ({
    id: String(comment.id),
    name: comment.name,
    comment: comment.comment,
    createdAt:
      typeof comment.createdAt === 'string'
        ? comment.createdAt
        : new Date(comment.createdAt).toISOString(),
  }))

  return (
    <div className="max-w-3xl mx-auto mt-16 mb-12">
      {/* <div className="mb-8">
        <h2 className="text-3xl font-bold font-playfair text-gray-900 mb-2">Comentarii</h2>
        <div className="h-1 w-20 bg-gray-900 rounded-full"></div>
      </div> */}
      <CommentList comments={comments} />
      <CommentFormWrapper postId={postId} />
    </div>
  )
}
