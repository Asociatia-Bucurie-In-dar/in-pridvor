'use client'

import React from 'react'
import Link from 'next/link'

interface CategoryHeaderProps {
  categoryTitle: string
  categorySlug?: string | null
}

export const CategoryHeader: React.FC<CategoryHeaderProps> = ({ categoryTitle, categorySlug }) => {
  const hasValidSlug = categorySlug && categorySlug.trim() !== ''

  const content = (
    <div className="group inline-flex items-center gap-1">
      <h2 className="font-playfair text-2xl lg:text-3xl tracking-normal text-gray-900 transition-colors group-hover:text-gray-600">
        {categoryTitle}
      </h2>
      {hasValidSlug && (
        <div className="relative flex text-yellow-500 h-8 w-8 items-center justify-center self-center sm:h-8 sm:w-8">
          <svg
            className="h-full w-full transition-colors"
            viewBox="0 0 50 50"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            {/* Filled background circle - offset for shadow effect */}
            <circle cx="30" cy="31" r="19" fill="currentColor" className=" opacity-15" />
            {/* Main circle outline */}
            <circle
              cx="24"
              cy="25"
              r="18"
              stroke="currentColor"
              strokeWidth="2.5"
              fill="transparent"
              className="transition-colors group-hover:text-yellow-600"
            />
            {/* Chevron arrow */}
            <path
              d="M21 18l7 7-7 7"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="transition-colors group-hover:text-yellow-600"
            />
          </svg>
        </div>
      )}
    </div>
  )

  if (hasValidSlug) {
    return (
      <div className="container">
        <Link href={`/categories/${categorySlug}`}>{content}</Link>
      </div>
    )
  }

  return <div className="container">{content}</div>
}
