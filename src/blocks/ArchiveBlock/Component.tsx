import type { Post, ArchiveBlock as ArchiveBlockProps, Category } from '@/payload-types'

import configPromise from '@payload-config'
import { getPayload } from 'payload'
import React from 'react'
import RichText from '@/components/RichText'

import { CollectionArchive } from '@/components/CollectionArchive'
import { getCategoryHierarchyIds } from '@/utilities/getCategoryHierarchy'
import { CategoryHeader } from './CategoryHeader'

export const ArchiveBlock: React.FC<
  ArchiveBlockProps & {
    id?: string
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
      const filteredSelectedPosts = selectedDocs.map((post) => {
        if (typeof post.value === 'object') return post.value
      }) as Post[]

      posts = filteredSelectedPosts
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
    <div className="my-16" id={`block-${id}`}>
      {useCustomCategoryHeader && firstCategory ? (
        <div className="mb-8">
          <CategoryHeader
            categoryTitle={firstCategory.title || 'Untitled'}
            categorySlug={firstCategory.slug || null}
          />
        </div>
      ) : introContent ? (
        <div className="container mb-16">
          <RichText className="ml-0 max-w-3xl" data={introContent as any} enableGutter={false} />
        </div>
      ) : null}
      <CollectionArchive posts={posts} />
    </div>
  )
}
