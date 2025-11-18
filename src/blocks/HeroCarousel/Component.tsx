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
    limit: limitFromProps,
    populateBy,
    selectedDocs,
    categories,
    autoplayDelay,
    showNavigation,
    showPagination,
  } = props

  const limit = limitFromProps || 3
  const now = new Date()
  const nowISO = now.toISOString()

  let posts: Post[] = []

  if (populateBy === 'collection') {
    const payload = await getPayload({ config: configPromise })

    const whereConditions: any[] = [
      {
        publishedAt: {
          less_than_equal: nowISO,
        },
      },
    ]

    const fetchedPosts = await payload.find({
      collection: 'posts',
      depth: 1,
      limit,
      sort: '-publishedAt',
      overrideAccess: false,
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
      where: {
        and: whereConditions,
      },
    })

    posts = fetchedPosts.docs
  } else {
    if (selectedDocs?.length) {
      const filteredSelectedPosts = selectedDocs
        .map((post) => {
          if (typeof post.value === 'object') return post.value
          return null
        })
        .filter((post): post is Post => post !== null)

      posts = filteredSelectedPosts.filter((post) => {
        if (!post?.publishedAt) return true
        return new Date(post.publishedAt) <= now
      })
    }
  }

  return (
    <div id={`block-${id}`} className="-mt-16">
      <HeroCarouselClient
        posts={posts}
        autoplayDelay={autoplayDelay ?? undefined}
        showNavigation={showNavigation ?? undefined}
        showPagination={showPagination ?? undefined}
      />
    </div>
  )
}
