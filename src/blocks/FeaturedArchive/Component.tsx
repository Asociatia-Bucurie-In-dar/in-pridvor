import type {
  Post,
  FeaturedArchiveBlock as FeaturedArchiveBlockProps,
  Category,
} from '@/payload-types'

import configPromise from '@payload-config'
import { getPayload } from 'payload'
import React from 'react'
import RichText from '@/components/RichText'
import Link from 'next/link'

import { getCategoryHierarchyIds } from '@/utilities/getCategoryHierarchy'
import { CategoryHeader } from '../ArchiveBlock/CategoryHeader'
import { cn } from '@/utilities/ui'
import { Media } from '@/components/Media'
import { extractTextFromLexical } from '@/utilities/extractTextFromLexical'
import { formatAuthors } from '@/utilities/formatAuthors'
import { formatDateTime } from '@/utilities/formatDateTime'
import { AuthorLinks } from '@/components/AuthorLinks'
import { CardPostData } from '@/components/Card'

export const FeaturedArchiveBlock: React.FC<
  FeaturedArchiveBlockProps & {
    id?: string
    disableInnerContainer?: boolean
  }
> = async (props) => {
  const {
    id,
    categories,
    introContent,
    populateBy,
    selectedDocs,
    useCustomCategoryHeader,
    disableInnerContainer,
  } = props

  let posts: Post[] = []

  if (populateBy === 'collection') {
    const payload = await getPayload({ config: configPromise })

    let allCategoryIds: number[] = []

    if (categories && categories.length > 0) {
      const categoryHierarchyPromises = categories.map(async (category) => {
        const categoryId = typeof category === 'object' ? category.id : category
        if (categoryId) {
          return getCategoryHierarchyIds(categoryId)
        }
        return []
      })

      const categoryHierarchies = await Promise.all(categoryHierarchyPromises)
      allCategoryIds = Array.from(new Set(categoryHierarchies.flat()))
    }

    const fetchedPosts = await payload.find({
      collection: 'posts',
      depth: 1,
      limit: 5,
      sort: '-publishedAt',
      select: {
        title: true,
        slug: true,
        categories: true,
        meta: true,
        heroImage: true,
        heroImageAlignment: true,
        content: true,
        authors: true,
        populatedAuthors: true,
        publishedAt: true,
        updatedAt: true,
        createdAt: true,
      },
      ...(allCategoryIds.length > 0
        ? {
            where: {
              categories: {
                in: allCategoryIds,
              },
            },
          }
        : {}),
    })

    posts = fetchedPosts.docs
  } else {
    if (selectedDocs?.length) {
      const filteredSelectedPosts = selectedDocs
        .map((post) => {
          if (typeof post.value === 'object') return post.value
        })
        .filter(Boolean)
        .slice(0, 5) as Post[]

      posts = filteredSelectedPosts
    }
  }

  if (posts.length === 0) {
    return null
  }

  const featuredPost = posts[0]
  const secondPost = posts[1]
  const smallerPosts = posts.slice(2, 5)

  const firstCategory =
    categories && categories.length > 0
      ? typeof categories[0] === 'object'
        ? (categories[0] as Category)
        : null
      : null

  const featuredPostData: CardPostData = {
    slug: featuredPost.slug,
    categories: featuredPost.categories,
    meta: featuredPost.meta,
    title: featuredPost.title,
    heroImage: featuredPost.heroImage,
    heroImageAlignment: featuredPost.heroImageAlignment,
    content: featuredPost.content,
    publishedAt: featuredPost.publishedAt,
    populatedAuthors: featuredPost.populatedAuthors,
  }

  return (
    <div id={`block-${id}`}>
      {useCustomCategoryHeader && firstCategory ? (
        <div className="mb-8">
          <CategoryHeader
            categoryTitle={firstCategory.title || 'Untitled'}
            categorySlug={firstCategory.slug || null}
          />
        </div>
      ) : introContent ? (
        <div className={cn(disableInnerContainer ? 'mb-16' : 'container mb-16')}>
          <RichText className="ml-0 max-w-3xl" data={introContent as any} enableGutter={false} />
        </div>
      ) : null}

      <div className={cn(disableInnerContainer ? undefined : 'container')}>
        <div className="grid gap-6 lg:grid-cols-12 lg:gap-8 lg:items-stretch">
          <div className="lg:col-span-7">
            <FeaturedCard doc={featuredPostData} />
          </div>
          <div className="lg:col-span-5 flex flex-col">
            {secondPost && (
              <div className="mb-6 flex-shrink-0">
                <MediumCard
                  doc={{
                    slug: secondPost.slug,
                    categories: secondPost.categories,
                    meta: secondPost.meta,
                    title: secondPost.title,
                    heroImage: secondPost.heroImage,
                    heroImageAlignment: secondPost.heroImageAlignment,
                    content: secondPost.content,
                    publishedAt: secondPost.publishedAt,
                    populatedAuthors: secondPost.populatedAuthors,
                  }}
                />
              </div>
            )}
            {smallerPosts.length > 0 && (
              <div className="flex flex-col gap-5 mt-auto">
                {smallerPosts.map((post, index) => {
                  const postData: CardPostData = {
                    slug: post.slug,
                    categories: post.categories,
                    meta: post.meta,
                    title: post.title,
                    heroImage: post.heroImage,
                    heroImageAlignment: post.heroImageAlignment,
                    content: post.content,
                    publishedAt: post.publishedAt,
                    populatedAuthors: post.populatedAuthors,
                  }
                  return <SmallCard key={post.id || index} doc={postData} />
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

const FeaturedCard: React.FC<{ doc: CardPostData }> = ({ doc }) => {
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
  } = doc
  const { image: metaImage } = meta || {}
  const cardImage = heroImage || metaImage

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
  const previewText = content ? extractTextFromLexical(content, 250) : ''
  const href = `/posts/${slug}`

  const hasAuthors =
    populatedAuthors && populatedAuthors.length > 0 && formatAuthors(populatedAuthors) !== ''
  const formattedAuthors = hasAuthors ? formatAuthors(populatedAuthors) : null
  const formattedDate = publishedAt ? formatDateTime(publishedAt) : null

  return (
    <article className="relative card flex flex-col h-full">
      <div className="relative w-full">
        <Link className="block w-full" href={href}>
          <div className="relative aspect-[16/10] w-full overflow-hidden rounded-lg bg-gray-100">
            {cardImage && typeof cardImage !== 'string' ? (
              <Media
                resource={cardImage}
                size="50vw"
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
        {hasCategories && (
          <div className="absolute inset-x-4 bottom-4 z-11 flex flex-wrap gap-2">
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

      <div className="flex flex-col flex-grow px-6 pb-6 pt-4">
        <div className="flex-grow">
          <div className="group relative">
            {title && (
              <h2 className="mt-4 text-2xl/7 font-semibold text-gray-900 group-hover:text-gray-600">
                <Link href={href}>
                  <span className="absolute inset-0" />
                  {title}
                </Link>
              </h2>
            )}

            {previewText && (
              <p className="mt-3 line-clamp-3 text-base/6 text-gray-600">
                <Link href={href}>{previewText}</Link>
              </p>
            )}
          </div>
        </div>

        {(formattedAuthors || formattedDate) && (
          <div className="mt-6 flex items-center gap-x-4">
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

const MediumCard: React.FC<{ doc: CardPostData }> = ({ doc }) => {
  const {
    slug,
    meta,
    title,
    heroImage,
    heroImageAlignment,
    content,
    publishedAt,
    populatedAuthors,
  } = doc
  const { image: metaImage } = meta || {}
  const cardImage = heroImage || metaImage

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

  const previewText = content ? extractTextFromLexical(content, 200) : ''
  const href = `/posts/${slug}`

  const hasAuthors =
    populatedAuthors && populatedAuthors.length > 0 && formatAuthors(populatedAuthors) !== ''
  const formattedAuthors = hasAuthors ? formatAuthors(populatedAuthors) : null
  const formattedDate = publishedAt ? formatDateTime(publishedAt) : null

  return (
    <article className="group relative flex gap-5">
      <Link
        className="relative flex-shrink-0 w-48 h-48 overflow-hidden rounded-lg bg-gray-100"
        href={href}
      >
        {cardImage && typeof cardImage !== 'string' ? (
          <Media
            resource={cardImage}
            size="220px"
            fill
            imgClassName={`object-cover ${alignmentClass}`}
          />
        ) : (
          <div className="flex h-full items-center justify-center">
            <span className="text-xs text-gray-400">No image</span>
          </div>
        )}
        <div className="pointer-events-none absolute inset-0 rounded-lg ring-1 ring-inset ring-gray-900/10" />
      </Link>

      <div className="flex flex-col justify-center min-w-0 flex-1 py-2">
        {title && (
          <h3 className="text-xl font-semibold leading-tight text-gray-900 group-hover:text-gray-600 line-clamp-2">
            <Link href={href}>
              <span className="absolute inset-0" />
              {title}
            </Link>
          </h3>
        )}

        {previewText && (
          <p className="mt-3 text-base leading-relaxed text-gray-600 line-clamp-4">
            <Link href={href}>{previewText}</Link>
          </p>
        )}

        <div className="mt-4 flex items-center gap-2 text-sm text-gray-500">
          {formattedAuthors && (
            <span className="font-medium text-gray-700">{formattedAuthors}</span>
          )}
          {formattedDate && publishedAt && (
            <>
              {formattedAuthors && <span>•</span>}
              <time dateTime={publishedAt}>{formattedDate}</time>
            </>
          )}
        </div>
      </div>
    </article>
  )
}

const SmallCard: React.FC<{ doc: CardPostData }> = ({ doc }) => {
  const {
    slug,
    meta,
    title,
    heroImage,
    heroImageAlignment,
    content,
    publishedAt,
    populatedAuthors,
  } = doc
  const { image: metaImage } = meta || {}
  const cardImage = heroImage || metaImage

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

  const previewText = content ? extractTextFromLexical(content, 100) : ''
  const href = `/posts/${slug}`

  const hasAuthors =
    populatedAuthors && populatedAuthors.length > 0 && formatAuthors(populatedAuthors) !== ''
  const formattedAuthors = hasAuthors ? formatAuthors(populatedAuthors) : null
  const formattedDate = publishedAt ? formatDateTime(publishedAt) : null

  return (
    <article className="group relative flex gap-4">
      <Link
        className="relative flex-shrink-0 w-32 h-32 overflow-hidden rounded-lg bg-gray-100"
        href={href}
      >
        {cardImage && typeof cardImage !== 'string' ? (
          <Media
            resource={cardImage}
            size="150px"
            fill
            imgClassName={`object-cover ${alignmentClass}`}
          />
        ) : (
          <div className="flex h-full items-center justify-center">
            <span className="text-xs text-gray-400">No image</span>
          </div>
        )}
        <div className="pointer-events-none absolute inset-0 rounded-lg ring-1 ring-inset ring-gray-900/10" />
      </Link>

      <div className="flex flex-col justify-center min-w-0 flex-1 py-1">
        {title && (
          <h3 className="text-base font-semibold leading-snug text-gray-900 group-hover:text-gray-600 line-clamp-2">
            <Link href={href}>
              <span className="absolute inset-0" />
              {title}
            </Link>
          </h3>
        )}

        {previewText && (
          <p className="mt-1.5 text-sm leading-relaxed text-gray-600 line-clamp-2">
            <Link href={href}>{previewText}</Link>
          </p>
        )}

        <div className="mt-2 flex items-center gap-2 text-xs text-gray-500">
          {formattedAuthors && (
            <span className="font-medium text-gray-700">{formattedAuthors}</span>
          )}
          {formattedDate && publishedAt && (
            <>
              {formattedAuthors && <span>•</span>}
              <time dateTime={publishedAt}>{formattedDate}</time>
            </>
          )}
        </div>
      </div>
    </article>
  )
}
