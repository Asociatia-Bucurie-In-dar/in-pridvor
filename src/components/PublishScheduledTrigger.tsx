'use client'

import { useEffect } from 'react'

const LAST_CHECK_KEY = 'lastScheduledCheck'
const CHECK_INTERVAL_MS = 60 * 1000

export const PublishScheduledTrigger: React.FC = () => {
  useEffect(() => {
    const lastCheck = typeof window !== 'undefined' 
      ? localStorage.getItem(LAST_CHECK_KEY) 
      : null
    
    const now = Date.now()
    const shouldCheck = !lastCheck || (now - parseInt(lastCheck, 10)) > CHECK_INTERVAL_MS

    if (shouldCheck && typeof window !== 'undefined') {
      localStorage.setItem(LAST_CHECK_KEY, now.toString())
      
      Promise.all([
        fetch('/api/publish-scheduled', { method: 'GET' }),
        fetch('/api/payload-jobs/run', { method: 'GET' }),
      ]).catch((error) => {
        console.error('Error checking scheduled posts:', error)
      })
    }
  }, [])

  return null
}
