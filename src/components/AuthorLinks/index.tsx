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
    if (!author) return null
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
    const author1 = authors[0]
    const author2 = authors[1]
    if (!author1 || !author2) return null
    return (
      <span className={className}>
        <Link
          href={`/authors/${toKebabCase(author1.name || '')}`}
          className="relative z-10 hover:underline"
        >
          {author1.name}
        </Link>
        {' and '}
        <Link
          href={`/authors/${toKebabCase(author2.name || '')}`}
          className="relative z-10 hover:underline"
        >
          {author2.name}
        </Link>
      </span>
    )
  }

  // Three or more authors
  const lastAuthor = authors[authors.length - 1]
  if (!lastAuthor) return null

  return (
    <span className={className}>
      {authors.slice(0, -1).map((author, index) => {
        if (!author) return null
        return (
          <React.Fragment key={index}>
            <Link
              href={`/authors/${toKebabCase(author.name || '')}`}
              className="relative z-10 hover:underline"
            >
              {author.name}
            </Link>
            {index < authors.length - 2 ? ', ' : ''}
          </React.Fragment>
        )
      })}
      {', and '}
      <Link
        href={`/authors/${toKebabCase(lastAuthor.name || '')}`}
        className="relative z-10 hover:underline"
      >
        {lastAuthor.name}
      </Link>
    </span>
  )
}
