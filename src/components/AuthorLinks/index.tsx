'use client'

import React from 'react'
import { useLocale } from 'next-intl'
import { Link } from '@/i18n/routing'
import { Post } from '@/payload-types'

interface AuthorLinksProps {
  authors: NonNullable<NonNullable<Post['populatedAuthors']>[number]>[]
  className?: string
}

/**
 * Renders a list of authors as clickable links.
 * Formats like formatAuthors (language-aware "și" / "and" and commas) but with links.
 * @example
 * [Author1, Author2] becomes 'Author1 și Author2' (both clickable)
 * [Author1, Author2, Author3] becomes 'Author1, Author2 și Author3' (all clickable)
 */
export const AuthorLinks: React.FC<AuthorLinksProps> = ({ authors, className = '' }) => {
  const locale = useLocale()
  const namedAuthors = authors.filter((author) => Boolean(author.name))

  if (namedAuthors.length === 0) return null

  // Element parts are the names in order; literal parts are the localized separators.
  const parts = new Intl.ListFormat(locale, { style: 'long', type: 'conjunction' }).formatToParts(
    namedAuthors.map((author) => author.name as string),
  )

  let authorIndex = 0

  return (
    <span className={className}>
      {parts.map((part, index) => {
        if (part.type === 'literal') return <React.Fragment key={index}>{part.value}</React.Fragment>

        const author = namedAuthors[authorIndex++]
        if (!author?.id) {
          return (
            <span key={index} className="relative z-10">
              {part.value}
            </span>
          )
        }

        return (
          <Link
            key={index}
            href={`/authors/${author.id}`}
            className="relative z-10 hover:underline"
          >
            {part.value}
          </Link>
        )
      })}
    </span>
  )
}
