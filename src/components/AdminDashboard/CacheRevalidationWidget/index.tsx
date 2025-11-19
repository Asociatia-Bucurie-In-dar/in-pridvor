'use client'

import React, { useState } from 'react'
import { Button, toast } from '@payloadcms/ui'

interface RevalidationResult {
  success: boolean
  published: number
  revalidated: number
  checked: number
  message?: string
}

export const CacheRevalidationWidget: React.FC = () => {
  const [isRevalidating, setIsRevalidating] = useState(false)
  const [result, setResult] = useState<RevalidationResult | null>(null)

  const handleRevalidate = async () => {
    setIsRevalidating(true)
    setResult(null)

    try {
      const response = await fetch('/api/publish-scheduled', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      })

      const data = await response.json()

      if (response.ok) {
        setResult({
          success: true,
          published: data.published || 0,
          revalidated: data.revalidated || 0,
          checked: data.checked || 0,
        })
        toast.success('Cache revalidation completed!')
      } else {
        setResult({
          success: false,
          published: 0,
          revalidated: 0,
          checked: 0,
          message: data.error || 'Revalidation failed',
        })
        toast.error(`Cache revalidation failed: ${data.error || 'Unknown error'}`)
      }
    } catch (error: any) {
      console.error('Revalidation error:', error)
      setResult({
        success: false,
        published: 0,
        revalidated: 0,
        checked: 0,
        message: error instanceof Error ? error.message : 'Unknown error',
      })
      toast.error(`Cache revalidation failed: ${error.message || 'Unknown error'}`)
    } finally {
      setIsRevalidating(false)
    }
  }

  return (
    <div
      style={{
        padding: '20px',
        margin: '20px 0',
        border: '1px solid #e1e5e9',
        borderRadius: '8px',
        backgroundColor: '#f8f9fa',
      }}
    >
      <h3 style={{ margin: '0 0 15px 0', color: '#1a1a1a' }}>Cache Revalidation</h3>

      <div style={{ marginBottom: '20px' }}>
        <p style={{ margin: '0 0 15px 0', color: '#666', fontSize: '14px' }}>
          Manually trigger cache revalidation for scheduled posts. This will:
        </p>
        <ul style={{ margin: '0 0 15px 0', paddingLeft: '20px', color: '#666', fontSize: '14px' }}>
          <li>Publish any draft posts with past <code>publishedAt</code> dates</li>
          <li>Revalidate cache for published posts that became active in the last 24 hours</li>
          <li>Update homepage, posts pages, and category pages</li>
        </ul>
        <Button onClick={handleRevalidate} disabled={isRevalidating}>
          {isRevalidating ? 'Revalidating...' : '🔄 Force Cache Revalidation'}
        </Button>
      </div>

      {result && (
        <div
          style={{
            marginTop: '15px',
            padding: '15px',
            border: `1px solid ${result.success ? '#4CAF50' : '#f44336'}`,
            borderRadius: '4px',
            backgroundColor: result.success ? '#e8f5e9' : '#ffebee',
          }}
        >
          <h4
            style={{
              color: result.success ? '#2e7d32' : '#c62828',
              margin: '0 0 10px 0',
              fontSize: '16px',
            }}
          >
            {result.success
              ? '✅ Cache Revalidation Complete!'
              : '❌ Revalidation Failed'}
          </h4>

          <div style={{ marginBottom: '10px', fontSize: '14px' }}>
            <strong>Posts checked:</strong> {result.checked}
            <br />
            {result.published > 0 && (
              <>
                <strong>Draft posts published:</strong> {result.published}
                <br />
              </>
            )}
            {result.revalidated > 0 && (
              <>
                <strong>Cache revalidations:</strong> {result.revalidated}
                <br />
              </>
            )}
          </div>

          {result.success && result.published === 0 && result.revalidated === 0 && (
            <div style={{ marginTop: '10px', color: '#666', fontSize: '14px' }}>
              ℹ️ No scheduled posts needed revalidation at this time.
            </div>
          )}

          {result.success && (result.published > 0 || result.revalidated > 0) && (
            <div style={{ marginTop: '10px', color: '#2e7d32', fontSize: '14px' }}>
              ✅ Cache has been revalidated! Pages will show updated content on the next request.
            </div>
          )}

          {!result.success && result.message && (
            <div style={{ marginTop: '10px', color: '#c62828', fontSize: '14px' }}>
              ❌ Error: {result.message}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

