'use client'

import React from 'react'
import Link from 'next/link'
import type { Post } from '@/payload-types'

interface CategoryLinksProps {
  categories: NonNullable<NonNullable<Post['categories']>[number]>[]
  className?: string
}

export const CategoryLinks: React.FC<CategoryLinksProps> = ({ categories, className = '' }) => {
  const validCategories = categories.filter((cat) => typeof cat === 'object' && cat !== null)

  if (validCategories.length === 0) return null

  return (
    <span className={className}>
      {validCategories.map((category, index) => {
        if (typeof category !== 'object' || category === null) return null
        
        const titleToUse = category.title || 'Untitled category'
        const isLast = index === validCategories.length - 1

        return (
          <React.Fragment key={index}>
            <Link
              href={`/categories/${category.slug}`}
              className="relative z-10 hover:underline"
            >
              {titleToUse}
            </Link>
            {!isLast && <React.Fragment>, &nbsp;</React.Fragment>}
          </React.Fragment>
        )
      })}
    </span>
  )
}

