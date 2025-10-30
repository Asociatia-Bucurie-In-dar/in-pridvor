'use client'

import React, { useState } from 'react'
import { Button, toast } from '@payloadcms/ui'

interface IncrementalResult {
  success: boolean
  imported: number
  skipped: number
  errors: number
  totalInXml: number
  errorList: string[]
  unmatchedCategoriesReport?: string[]
  postsWithUnmatchedCategories?: number
}

interface ReformatResult {
  success: boolean
  updated: number
  skipped: number
  errors: number
  total: number
  errorList: string[]
}

export const ImportPostsWidget: React.FC = () => {
  const [isIncrementalImporting, setIsIncrementalImporting] = useState(false)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [isReformatting, setIsReformatting] = useState(false)

  const [incrementalResult, setIncrementalResult] = useState<IncrementalResult | null>(null)
  const [reformatResult, setReformatResult] = useState<ReformatResult | null>(null)

  const handleIncrementalImport = async () => {
    if (!selectedFile) {
      alert('Please select an XML file first')
      return
    }

    setIsIncrementalImporting(true)
    setIncrementalResult(null)

    try {
      const formData = new FormData()
      formData.append('file', selectedFile)

      const response = await fetch('/next/incremental-import', {
        method: 'POST',
        body: formData,
      })

      const data = await response.json()

      if (response.ok) {
        setIncrementalResult({
          success: true,
          imported: data.imported,
          skipped: data.skipped,
          errors: data.errors,
          totalInXml: data.totalInXml,
          errorList: data.errorList || [],
          unmatchedCategoriesReport: data.unmatchedCategoriesReport || [],
          postsWithUnmatchedCategories: data.postsWithUnmatchedCategories || 0,
        })
        setSelectedFile(null) // Clear file after successful import
        toast.success('Incremental import completed!')
      } else {
        setIncrementalResult({
          success: false,
          imported: data.imported || 0,
          skipped: data.skipped || 0,
          errors: data.errors || 1,
          totalInXml: data.totalInXml || 0,
          errorList: [data.message || 'Incremental import failed'],
        })
        toast.error(`Incremental import failed: ${data.message || 'Unknown error'}`)
      }
    } catch (error: any) {
      console.error('Incremental import error:', error)
      setIncrementalResult({
        success: false,
        imported: 0,
        skipped: 0,
        errors: 1,
        totalInXml: 0,
        errorList: [error instanceof Error ? error.message : 'Unknown error'],
      })
      toast.error(`Incremental import failed: ${error.message || 'Unknown error'}`)
    } finally {
      setIsIncrementalImporting(false)
    }
  }

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) {
      setSelectedFile(file)
      setIncrementalResult(null)
    }
  }

  const handleReformat = async () => {
    if (
      !confirm(
        'This will reformat the content of all existing posts with proper formatting (bold, italic, paragraphs, etc.). Continue?',
      )
    ) {
      return
    }

    setIsReformatting(true)
    setReformatResult(null)

    try {
      const response = await fetch('/next/reformat-content', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      })

      const data = await response.json()

      if (response.ok) {
        setReformatResult({
          success: true,
          updated: data.updated,
          skipped: data.skipped,
          errors: data.errors,
          total: data.total,
          errorList: data.errorList || [],
        })
        toast.success('Content reformatting completed!')
      } else {
        setReformatResult({
          success: false,
          updated: data.updated || 0,
          skipped: data.skipped || 0,
          errors: data.errors || 1,
          total: data.total || 0,
          errorList: [data.message || 'Reformatting failed'],
        })
        toast.error(`Reformatting failed: ${data.message || 'Unknown error'}`)
      }
    } catch (error: any) {
      console.error('Reformatting error:', error)
      setReformatResult({
        success: false,
        updated: 0,
        skipped: 0,
        errors: 1,
        total: 0,
        errorList: [error instanceof Error ? error.message : 'Unknown error'],
      })
      toast.error(`Reformatting failed: ${error.message || 'Unknown error'}`)
    } finally {
      setIsReformatting(false)
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
      <h3 style={{ margin: '0 0 15px 0', color: '#1a1a1a' }}>WordPress Import Tools</h3>

      {/* Incremental Import Section */}
      <div
        style={{
          padding: '20px',
          backgroundColor: '#e8f5e9',
          borderRadius: '8px',
          marginBottom: '20px',
          border: '2px solid #4CAF50',
        }}
      >
        <h4 style={{ margin: '0 0 10px 0', color: '#2e7d32' }}>🆕 Import New Articles from XML</h4>
        <p style={{ margin: '0 0 15px 0', color: '#666', fontSize: '14px' }}>
          Upload a WordPress XML file to import only new articles. Existing articles will be left
          untouched. Images will be automatically matched to your R2 bucket.
        </p>

        <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
          <input
            type="file"
            accept=".xml"
            onChange={handleFileChange}
            style={{
              padding: '8px 12px',
              border: '2px solid #4CAF50',
              borderRadius: '4px',
              backgroundColor: 'white',
              cursor: 'pointer',
              fontSize: '14px',
            }}
          />
          {selectedFile && (
            <span style={{ color: '#2e7d32', fontSize: '14px', fontWeight: 'bold' }}>
              ✓ {selectedFile.name}
            </span>
          )}
          <Button
            onClick={handleIncrementalImport}
            disabled={!selectedFile || isIncrementalImporting}
          >
            {isIncrementalImporting ? 'Importing...' : '📥 Import New Articles'}
          </Button>
        </div>
      </div>

      <hr style={{ margin: '20px 0', border: 'none', borderTop: '1px solid #e1e5e9' }} />

      {/* Content Formatting Section */}
      <h4 style={{ margin: '0 0 10px 0', color: '#666' }}>✨ Content Formatting</h4>
      <div style={{ marginBottom: '20px' }}>
        <p style={{ margin: '0 0 10px 0', color: '#666', fontSize: '14px' }}>
          Reformat all existing posts to preserve HTML formatting (bold, italic, paragraphs, lists,
          etc.) from the original XML.
        </p>
        <Button onClick={handleReformat} disabled={isReformatting}>
          {isReformatting ? 'Reformatting...' : '✨ Fix Formatting for All Posts'}
        </Button>
      </div>

      {/* Results Display */}
      {incrementalResult && (
        <div
          style={{
            marginTop: '15px',
            padding: '15px',
            border: `1px solid ${incrementalResult.success ? '#4CAF50' : '#f44336'}`,
            borderRadius: '4px',
            backgroundColor: incrementalResult.success ? '#e8f5e9' : '#ffebee',
          }}
        >
          <h4
            style={{
              color: incrementalResult.success ? '#2e7d32' : '#c62828',
              margin: '0 0 10px 0',
              fontSize: '16px',
            }}
          >
            {incrementalResult.success
              ? '✅ Incremental Import Complete!'
              : '❌ Incremental Import Failed'}
          </h4>

          <div style={{ marginBottom: '10px', fontSize: '14px' }}>
            <strong>Total posts in XML:</strong> {incrementalResult.totalInXml}
            <br />
            <strong>Already existing (skipped):</strong> {incrementalResult.skipped}
            <br />
            <strong>New posts imported:</strong> {incrementalResult.imported}
            <br />
            <strong>Errors:</strong> {incrementalResult.errors}
            <br />
          </div>

          {incrementalResult.errors > 0 && (
            <div>
              <h4>First 10 Errors:</h4>
              <ul style={{ color: '#c62828', margin: '0', paddingLeft: '20px' }}>
                {incrementalResult.errorList.map((err, index) => (
                  <li key={index}>{err}</li>
                ))}
              </ul>
            </div>
          )}

          {incrementalResult.success && incrementalResult.imported > 0 && (
            <div style={{ marginTop: '10px', color: '#2e7d32', fontSize: '14px' }}>
              🎉 Successfully imported {incrementalResult.imported} new articles! Existing articles
              were preserved.
            </div>
          )}

          {incrementalResult.success && incrementalResult.imported === 0 && (
            <div style={{ marginTop: '10px', color: '#ff9800', fontSize: '14px' }}>
              ℹ️ No new articles found in the XML file. All articles already exist in your database.
            </div>
          )}

          {incrementalResult.unmatchedCategoriesReport &&
            incrementalResult.unmatchedCategoriesReport.length > 0 && (
              <div
                style={{
                  marginTop: '15px',
                  padding: '10px',
                  backgroundColor: '#fff3cd',
                  border: '1px solid #ffc107',
                  borderRadius: '4px',
                }}
              >
                <h5 style={{ margin: '0 0 10px 0', color: '#856404', fontSize: '14px' }}>
                  ⚠️ Categories Not Found ({incrementalResult.postsWithUnmatchedCategories}{' '}
                  {incrementalResult.postsWithUnmatchedCategories === 1 ? 'post' : 'posts'})
                </h5>
                <div style={{ color: '#856404', fontSize: '12px', whiteSpace: 'pre-wrap' }}>
                  {incrementalResult.unmatchedCategoriesReport.join('\n')}
                </div>
                <p style={{ margin: '10px 0 0 0', color: '#856404', fontSize: '12px' }}>
                  These categories from WordPress don't exist in your database. These posts were
                  imported without categories. You can manually assign categories later.
                </p>
              </div>
            )}
        </div>
      )}

      {reformatResult && (
        <div
          style={{
            marginTop: '15px',
            padding: '15px',
            border: `1px solid ${reformatResult.success ? '#4CAF50' : '#f44336'}`,
            borderRadius: '4px',
            backgroundColor: reformatResult.success ? '#f1f8e9' : '#ffebee',
          }}
        >
          <h4
            style={{
              color: reformatResult.success ? '#2e7d32' : '#c62828',
              margin: '0 0 10px 0',
              fontSize: '16px',
            }}
          >
            {reformatResult.success
              ? '✅ Content Reformatting Complete!'
              : '❌ Reformatting Failed'}
          </h4>

          <div style={{ marginBottom: '10px', fontSize: '14px' }}>
            <strong>Total posts:</strong> {reformatResult.total}
            <br />
            <strong>Updated with formatting:</strong> {reformatResult.updated}
            <br />
            <strong>Skipped:</strong> {reformatResult.skipped}
            <br />
            <strong>Errors:</strong> {reformatResult.errors}
            <br />
            <strong>Success rate:</strong>{' '}
            {reformatResult.total > 0
              ? ((reformatResult.updated / reformatResult.total) * 100).toFixed(1)
              : 0}
            %
          </div>

          {reformatResult.errors > 0 && (
            <div>
              <h4>First 10 Errors:</h4>
              <ul style={{ color: '#c62828', margin: '0', paddingLeft: '20px' }}>
                {reformatResult.errorList.map((err, index) => (
                  <li key={index}>{err}</li>
                ))}
              </ul>
            </div>
          )}

          {reformatResult.success && reformatResult.updated > 0 && (
            <div style={{ marginTop: '10px', color: '#2e7d32', fontSize: '14px' }}>
              ✨ Successfully reformatted {reformatResult.updated} posts with proper HTML
              formatting! Bold, italic, paragraphs, lists, and line breaks are now preserved.
            </div>
          )}
        </div>
      )}
    </div>
  )
}
