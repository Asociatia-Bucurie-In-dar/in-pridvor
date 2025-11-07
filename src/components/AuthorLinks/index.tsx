'use client'

import React from 'react'
import Link from 'next/link'
import { Post } from '@/payload-types'

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
    if (!author.id) return <span className={className}>{author.name}</span>
    return (
      <Link
        href={`/authors/${author.id}`}
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
    const author1Id = author1.id
    const author2Id = author2.id
    return (
      <span className={className}>
        {author1Id ? (
          <Link href={`/authors/${author1Id}`} className="relative z-10 hover:underline">
            {author1.name}
          </Link>
        ) : (
          <span className="relative z-10">{author1.name}</span>
        )}
        {' and '}
        {author2Id ? (
          <Link href={`/authors/${author2Id}`} className="relative z-10 hover:underline">
            {author2.name}
          </Link>
        ) : (
          <span className="relative z-10">{author2.name}</span>
        )}
      </span>
    )
  }

  // Three or more authors
  const lastAuthor = authors[authors.length - 1]
  if (!lastAuthor) return null
  const lastAuthorId = lastAuthor.id

  return (
    <span className={className}>
      {authors.slice(0, -1).map((author, index) => {
        if (!author) return null
        const authorId = author.id
        return (
          <React.Fragment key={index}>
            {authorId ? (
              <Link href={`/authors/${authorId}`} className="relative z-10 hover:underline">
                {author.name}
              </Link>
            ) : (
              <span className="relative z-10">{author.name}</span>
            )}
            {index < authors.length - 2 ? ', ' : ''}
          </React.Fragment>
        )
      })}
      {', and '}
      {lastAuthorId ? (
        <Link href={`/authors/${lastAuthorId}`} className="relative z-10 hover:underline">
          {lastAuthor.name}
        </Link>
      ) : (
        <span className="relative z-10">{lastAuthor.name}</span>
      )}
    </span>
  )
}
