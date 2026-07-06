'use client'
import React, { useState } from 'react'
import { useDocumentInfo, useConfig, Button, toast } from '@payloadcms/ui'
import { useRouter } from 'next/navigation'

export const AITranslate: React.FC = () => {
  const { id, collectionSlug } = useDocumentInfo()
  const { config } = useConfig()
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  const handleTranslate = async () => {
    if (!id) return

    setLoading(true)
    
    try {
      await toast.promise(
        fetch(`${config.routes.api}/${collectionSlug}/${id}/translate`, {
          method: 'POST',
        }).then(async (response) => {
          const result = await response.json()
          if (response.ok && result.success) {
            return result
          }
          throw new Error(result.error || 'Unknown error occurred')
        }),
        {
          loading: 'AI Translation in progress...',
          success: () => {
            router.refresh()
            return 'Successfully translated content to English!'
          },
          error: (err) => `Translation failed: ${err instanceof Error ? err.message : 'Unknown error'}`,
        }
      )
    } catch (error) {
      console.error('Translation error:', error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ marginBottom: '20px' }}>
      <Button
        buttonStyle="secondary"
        onClick={handleTranslate}
        disabled={loading || !id}
      >
        {loading ? 'Translating...' : 'Translate to English (Gemini)'}
      </Button>
      <p style={{ fontSize: '12px', marginTop: '8px', color: '#666' }}>
        Translates current Romanian version to English. 
        <strong> Note:</strong> Uses Gemini 2.5 Flash. Limited to 2 requests per minute.
      </p>
    </div>
  )
}
