'use client'

import React, { useEffect, useState } from 'react'
import type { Post } from '@/payload-types'
import { AuthorLinks } from '@/components/AuthorLinks'

interface User {
  id: number
  name: string
}

interface EditableAuthorProps {
  post: Post
  authors: NonNullable<NonNullable<Post['populatedAuthors']>[number]>[]
  onUpdate: () => void
}

export const EditableAuthor: React.FC<EditableAuthorProps> = ({ post, authors, onUpdate }) => {
  const [isEditing, setIsEditing] = useState(false)
  const getInitialAuthorIds = (): number[] => {
    if (!post.authors) return []
    return post.authors
      .map((a) => {
        if (typeof a === 'number') return a
        if (typeof a === 'object' && a !== null && 'id' in a) return a.id
        return null
      })
      .filter((id): id is number => id !== null)
  }
  const [selectedAuthorIds, setSelectedAuthorIds] = useState<number[]>(getInitialAuthorIds())
  const [users, setUsers] = useState<User[]>([])
  const [isSaving, setIsSaving] = useState(false)

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const response = await fetch('/api/posts/options', {
          credentials: 'include',
        })
        if (response.ok) {
          const data = await response.json()
          setUsers(data.users || [])
        }
      } catch (error) {
        console.error('Error fetching users:', error)
      }
    }

    if (isEditing) {
      fetchUsers()
    }
  }, [isEditing])

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
          authors: selectedAuthorIds,
        }),
      })

      if (response.ok) {
        setIsEditing(false)
        onUpdate()
        window.location.reload()
      } else {
        const errorData = await response.json().catch(() => ({}))
        console.error('Failed to update authors:', response.status, errorData)
      }
    } catch (error) {
      console.error('Error updating authors:', error)
    } finally {
      setIsSaving(false)
    }
  }

  if (!isEditing) {
    return (
      <div className="flex flex-col gap-1">
        <div className="flex items-center gap-2">
          <p className="text-sm">Autor</p>
          <button
            onClick={(e) => {
              e.stopPropagation()
              setIsEditing(true)
            }}
            className="text-xs opacity-80 hover:opacity-100 underline text-white hover:text-gray-200 ml-1"
            title="Edit author"
          >
            [edit]
          </button>
        </div>
        <p>
          {authors.length > 0 ? (
            <AuthorLinks authors={authors} />
          ) : (
            <span className="text-gray-400">Click [edit] to add author</span>
          )}
        </p>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-2">
      <p className="text-sm">Autor</p>
      <div className="flex flex-col gap-2">
        <select
          multiple
          value={selectedAuthorIds.map(String)}
          onChange={(e) => {
            const selected = Array.from(e.target.selectedOptions, (option) =>
              parseInt(option.value, 10),
            )
            setSelectedAuthorIds(selected)
          }}
          className="bg-gray-800 text-white border border-gray-600 rounded px-2 py-1 min-h-60"
          size={Math.min(users.length, 12)}
        >
          {users.map((user) => (
            <option key={user.id} value={user.id}>
              {user.name}
            </option>
          ))}
        </select>
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
              setSelectedAuthorIds(getInitialAuthorIds())
            }}
            className="bg-gray-600 text-white px-3 py-1 rounded text-sm hover:bg-gray-700"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  )
}
