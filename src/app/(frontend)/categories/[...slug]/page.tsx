import type { Metadata } from 'next'

import { PayloadRedirects } from '@/components/PayloadRedirects'
import { CollectionArchive } from '@/components/CollectionArchive'
import { Pagination } from '@/components/Pagination'
import { PageRange } from '@/components/PageRange'
import configPromise from '@payload-config'
import { getPayload } from 'payload'
import React, { cache } from 'react'

import { generateMeta } from '@/utilities/generateMeta'
import { getCategoryHierarchyIds } from '@/utilities/getCategoryHierarchy'
import PageClient from './page.client'

export async function generateStaticParams() {
  const payload = await getPayload({ config: configPromise })
  const categories = await payload.find({
    collection: 'categories',
    draft: false,
    limit: 1000,
    overrideAccess: false,
    pagination: false,
    select: {
      slug: true,
    },
  })

  const params = categories.docs.map(({ slug }) => {
    const segments = slug?.split('/') || []
    return segments.filter((segment) => segment !== 'categories' && segment !== '')
  }).filter((segments) => segments.length > 0)

  return params
}

type Args = {
  params: Promise<{
    slug: string[]
  }>
}

export default async function Category({ params: paramsPromise }: Args) {
  const { slug } = await paramsPromise
  
  let categorySlug = slug
  let pageNumber = 1
  
  if (slug.length >= 3 && slug[slug.length - 2] === 'page') {
    const pageStr = slug[slug.length - 1]
    const parsedPage = Number(pageStr)
    if (Number.isInteger(parsedPage) && parsedPage > 0) {
      pageNumber = parsedPage
      categorySlug = slug.slice(0, -2)
    }
  }
  
  const url = '/' + slug.join('/')
  const category = await queryCategoryBySlug({ params: categorySlug })

  if (!category) return <PayloadRedirects url={url} />

  // Get all category IDs (this category + all its subcategories)
  const categoryIds = await getCategoryHierarchyIds(category.id)

  // Fetch posts from this category and all its subcategories
  const posts = await queryPostsByCategoryIds(categoryIds, pageNumber)
  
  const filteredCategorySlug = categorySlug.filter((segment) => segment !== 'categories')
  const categoryBasePath = `/categories/${filteredCategorySlug.join('/')}`

  return (
    <div className="pt-16 pb-16">
      <PageClient />

      {/* Allows redirects for valid pages too */}
      <PayloadRedirects disableNotFound url={url} />

      <div className="flex flex-col items-center gap-4 pt-8">
        <div className="container mb-16">
          <div className="prose max-w-none">
            <h1>Rubrica: {category.title}</h1>
          </div>
        </div>

        <div className="container mb-8">
          <PageRange
            collection="posts"
            currentPage={posts.page}
            limit={12}
            totalDocs={posts.totalDocs}
          />
        </div>

        <CollectionArchive posts={posts.docs} />

        <div className="container">
          {posts.totalPages > 1 && posts.page && (
            <Pagination page={posts.page} totalPages={posts.totalPages} basePath={categoryBasePath} />
          )}
        </div>
      </div>
    </div>
  )
}

export async function generateMetadata({ params: paramsPromise }: Args): Promise<Metadata> {
  const { slug } = await paramsPromise
  
  let categorySlug = slug
  if (slug.length >= 3 && slug[slug.length - 2] === 'page') {
    categorySlug = slug.slice(0, -2)
  }
  
  const post = await queryCategoryBySlug({ params: categorySlug })

  return generateMeta({ doc: post })
}

const queryCategoryBySlug = cache(async ({ params }: { params: string[] }) => {
  const filteredParams = params.filter((segment) => segment !== 'categories')
  
  if (filteredParams.length === 0) {
    return null
  }

  const fullSlug = filteredParams.join('/')
  const lastSegment = filteredParams[filteredParams.length - 1]

  const payload = await getPayload({ config: configPromise })

  let result = await payload.find({
    collection: 'categories',
    limit: 1,
    overrideAccess: false,
    pagination: false,
    where: {
      slug: {
        equals: fullSlug,
      },
    },
  })

  if (result.docs.length === 0 && filteredParams.length > 1) {
    result = await payload.find({
      collection: 'categories',
      limit: 1,
      overrideAccess: false,
      pagination: false,
      where: {
        slug: {
          equals: lastSegment,
        },
      },
    })
  }

  return result.docs?.[0] || null
})

const queryPostsByCategoryIds = cache(async (categoryIds: number[], page: number = 1) => {
  const payload = await getPayload({ config: configPromise })

  const result = await payload.find({
    collection: 'posts',
    depth: 1,
    limit: 12,
    page,
    overrideAccess: false,
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
    },
    where: {
      categories: {
        in: categoryIds,
      },
    },
  })

  return result
})
