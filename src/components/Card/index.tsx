'use client'
import { cn } from '@/utilities/ui'
import useClickableCard from '@/utilities/useClickableCard'
import Link from 'next/link'
import React, { Fragment } from 'react'

import type { Post } from '@/payload-types'

import { Media } from '@/components/Media'
import { extractTextFromLexical } from '@/utilities/extractTextFromLexical'
import { formatAuthors } from '@/utilities/formatAuthors'
import { formatDateTime } from '@/utilities/formatDateTime'
import { AuthorLinks } from '@/components/AuthorLinks'

export type CardPostData = Pick<
  Post,
  | 'slug'
  | 'categories'
  | 'meta'
  | 'title'
  | 'heroImage'
  | 'heroImageAlignment'
  | 'content'
  | 'publishedAt'
  | 'populatedAuthors'
>

export const Card: React.FC<{
  alignItems?: 'center'
  className?: string
  doc?: CardPostData
  relationTo?: 'posts'
  showCategories?: boolean
  title?: string
}> = (props) => {
  const { card, link } = useClickableCard({})
  const { className, doc, relationTo, showCategories, title: titleFromProps } = props

  const {
    slug,
    categories,
    meta,
    title,
    heroImage,
    heroImageAlignment,
    content,
    publishedAt,
    populatedAuthors,
  } = doc || {}
  const { image: metaImage } = meta || {}

  // Use heroImage first, fall back to meta image
  const cardImage = heroImage || metaImage

  // Determine image alignment class
  const alignment = heroImageAlignment || 'centered'
  const getAlignmentClass = (align: string) => {
    switch (align) {
      case 'top':
        return 'object-top'
      case 'upper-center':
        return 'object-[50%_25%]'
      case 'centered':
        return 'object-center'
      case 'lower-center':
        return 'object-[50%_75%]'
      case 'bottom':
        return 'object-bottom'
      default:
        return 'object-center'
    }
  }
  const alignmentClass = getAlignmentClass(alignment)

  const hasCategories = categories && Array.isArray(categories) && categories.length > 0
  const titleToUse = titleFromProps || title

  // Extract preview text from content
  const previewText = content ? extractTextFromLexical(content, 200) : ''

  const href = `/${relationTo}/${slug}`

  const hasAuthors =
    populatedAuthors && populatedAuthors.length > 0 && formatAuthors(populatedAuthors) !== ''
  const formattedAuthors = hasAuthors ? formatAuthors(populatedAuthors) : null
  const formattedDate = publishedAt ? formatDateTime(publishedAt) : null

  return (
    <article className={cn('relative card flex flex-col h-full', className)} ref={card.ref}>
      <div className="relative w-full">
        <Link className="block w-full" href={href} ref={link.ref}>
          <div className="relative aspect-[5/3] w-full overflow-hidden rounded-lg bg-gray-100">
            {cardImage && typeof cardImage !== 'string' ? (
              <Media
                resource={cardImage}
                size="33vw"
                fill
                imgClassName={`object-cover ${alignmentClass}`}
              />
            ) : (
              <div className="flex h-full items-center justify-center">
                <span className="text-sm text-gray-400">No image</span>
              </div>
            )}
            <div className="pointer-events-none absolute inset-0 rounded-lg ring-1 ring-inset ring-gray-900/10" />
          </div>
        </Link>
        {showCategories && hasCategories && (
          <div className="absolute inset-x-2 bottom-2 z-11 flex flex-wrap gap-2">
            {categories?.map((category, index) => {
              if (typeof category === 'object') {
                const { title: titleFromCategory } = category
                const categoryTitle = titleFromCategory || 'Untitled category'

                return (
                  <Link
                    href={`/categories/${category.slug}`}
                    key={index}
                    className="rounded-full border border-white/50 bg-white/60 px-3 py-1.5 text-xs font-semibold text-gray-700 backdrop-blur transition hover:bg-white/80"
                  >
                    {categoryTitle}
                  </Link>
                )
              }
              return null
            })}
          </div>
        )}
      </div>

      <div className="flex flex-col flex-grow px-4 pb-4 pt-3">
        <div className="flex-grow">
          <div className="group relative">
            {titleToUse && (
              <h3 className="mt-2 text-lg/6 font-semibold text-gray-900 group-hover:text-gray-600">
                <Link href={href}>
                  <span className="absolute inset-0" />
                  {titleToUse}
                </Link>
              </h3>
            )}

            {previewText && (
              <p className="mt-2 line-clamp-4 text-sm/6 text-gray-600">
                <Link href={href}>{previewText}</Link>
              </p>
            )}
          </div>
        </div>

        {(formattedAuthors || formattedDate) && (
          <div className="mt-5 flex items-center gap-x-4">
            <div className="text-sm/6 text-gray-500">
              {hasAuthors && populatedAuthors && (
                <p className="font-semibold text-gray-900">
                  <AuthorLinks authors={populatedAuthors} />
                </p>
              )}
              {formattedDate && publishedAt && <time dateTime={publishedAt}>{formattedDate}</time>}
            </div>
          </div>
        )}
      </div>
    </article>
  )
}
