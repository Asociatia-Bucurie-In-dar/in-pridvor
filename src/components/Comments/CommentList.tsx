'use client'

import React, { useState } from 'react'
import { formatDateTime } from '@/utilities/formatDateTime'
import { CommentForm } from './CommentForm'

interface Comment {
  id: string
  name: string
  comment: string
  createdAt: string
  parent?: string | null
  replies?: Comment[]
}

interface CommentListProps {
  comments: Comment[]
  postId: string
}

function countAllComments(comments: Comment[]): number {
  let count = comments.length
  comments.forEach((comment) => {
    if (comment.replies && comment.replies.length > 0) {
      count += countAllComments(comment.replies)
    }
  })
  return count
}

interface CommentItemProps {
  comment: Comment
  depth?: number
  postId: string
}

function CommentItem({ comment, depth = 0, postId }: CommentItemProps) {
  const [showReplyForm, setShowReplyForm] = useState(false)
  const maxDepth = 5
  const indentLevel = Math.min(depth, maxDepth)

  const handleReplySubmitted = () => {
    setShowReplyForm(false)
    window.location.reload()
  }

  const handleCancelReply = () => {
    setShowReplyForm(false)
  }

  return (
    <article
      className={`bg-white rounded-2xl shadow-sm border border-gray-200 p-6 transition-all duration-200 hover:shadow-md hover:border-gray-300 ${
        indentLevel > 0 ? 'ml-8 mt-4' : ''
      }`}
    >
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center flex-shrink-0">
            <span className="text-gray-600 font-semibold text-lg">
              {comment.name.charAt(0).toUpperCase()}
            </span>
          </div>
          <div>
            <h4 className="font-semibold text-gray-900">{comment.name}</h4>
            <time className="text-sm text-gray-500" dateTime={comment.createdAt}>
              {formatDateTime(comment.createdAt)}
            </time>
          </div>
        </div>
      </div>
      <p className="text-gray-700 leading-relaxed whitespace-pre-wrap ml-12">
        {comment.comment}
      </p>
      <div className="ml-12 mt-4">
        <button
          type="button"
          onClick={() => setShowReplyForm(!showReplyForm)}
          className="text-sm text-gray-600 hover:text-gray-900 font-medium underline"
        >
          {showReplyForm ? 'Anulează răspunsul' : 'Răspunde'}
        </button>
      </div>
      {showReplyForm && (
        <div className="mt-4 ml-8">
          <CommentForm
            postId={postId}
            parentId={comment.id}
            parentAuthor={comment.name}
            onCommentSubmitted={handleReplySubmitted}
            onCancel={handleCancelReply}
          />
        </div>
      )}
      {comment.replies && comment.replies.length > 0 && (
        <div className="mt-4 space-y-4">
          {comment.replies.map((reply) => (
            <CommentItem key={reply.id} comment={reply} depth={depth + 1} postId={postId} />
          ))}
        </div>
      )}
    </article>
  )
}

export function CommentList({ comments, postId }: CommentListProps) {
  const totalComments = countAllComments(comments)

  if (!comments || comments.length === 0) {
    return (
      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8 mb-8 transition-all duration-200">
        <p className="text-gray-500 text-center">
          Niciun comentariu încă. Fii primul care comentează!
        </p>
      </div>
    )
  }

  return (
    <div className="mb-8">
      <div className="flex items-center gap-3 mb-6">
        <h3 className="text-xl font-semibold font-playfair text-gray-900">
          {totalComments} {totalComments === 1 ? 'Comentariu' : 'Comentarii'}
        </h3>
        <div className="flex-1 h-px bg-gray-200"></div>
      </div>

      <div className="space-y-4">
        {comments.map((comment) => (
          <CommentItem key={comment.id} comment={comment} postId={postId} />
        ))}
      </div>
    </div>
  )
}
