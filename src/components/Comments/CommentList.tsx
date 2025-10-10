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
      <div className="mt-8">
        <h3 className="text-2xl font-semibold mb-4 font-playfair">Comentarii</h3>
        <p className="text-muted-foreground">
          Niciun comentariu încă. Fii primul care comentează!
        </p>
      </div>
    )
  }

  return (
    <div className="mt-8">
      <h3 className="text-2xl font-semibold mb-6 font-playfair">
        Comentarii ({comments.length})
      </h3>

      <div className="space-y-6">
        {comments.map((comment) => (
          <div
            key={comment.id}
            className="p-4 bg-card border border-border rounded-lg hover:shadow-sm transition-shadow"
          >
            <div className="flex items-center justify-between mb-2">
              <h4 className="font-semibold text-foreground">{comment.name}</h4>
              <time className="text-sm text-muted-foreground" dateTime={comment.createdAt}>
                {formatDateTime({
                  timestamp: comment.createdAt,
                  format: 'short',
                })}
              </time>
            </div>
            <p className="text-foreground whitespace-pre-wrap">{comment.comment}</p>
          </div>
        ))}
      </div>
    </div>
  )
}

