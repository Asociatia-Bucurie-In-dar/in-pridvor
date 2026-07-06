'use client'

import React, { useEffect, useRef } from 'react'

interface PageClientProps {
  postId: number
}

const PageClient: React.FC<PageClientProps> = ({ postId }) => {
  const hasTrackedView = useRef(false)

  useEffect(() => {
    if (hasTrackedView.current) return

    const trackView = async () => {
      try {
        await fetch(`/api/posts/${postId}/view`, {
          method: 'POST',
        })
        hasTrackedView.current = true
      } catch (error) {
        console.error('Failed to track view:', error)
      }
    }

    trackView()
  }, [postId])

  return <React.Fragment />
}

export default PageClient
