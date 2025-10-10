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
    id: comment.id,
    name: comment.name,
    comment: comment.comment,
    createdAt: comment.createdAt,
  }))

  return (
    <div className="max-w-3xl mx-auto mt-12">
      <CommentList comments={comments} />
      <CommentFormWrapper postId={postId} />
    </div>
  )
}

