'use client'

import React from 'react'
import { useAdmin } from '@/contexts/AdminContext'
import { getClientSideURL } from '@/utilities/getURL'
import Link from 'next/link'

interface EditPostLinkProps {
  postId: string | number
}

export const EditPostLink: React.FC<EditPostLinkProps> = ({ postId }) => {
  const { isAdmin } = useAdmin()

  if (!isAdmin) return null

  const editUrl = `${getClientSideURL()}/admin/collections/posts/${postId}`

  return (
    <Link
      href={editUrl}
      target="_blank"
      rel="noopener noreferrer"
      className="fixed bottom-8 right-8 z-50 flex items-center gap-2 rounded-full bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-lg transition-all hover:bg-blue-700 hover:shadow-xl"
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        className="h-4 w-4"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={2}
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
        />
      </svg>
      Editare articol
    </Link>
  )
}
