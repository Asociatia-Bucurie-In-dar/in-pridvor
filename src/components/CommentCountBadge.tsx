import { MessageCircle } from 'lucide-react'
import React from 'react'

import { cn } from '@/utilities/ui'

type CommentCountBadgeProps = {
  className?: string
  count: number
}

export function CommentCountBadge({ className, count }: CommentCountBadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 whitespace-nowrap text-sm font-medium text-gray-500',
        className,
      )}
    >
      <MessageCircle className="h-4 w-4 shrink-0" aria-hidden="true" />
      <span>{count}</span>
    </span>
  )
}
