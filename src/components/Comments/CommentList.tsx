import React from 'react'
import { formatDateTime } from '@/utilities/formatDateTime'

interface Comment {
  id: string
  name: string
  comment: string
  createdAt: string
}

interface CommentListProps {
  comments: Comment[]
}

export function CommentList({ comments }: CommentListProps) {
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
          {comments.length} {comments.length === 1 ? 'Comentariu' : 'Comentarii'}
        </h3>
        <div className="flex-1 h-px bg-gray-200"></div>
      </div>

      <div className="space-y-4">
        {comments.map((comment) => (
          <article
            key={comment.id}
            className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 transition-all duration-200 hover:shadow-md hover:border-gray-300"
          >
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center gap-2">
                <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center">
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
          </article>
        ))}
      </div>
    </div>
  )
}
