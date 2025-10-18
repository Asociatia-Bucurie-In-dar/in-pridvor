'use client'

import React from 'react'
import Link from 'next/link'
import { Post } from '@/payload-types'
import { toKebabCase } from '@/utilities/toKebabCase'

interface AuthorLinksProps {
  authors: NonNullable<NonNullable<Post['populatedAuthors']>[number]>[]
  className?: string
}

/**
 * Renders a list of authors as clickable links.
 * Formats similarly to formatAuthors but with links.
 * @example
 * [Author1, Author2] becomes 'Author1 and Author2' (both clickable)
 * [Author1, Author2, Author3] becomes 'Author1, Author2, and Author3' (all clickable)
 */
export const AuthorLinks: React.FC<AuthorLinksProps> = ({ authors, className = '' }) => {
  const authorNames = authors.map((author) => author.name).filter(Boolean)

  if (authorNames.length === 0) return null

  // Single author
  if (authorNames.length === 1) {
    const author = authors[0]
    return (
      <Link
        href={`/authors/${toKebabCase(author.name || '')}`}
        className={`relative z-10 hover:underline ${className}`}
      >
        {author.name}
      </Link>
    )
  }

  // Two authors
  if (authorNames.length === 2) {
    return (
      <span className={className}>
        <Link
          href={`/authors/${toKebabCase(authors[0].name || '')}`}
          className="relative z-10 hover:underline"
        >
          {authors[0].name}
        </Link>
        {' and '}
        <Link
          href={`/authors/${toKebabCase(authors[1].name || '')}`}
          className="relative z-10 hover:underline"
        >
          {authors[1].name}
        </Link>
      </span>
    )
  }

  // Three or more authors
  return (
    <span className={className}>
      {authors.slice(0, -1).map((author, index) => (
        <React.Fragment key={index}>
          <Link
            href={`/authors/${toKebabCase(author.name || '')}`}
            className="relative z-10 hover:underline"
          >
            {author.name}
          </Link>
          {index < authors.length - 2 ? ', ' : ''}
        </React.Fragment>
      ))}
      {', and '}
      <Link
        href={`/authors/${toKebabCase(authors[authors.length - 1].name || '')}`}
        className="relative z-10 hover:underline"
      >
        {authors[authors.length - 1].name}
      </Link>
    </span>
  )
}
