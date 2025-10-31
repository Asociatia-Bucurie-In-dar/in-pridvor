'use client'

import React, { useState } from 'react'
import type { Post } from '@/payload-types'

interface EditableDropCapProps {
  post: Post
  showDropCap: boolean
  dropCapIndex: number
  onUpdate: () => void
}

export const EditableDropCap: React.FC<EditableDropCapProps> = ({
  post,
  showDropCap,
  dropCapIndex,
  onUpdate,
}) => {
  const [isEditing, setIsEditing] = useState(false)
  const [enableDropCap, setEnableDropCap] = useState(showDropCap)
  const [dropCapParagraphIndex, setDropCapParagraphIndex] = useState(dropCapIndex)
  const [isSaving, setIsSaving] = useState(false)

  const handleSave = async () => {
    setIsSaving(true)
    try {
      const response = await fetch(`/api/posts/${post.id}/update`, {
        method: 'PATCH',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          enableDropCap,
          dropCapParagraphIndex,
        }),
      })

      if (response.ok) {
        setIsEditing(false)
        onUpdate()
        window.location.reload()
      } else {
        const errorData = await response.json().catch(() => ({}))
        console.error('Failed to update drop cap:', response.status, errorData)
      }
    } catch (error) {
      console.error('Error updating drop cap:', error)
    } finally {
      setIsSaving(false)
    }
  }

  if (!isEditing) {
    return (
      <div className="flex flex-col gap-1">
        <div className="flex items-center gap-2">
          <p className="text-sm">Drop Cap</p>
          <button
            onClick={(e) => {
              e.stopPropagation()
              setIsEditing(true)
            }}
            className="text-xs opacity-80 hover:opacity-100 underline text-white hover:text-gray-200 ml-1"
            title="Edit drop cap"
          >
            [edit]
          </button>
        </div>
        <p className="text-sm">
          {showDropCap ? `Enabled (Paragraph ${dropCapIndex})` : 'Disabled'}
        </p>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-2 bg-gray-800 p-3 rounded">
      <div className="flex items-center gap-2">
        <input
          type="checkbox"
          id="enableDropCap"
          checked={enableDropCap}
          onChange={(e) => setEnableDropCap(e.target.checked)}
          className="w-4 h-4"
        />
        <label htmlFor="enableDropCap" className="text-sm">
          Enable Drop Cap
        </label>
      </div>
      {enableDropCap && (
        <div className="flex items-center gap-2">
          <label htmlFor="dropCapIndex" className="text-sm">
            Paragraph Index:
          </label>
          <input
            type="number"
            id="dropCapIndex"
            min={1}
            max={10}
            value={dropCapParagraphIndex}
            onChange={(e) => setDropCapParagraphIndex(parseInt(e.target.value, 10) || 1)}
            className="bg-gray-700 text-white border border-gray-600 rounded px-2 py-1 w-20"
          />
        </div>
      )}
      <div className="flex gap-2">
        <button
          onClick={handleSave}
          disabled={isSaving}
          className="bg-white text-black px-3 py-1 rounded text-sm hover:bg-gray-200 disabled:opacity-50"
        >
          {isSaving ? 'Saving...' : 'Save'}
        </button>
        <button
          onClick={() => {
            setIsEditing(false)
            setEnableDropCap(showDropCap)
            setDropCapParagraphIndex(dropCapIndex)
          }}
          className="bg-gray-600 text-white px-3 py-1 rounded text-sm hover:bg-gray-700"
        >
          Cancel
        </button>
      </div>
    </div>
  )
}

