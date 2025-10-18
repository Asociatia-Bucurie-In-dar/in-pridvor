import type { Post, HeroCarouselBlock as HeroCarouselBlockProps } from '@/payload-types'

import configPromise from '@payload-config'
import { getPayload } from 'payload'
import React from 'react'
import { HeroCarouselClient } from './Component.client'
import { getCategoryHierarchyIds } from '@/utilities/getCategoryHierarchy'

export const HeroCarouselBlock: React.FC<
  HeroCarouselBlockProps & {
    id?: string
  }
> = async (props) => {
  const {
    id,
    categories,
    limit: limitFromProps,
    populateBy,
    selectedDocs,
    autoplayDelay,
    showNavigation,
    showPagination,
  } = props

  const limit = limitFromProps || 3

  let posts: Post[] = []

  if (populateBy === 'collection') {
    const payload = await getPayload({ config: configPromise })

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

    const fetchedPosts = await payload.find({
      collection: 'posts',
      depth: 1,
      limit,
      sort: '-publishedAt',
      select: {
        title: true,
        slug: true,
        categories: true,
        meta: true,
        heroImage: true,
        content: true,
        publishedAt: true,
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
      const filteredSelectedPosts = selectedDocs.map((post) => {
        if (typeof post.value === 'object') return post.value
      }) as Post[]

      posts = filteredSelectedPosts
    }
  }

  return (
    <div id={`block-${id}`} className="-mt-16">
      <HeroCarouselClient
        posts={posts}
        autoplayDelay={autoplayDelay}
        showNavigation={showNavigation}
        showPagination={showPagination}
      />
    </div>
  )
}
