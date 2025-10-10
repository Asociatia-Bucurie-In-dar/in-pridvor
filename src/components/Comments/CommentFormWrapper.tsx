'use client'

import { CommentForm } from './CommentForm'
import { useRouter } from 'next/navigation'

interface CommentFormWrapperProps {
  postId: string
}

export function CommentFormWrapper({ postId }: CommentFormWrapperProps) {
  const router = useRouter()

  const handleCommentSubmitted = () => {
    // Refresh the page data to show the new comment count
    // Note: New comment won't show immediately as it needs moderation
    router.refresh()
  }

  return <CommentForm postId={postId} onCommentSubmitted={handleCommentSubmitted} />
}

