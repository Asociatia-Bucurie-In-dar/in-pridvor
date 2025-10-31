'use client'

import React, { useState } from 'react'
import type { Post } from '@/payload-types'

interface EditableHeroImageAlignmentProps {
  post: Post
  alignment: string
  onUpdate: () => void
}

const alignmentOptions = [
  { label: 'Top', value: 'top' },
  { label: 'Upper Center', value: 'upper-center' },
  { label: 'Centered', value: 'centered' },
  { label: 'Lower Center', value: 'lower-center' },
  { label: 'Bottom', value: 'bottom' },
]

export const EditableHeroImageAlignment: React.FC<EditableHeroImageAlignmentProps> = ({
  post,
  alignment,
  onUpdate,
}) => {
  const [isEditing, setIsEditing] = useState(false)
  const [selectedAlignment, setSelectedAlignment] = useState(alignment || 'centered')
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
          heroImageAlignment: selectedAlignment,
        }),
      })

      if (response.ok) {
        setIsEditing(false)
        onUpdate()
        window.location.reload()
      } else {
        const errorData = await response.json().catch(() => ({}))
        console.error('Failed to update hero image alignment:', response.status, errorData)
      }
    } catch (error) {
      console.error('Error updating hero image alignment:', error)
    } finally {
      setIsSaving(false)
    }
  }

  const currentAlignmentLabel =
    alignmentOptions.find((opt) => opt.value === alignment)?.label || 'Centered'

  if (!isEditing) {
    return (
      <div className="flex flex-col gap-1">
        <div className="flex items-center gap-2">
          <p className="text-sm">Image Alignment</p>
          <button
            onClick={(e) => {
              e.stopPropagation()
              setIsEditing(true)
            }}
            className="text-xs opacity-80 hover:opacity-100 underline text-white hover:text-gray-200 ml-1"
            title="Edit image alignment"
          >
            [edit]
          </button>
        </div>
        <p className="text-sm">{currentAlignmentLabel}</p>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-2 bg-gray-800 p-3 rounded">
      <div className="flex items-center gap-2">
        <label htmlFor="heroImageAlignment" className="text-sm">
          Image Alignment:
        </label>
        <select
          id="heroImageAlignment"
          value={selectedAlignment}
          onChange={(e) => setSelectedAlignment(e.target.value)}
          className="bg-gray-700 text-white border border-gray-600 rounded px-2 py-1"
        >
          {alignmentOptions.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </div>
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
            setSelectedAlignment(alignment || 'centered')
          }}
          className="bg-gray-600 text-white px-3 py-1 rounded text-sm hover:bg-gray-700"
        >
          Cancel
        </button>
      </div>
    </div>
  )
}

