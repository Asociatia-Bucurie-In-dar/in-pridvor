import type { Post, HeroCarouselBlock as HeroCarouselBlockProps } from '@/payload-types'
import type { Where } from 'payload'

import configPromise from '@payload-config'
import { getPayload } from 'payload'
import React from 'react'
import { HeroCarouselClient } from './Component.client'

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
    autoplayDelay,
    showNavigation,
    showPagination,
  } = props

  const limit =
    typeof limitFromProps === 'number' && Number.isFinite(limitFromProps) && limitFromProps > 0
      ? limitFromProps
      : 3
  const now = Date.now()
  const nowIso = new Date(now).toISOString()

  let posts: Post[] = []

  if (populateBy === 'collection') {
    const payload = await getPayload({ config: configPromise })

    const whereFilters: Where[] = [
      {
        _status: {
          equals: 'published',
        },
      },
      {
        or: [
          {
            publishedAt: {
              less_than_equal: nowIso,
            },
          },
          {
            publishedAt: {
              equals: null,
            },
          },
          {
            publishedAt: {
              exists: false,
            },
          },
        ],
      },
    ]

    const whereWithCategories: Where = {
      and: whereFilters,
    }

    const fetchedPosts = await payload.find({
      collection: 'posts',
      depth: 1,
      limit: limit + 10,
      where: whereWithCategories,
      sort: '-publishedAt,-updatedAt,-createdAt',
      select: {
        title: true,
        slug: true,
        categories: true,
        meta: true,
        heroImage: true,
        heroImageAlignment: true,
        content: true,
        publishedAt: true,
        authors: true,
        updatedAt: true,
        createdAt: true,
      },
    })

    posts = fetchedPosts.docs
      .filter((post) => {
        if (!post.publishedAt) return true
        const published = new Date(post.publishedAt).getTime()
        return Number.isFinite(published) && published <= now
      })
      .sort((a, b) => {
        const dateB = new Date(b.publishedAt || b.updatedAt || b.createdAt || 0).getTime() || 0
        const dateA = new Date(a.publishedAt || a.updatedAt || a.createdAt || 0).getTime() || 0
        return dateB - dateA
      })
      .slice(0, limit)
  } else {
    if (selectedDocs?.length) {
      const filteredSelectedPosts = selectedDocs
        .map((post) => {
          if (typeof post.value === 'object') return post.value
        })
        .filter((post): post is Post => {
          if (!post) return false
          if (!post.publishedAt) return true
          const published = new Date(post.publishedAt).getTime()
          return Number.isFinite(published) && published <= now
        })

      posts = filteredSelectedPosts
        .sort((a, b) => {
          const dateB = new Date(b.publishedAt || b.updatedAt || b.createdAt || 0).getTime() || 0
          const dateA = new Date(a.publishedAt || a.updatedAt || a.createdAt || 0).getTime() || 0
          return dateB - dateA
        })
        .slice(0, limit)
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
