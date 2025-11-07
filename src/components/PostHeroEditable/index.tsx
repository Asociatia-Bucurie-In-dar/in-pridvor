'use client'

import React from 'react'
import type { Post } from '@/payload-types'
import { useAdmin } from '@/contexts/AdminContext'
import { EditableAuthor } from '@/components/EditableAuthor'
import { EditableCategories } from '@/components/EditableCategories'
import { EditableDropCap } from '@/components/EditableDropCap'
import { EditableHeroImageAlignment } from '@/components/EditableHeroImageAlignment'
import { formatDateTime } from 'src/utilities/formatDateTime'
import { Media } from '@/components/Media'
import { formatAuthors } from '@/utilities/formatAuthors'
import { AuthorLinks } from '@/components/AuthorLinks'
import { CategoryLinks } from '@/components/CategoryLinks'
import { cn } from '@/utilities/ui'

const headerOverlap = '10.5rem'
const fullHeightMinHeight = `calc(100vh - ${headerOverlap})`

interface PostHeroEditableProps {
  post: Post
  showDropCap: boolean
  dropCapIndex: number
  fullHeight?: boolean
}

export const PostHeroEditable: React.FC<PostHeroEditableProps> = ({
  post,
  showDropCap,
  dropCapIndex,
  fullHeight,
}) => {
  const { isAdmin } = useAdmin()
  const { categories, heroImage, heroImageAlignment, populatedAuthors, publishedAt, title } = post

  const hasAuthors =
    populatedAuthors && populatedAuthors.length > 0 && formatAuthors(populatedAuthors) !== ''

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

  const handleUpdate = () => {
    // This will be handled by the individual components via page reload
  }

  return (
    <div
      className={cn('relative -mt-[10.4rem] flex items-end', fullHeight && 'min-h-screen')}
      style={fullHeight ? { minHeight: fullHeightMinHeight } : undefined}
    >
      <div className="container z-10 relative lg:grid lg:grid-cols-[1fr_48rem_1fr] text-white pb-8">
        <div className="col-start-1 col-span-1 md:col-start-2 md:col-span-2">
          {isAdmin ? (
            <EditableCategories post={post} categories={categories || []} onUpdate={handleUpdate} />
          ) : (
            <div className="uppercase text-sm mb-6">
              {categories && categories.length > 0 && <CategoryLinks categories={categories} />}
            </div>
          )}

          <div className="">
            <h1 className="mb-6 text-3xl md:text-5xl lg:text-6xl font-bold">{title}</h1>
          </div>

          <div className="flex flex-col md:flex-row gap-4 md:gap-16">
            {hasAuthors && populatedAuthors && (
              <div className="flex flex-col gap-4">
                {isAdmin ? (
                  <EditableAuthor post={post} authors={populatedAuthors} onUpdate={handleUpdate} />
                ) : (
                  <div className="flex flex-col gap-1">
                    <p className="text-sm">Autor</p>
                    <p>
                      <AuthorLinks authors={populatedAuthors} />
                    </p>
                  </div>
                )}
              </div>
            )}
            {!hasAuthors && isAdmin && (
              <div className="flex flex-col gap-4">
                <EditableAuthor post={post} authors={[]} onUpdate={handleUpdate} />
              </div>
            )}
            {publishedAt && (
              <div className="flex flex-col gap-1">
                <p className="text-sm">Data Publicării</p>
                <time dateTime={publishedAt}>{formatDateTime(publishedAt)}</time>
              </div>
            )}
            {isAdmin && (
              <>
                <div className="flex flex-col gap-1">
                  <EditableDropCap
                    post={post}
                    showDropCap={showDropCap}
                    dropCapIndex={dropCapIndex}
                    onUpdate={handleUpdate}
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <EditableHeroImageAlignment
                    post={post}
                    alignment={alignment}
                    onUpdate={handleUpdate}
                  />
                </div>
              </>
            )}
          </div>
        </div>
      </div>
      <div
        className={cn(fullHeight ? 'min-h-screen' : 'min-h-[80vh]', 'select-none')}
        style={fullHeight ? { minHeight: fullHeightMinHeight } : undefined}
      >
        {heroImage && typeof heroImage !== 'string' && (
          <Media
            fill
            priority
            imgClassName={`-z-10 object-cover ${alignmentClass}`}
            resource={heroImage}
          />
        )}
        <div className="absolute pointer-events-none left-0 bottom-0 w-full h-1/2 bg-linear-to-t from-black to-transparent" />
      </div>
    </div>
  )
}
