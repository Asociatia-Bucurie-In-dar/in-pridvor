'use client'

import React, { useEffect } from 'react'

interface PageClientProps {
  postId: number
}

const PageClient: React.FC<PageClientProps> = ({ postId }) => {
  useEffect(() => {
    // Automated browsers aren't readers.
    if (navigator.webdriver) return

    // Count a post once per browser session, not on every reload or back-navigation.
    const key = `viewed-post-${postId}`
    try {
      if (sessionStorage.getItem(key)) return
      sessionStorage.setItem(key, '1')
    } catch {
      // Storage blocked (private mode etc.) — still count the view.
    }

    const url = `/api/posts/${postId}/view`
    if (!navigator.sendBeacon?.(url)) {
      fetch(url, { method: 'POST', keepalive: true }).catch(() => {})
    }
  }, [postId])

  return <React.Fragment />
}

export default PageClient
