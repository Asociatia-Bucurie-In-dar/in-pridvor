'use client'

import React, { useEffect, useState } from 'react'
import type { Post } from '@/payload-types'

interface Category {
  id: number
  title: string
  slug: string
}

interface EditableCategoriesProps {
  post: Post
  categories: NonNullable<Post['categories']>
  onUpdate: () => void
}

export const EditableCategories: React.FC<EditableCategoriesProps> = ({
  post,
  categories,
  onUpdate,
}) => {
  const [isEditing, setIsEditing] = useState(false)
  const [selectedCategoryIds, setSelectedCategoryIds] = useState<number[]>(
    categories
      ?.filter((c): c is number => typeof c === 'number')
      .concat(
        categories
          ?.filter((c): c is NonNullable<Post['categories']>[number] & { id: number } => {
            return typeof c === 'object' && c !== null && 'id' in c
          })
          .map((c) => c.id) || [],
      ) || [],
  )
  const [availableCategories, setAvailableCategories] = useState<Category[]>([])
  const [isSaving, setIsSaving] = useState(false)

  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const response = await fetch('/api/posts/options', {
          credentials: 'include',
        })
        if (response.ok) {
          const data = await response.json()
          setAvailableCategories(data.categories || [])
        }
      } catch (error) {
        console.error('Error fetching categories:', error)
      }
    }

    if (isEditing) {
      fetchCategories()
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
          categories: selectedCategoryIds,
        }),
      })

      if (response.ok) {
        setIsEditing(false)
        onUpdate()
        window.location.reload()
      } else {
        const errorData = await response.json().catch(() => ({}))
        console.error('Failed to update categories:', response.status, errorData)
      }
    } catch (error) {
      console.error('Error updating categories:', error)
    } finally {
      setIsSaving(false)
    }
  }

  const currentCategories =
    categories?.filter((c): c is NonNullable<Post['categories']>[number] & { title: string } => {
      return typeof c === 'object' && c !== null && 'title' in c
    }) || []

  if (!isEditing) {
    return (
      <div className="uppercase text-sm mb-6">
        <div className="flex items-center gap-2">
          {currentCategories.length > 0 ? (
            <span>
              {currentCategories.map((category, index) => {
                const isLast = index === currentCategories.length - 1
                return (
                  <React.Fragment key={index}>
                    {category.title}
                    {!isLast && ', '}
                  </React.Fragment>
                )
              })}
            </span>
          ) : (
            <span className="text-gray-400">No categories</span>
          )}
          <button
            onClick={(e) => {
              e.stopPropagation()
              setIsEditing(true)
            }}
            className="text-xs opacity-80 hover:opacity-100 underline text-white hover:text-gray-200 ml-1 normal-case"
            title="Edit categories"
          >
            [edit]
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="uppercase text-sm mb-6">
      <div className="flex flex-col gap-2">
        <select
          multiple
          value={selectedCategoryIds.map(String)}
          onChange={(e) => {
            const selected = Array.from(e.target.selectedOptions, (option) =>
              parseInt(option.value, 10),
            )
            setSelectedCategoryIds(selected)
          }}
          className="bg-gray-800 text-white border border-gray-600 rounded px-2 py-1 min-h-60 uppercase"
          size={Math.min(availableCategories.length, 12)}
        >
          {availableCategories.map((category) => (
            <option key={category.id} value={category.id}>
              {category.title}
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
              setSelectedCategoryIds(
                categories
                  ?.filter((c): c is number => typeof c === 'number')
                  .concat(
                    categories
                      ?.filter(
                        (c): c is NonNullable<Post['categories']>[number] & { id: number } => {
                          return typeof c === 'object' && c !== null && 'id' in c
                        },
                      )
                      .map((c) => c.id) || [],
                  ) || [],
              )
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
