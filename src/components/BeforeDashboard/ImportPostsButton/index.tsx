'use client'

import React, { useState } from 'react'

import { Button } from '@payloadcms/ui'

export const ImportPostsButton: React.FC = () => {
  const [isImporting, setIsImporting] = useState(false)
  const [result, setResult] = useState<{
    success: boolean
    imported: number
    errors: number
    total: number
    errorList: string[]
  } | null>(null)

  const handleImport = async () => {
    setIsImporting(true)
    setResult(null)

    try {
      const response = await fetch('/next/import-posts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      })

      const data = await response.json()

      if (response.ok) {
        setResult(data)
      } else {
        setResult({
          success: false,
          imported: 0,
          errors: 1,
          total: 0,
          errorList: [data.message || 'Import failed'],
        })
      }
    } catch (error) {
      setResult({
        success: false,
        imported: 0,
        errors: 1,
        total: 0,
        errorList: [error instanceof Error ? error.message : 'Unknown error'],
      })
    } finally {
      setIsImporting(false)
    }
  }

  return (
    <div style={{ padding: '20px', maxWidth: '600px' }}>
      <h2>Import WordPress Posts</h2>
      <p>
        Import all 328 posts from the generated XML data. All posts will be assigned to &quot;Anca
        Stanciu&quot; user.
      </p>

      <Button onClick={handleImport} disabled={isImporting}>
        {isImporting ? 'Importing...' : 'Import Posts'}
      </Button>

      {result && (
        <div
          style={{
            padding: '15px',
            border: `1px solid ${result.success ? '#4CAF50' : '#f44336'}`,
            borderRadius: '4px',
            backgroundColor: result.success ? '#f1f8e9' : '#ffebee',
          }}
        >
          <h3 style={{ color: result.success ? '#2e7d32' : '#c62828', margin: '0 0 10px 0' }}>
            {result.success ? '✅ Import Successful!' : '❌ Import Failed'}
          </h3>

          <div style={{ marginBottom: '10px' }}>
            <strong>Total posts:</strong> {result.total}
            <br />
            <strong>Imported:</strong> {result.imported}
            <br />
            <strong>Errors:</strong> {result.errors}
            <br />
            <strong>Success rate:</strong>{' '}
            {result.total > 0 ? ((result.imported / result.total) * 100).toFixed(1) : 0}%
          </div>

          {result.errorList && result.errorList.length > 0 && (
            <div>
              <strong>Errors:</strong>
              <ul style={{ margin: '5px 0', paddingLeft: '20px' }}>
                {result.errorList.map((error, index) => (
                  <li key={index} style={{ fontSize: '12px', color: '#666' }}>
                    {error}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {result.success && result.imported > 0 && (
            <div style={{ marginTop: '10px', color: '#2e7d32' }}>
              🎉 All posts have been imported successfully! Check the Posts section to verify.
            </div>
          )}
        </div>
      )}
    </div>
  )
}
