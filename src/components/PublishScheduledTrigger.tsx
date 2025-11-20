'use client'

import { useEffect } from 'react'

export const PublishScheduledTrigger: React.FC = () => {
  useEffect(() => {
    Promise.all([
      fetch('/api/publish-scheduled', { method: 'GET' }),
      fetch('/api/payload-jobs/run', { method: 'GET' }),
    ]).catch((error) => {
      console.error('Error checking scheduled posts:', error)
    })
  }, [])

  return null
}
