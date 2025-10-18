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

export type CardPostData = Pick<
  Post,
  | 'slug'
  | 'categories'
  | 'meta'
  | 'title'
  | 'heroImage'
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

  const { slug, categories, meta, title, heroImage, content, publishedAt, populatedAuthors } =
    doc || {}
  const { image: metaImage } = meta || {}

  // Use heroImage first, fall back to meta image
  const cardImage = heroImage || metaImage

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
      <Link className="relative w-full" href={href} ref={link.ref}>
        <div className="relative aspect-video w-full rounded-lg bg-gray-100 overflow-hidden">
          {cardImage && typeof cardImage !== 'string' ? (
            <Media resource={cardImage} size="33vw" fill imgClassName="object-cover" />
          ) : (
            <div className="flex items-center justify-center h-full">
              <span className="text-gray-400 text-sm">No image</span>
            </div>
          )}
        </div>
        <div className="absolute inset-0 rounded-2xl ring-1 ring-gray-900/10 ring-inset" />
      </Link>

      <div className="flex flex-col flex-grow p-4">
        <div className="flex-grow">
          {showCategories && hasCategories && (
            <div className="mt-1 flex items-center gap-x-2 text-xs">
              {categories?.map((category, index) => {
                if (typeof category === 'object') {
                  const { title: titleFromCategory } = category
                  const categoryTitle = titleFromCategory || 'Untitled category'

                  return (
                    <Link
                      href={`/categories/${category.slug}`}
                      key={index}
                      className="relative z-10 rounded-full bg-gray-50 px-3 py-1.5 font-semibold text-gray-600 hover:bg-gray-100"
                    >
                      {categoryTitle}
                    </Link>
                  )
                }
                return null
              })}
            </div>
          )}

          <div className="group relative">
            {titleToUse && (
              <h3 className="mt-4 text-lg/6 font-semibold text-gray-900 group-hover:text-gray-600">
                <Link href={href}>
                  <span className="absolute inset-0" />
                  {titleToUse}
                </Link>
              </h3>
            )}

            {previewText && (
              <p className="mt-4 line-clamp-4 text-sm/6 text-gray-600">
                <Link href={href}>{previewText}</Link>
              </p>
            )}
          </div>
        </div>

        {(formattedAuthors || formattedDate) && (
          <div className="mt-6 flex items-center gap-x-4">
            <div className="text-sm/6 text-gray-500">
              {formattedAuthors && (
                <p className="font-semibold text-gray-900">
                  <span className="absolute inset-0" />
                  {formattedAuthors}
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
