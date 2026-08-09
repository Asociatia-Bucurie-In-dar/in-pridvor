import type { Post, ArchiveBlock as ArchiveBlockProps, Category } from '@/payload-types'

import configPromise from '@payload-config'
import { getPayload } from 'payload'
import { getLocale } from 'next-intl/server'
import React from 'react'
import RichText from '@/components/RichText'

import { CollectionArchive } from '@/components/CollectionArchive'
import { getCategoryHierarchyIds } from '@/utilities/getCategoryHierarchy'
import { CategoryHeader } from './CategoryHeader'
import { cn } from '@/utilities/ui'
import { appendCommentCounts } from '@/utilities/appendCommentCounts'

export const ArchiveBlock: React.FC<
  ArchiveBlockProps & {
    id?: string
    disableInnerContainer?: boolean
  }
> = async (props) => {
  const {
    id,
    categories,
    introContent,
    limit: limitFromProps,
    populateBy,
    selectedDocs,
    useCustomCategoryHeader,
    disableInnerContainer,
  } = props

  const limit = limitFromProps || 3
  const now = new Date()
  const nowISO = now.toISOString()

  let posts: Post[] = []

  const locale = await getLocale()
  const payload = await getPayload({ config: configPromise })

  if (populateBy === 'collection') {
    let allCategoryIds: number[] = []

    if (categories && categories.length > 0) {
      // Get all category IDs including subcategories for each selected category
      const categoryHierarchyPromises = categories.map(async (category) => {
        const categoryId = typeof category === 'object' ? category.id : category
        if (categoryId) {
          return getCategoryHierarchyIds(categoryId)
        }
        return []
      })

      const categoryHierarchies = await Promise.all(categoryHierarchyPromises)

      // Flatten and deduplicate all category IDs
      allCategoryIds = Array.from(new Set(categoryHierarchies.flat()))
    }

    const whereConditions: any[] = [
      {
        publishedAt: {
          less_than_equal: nowISO,
        },
      },
    ]

    if (allCategoryIds.length > 0) {
      whereConditions.push({
        categories: {
          in: allCategoryIds,
        },
      })
    }

    const fetchedPosts = await payload.find({
      collection: 'posts',
      depth: 1,
      limit,
      sort: '-publishedAt',
      overrideAccess: false,
      context: { locale }, // triggers the en fallback hook
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
        en: true, // needed so the fallback hook can overlay English on cards
      },
      where: {
        and: whereConditions,
      },
    })

    posts = await appendCommentCounts(payload, fetchedPosts.docs)
  } else {
    if (selectedDocs?.length) {
      const filteredSelectedPosts = selectedDocs.map((post) => {
        if (typeof post.value === 'object') return post.value
      }) as Post[]

      posts = await appendCommentCounts(
        payload,
        filteredSelectedPosts.filter((post) => {
          if (!post?.publishedAt) return true
          return new Date(post.publishedAt) <= now
        }),
      )
    }
  }

  // Get the first category for the custom header
  const firstCategory =
    categories && categories.length > 0
      ? typeof categories[0] === 'object'
        ? (categories[0] as Category)
        : null
      : null

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
      <CollectionArchive disableContainer={disableInnerContainer} posts={posts} />
    </div>
  )
}
