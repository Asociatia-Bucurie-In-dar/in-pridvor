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

  const heroImageObject = typeof heroImage === 'object' ? heroImage : null
  const imageWidth = heroImageObject?.width || null
  const imageHeight = heroImageObject?.height || null
  const ratio = imageWidth && imageHeight ? imageWidth / imageHeight : null
  const isPortrait = ratio ? ratio < 1 : false
  const aspectRatioStyle = ratio
    ? { aspectRatio: `${imageWidth} / ${imageHeight}` }
    : { aspectRatio: isPortrait ? '3 / 4' : '16 / 9' }

  const handleUpdate = () => {}
  const heroHeightStyle = fullHeight ? { minHeight: fullHeightMinHeight } : undefined

  return (
    <section
      className={cn(
        'relative isolate -mt-[4rem] overflow-hidden bg-neutral-950 text-white',
        fullHeight && 'min-h-screen',
      )}
      style={heroHeightStyle}
    >
      <div className="absolute inset-0 -z-10">
        {heroImageObject && (
          <Media
            fill
            priority
            imgClassName={cn('object-cover opacity-30 blur-3xl scale-110')}
            resource={heroImageObject}
          />
        )}
        <div className="absolute inset-0 bg-linear-to-b from-neutral-950 via-neutral-950/85 to-neutral-950" />
      </div>

      <div className="container relative flex flex-col gap-12 py-16 lg:py-24">
        <div
          className={cn(
            'flex gap-12',
            heroImageObject
              ? cn(
                  'flex-col-reverse',
                  isPortrait
                    ? 'lg:grid lg:grid-cols-[minmax(0,26rem)_1fr] lg:items-end lg:gap-16'
                    : 'lg:grid lg:grid-cols-[minmax(0,1fr)_minmax(0,36rem)] lg:items-end lg:gap-16',
                )
              : 'flex-col',
          )}
        >
          <div
            className={cn(
              'flex flex-col gap-8',
              heroImageObject ? (isPortrait ? 'lg:pr-10' : 'lg:pr-12') : '',
            )}
          >
            {isAdmin ? (
              <EditableCategories
                post={post}
                categories={categories || []}
                onUpdate={handleUpdate}
              />
            ) : (
              categories &&
              categories.length > 0 && (
                <div className="text-sm uppercase tracking-[0.2em] text-white/70">
                  <CategoryLinks categories={categories} />
                </div>
              )
            )}

            <h1 className="text-3xl font-bold leading-tight md:text-5xl lg:text-6xl">{title}</h1>

            <div className="flex flex-col gap-6 text-sm md:flex-row md:items-center md:gap-12">
              {hasAuthors && populatedAuthors && (
                <div className="flex flex-col gap-2">
                  {isAdmin ? (
                    <EditableAuthor
                      post={post}
                      authors={populatedAuthors}
                      onUpdate={handleUpdate}
                    />
                  ) : (
                    <>
                      <p className="text-white/60">Autor</p>
                      <p className="text-base">
                        <AuthorLinks authors={populatedAuthors} />
                      </p>
                    </>
                  )}
                </div>
              )}
              {!hasAuthors && isAdmin && (
                <div className="flex flex-col gap-2">
                  <EditableAuthor post={post} authors={[]} onUpdate={handleUpdate} />
                </div>
              )}

              {publishedAt && (
                <div className="flex flex-col gap-1">
                  <p className="text-white/60">Data Publicării</p>
                  <time className="text-base" dateTime={publishedAt}>
                    {formatDateTime(publishedAt)}
                  </time>
                </div>
              )}

              {isAdmin && (
                <div className="flex flex-col gap-4 md:flex-row md:items-center md:gap-6">
                  <EditableDropCap
                    post={post}
                    showDropCap={showDropCap}
                    dropCapIndex={dropCapIndex}
                    onUpdate={handleUpdate}
                  />
                  <EditableHeroImageAlignment
                    post={post}
                    alignment={alignment}
                    onUpdate={handleUpdate}
                  />
                </div>
              )}
            </div>
          </div>

          {heroImageObject && (
            <div
              className={cn(
                'w-full',
                isPortrait
                  ? 'max-w-sm mx-auto lg:mx-0 lg:justify-self-start'
                  : 'lg:max-w-4xl lg:justify-self-end',
              )}
            >
              <div
                className="relative w-full overflow-hidden rounded-3xl border border-white/12 bg-white/5 shadow-[0_32px_80px_-32px_rgba(0,0,0,0.8)] backdrop-blur"
                style={aspectRatioStyle}
              >
                <Media fill priority imgClassName="object-contain" resource={heroImageObject} />
              </div>
            </div>
          )}
        </div>
      </div>
    </section>
  )
}
