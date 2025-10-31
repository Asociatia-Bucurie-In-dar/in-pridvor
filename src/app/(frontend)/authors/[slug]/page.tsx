import type { Metadata } from 'next'

import { PayloadRedirects } from '@/components/PayloadRedirects'
import { CollectionArchive } from '@/components/CollectionArchive'
import { Pagination } from '@/components/Pagination'
import { PageRange } from '@/components/PageRange'
import { TitleBar } from '@/components/TitleBar'
import configPromise from '@payload-config'
import { getPayload } from 'payload'
import React, { cache } from 'react'
import PageClient from './page.client'
import { toKebabCase } from '@/utilities/toKebabCase'

export async function generateStaticParams() {
  const payload = await getPayload({ config: configPromise })
  const users = await payload.find({
    collection: 'users',
    limit: 1000,
    overrideAccess: true,
    pagination: false,
    select: {
      name: true,
    },
  })

  const params = users.docs
    .filter((user) => user.name)
    .map((user) => ({
      slug: toKebabCase(user.name || ''),
    }))

  return params
}

type Args = {
  params: Promise<{
    slug: string
  }>
}

export default async function Author({ params: paramsPromise }: Args) {
  const { slug } = await paramsPromise
  const url = '/authors/' + slug
  const author = await queryAuthorBySlug({ slug })

  if (!author) return <PayloadRedirects url={url} />

  // Fetch posts by this author
  const posts = await queryPostsByAuthorId(author.id)

  return (
    <div className="pb-16">
      <PageClient />

      {/* Allows redirects for valid pages too */}
      <PayloadRedirects disableNotFound url={url} />

      <div className="flex flex-col items-center gap-4">
        <TitleBar prefix="Autor" title={author.name || ''} />

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
            <Pagination
              page={posts.page}
              totalPages={posts.totalPages}
              basePath={`/authors/${slug}`}
            />
          )}
        </div>
      </div>
    </div>
  )
}

export async function generateMetadata({ params: paramsPromise }: Args): Promise<Metadata> {
  const { slug } = await paramsPromise
  const author = await queryAuthorBySlug({ slug })

  return {
    title: author?.name || 'Author',
    description: `Posts by ${author?.name || 'this author'}`,
  }
}

const queryAuthorBySlug = cache(async ({ slug }: { slug: string }) => {
  const payload = await getPayload({ config: configPromise })

  const result = await payload.find({
    collection: 'users',
    limit: 1000,
    overrideAccess: true,
    pagination: false,
    select: {
      name: true,
    },
  })

  // Find the user whose name matches the slug
  const author = result.docs.find((user) => toKebabCase(user.name || '') === slug)

  return author || null
})

const queryPostsByAuthorId = cache(async (authorId: number) => {
  const payload = await getPayload({ config: configPromise })

  const result = await payload.find({
    collection: 'posts',
    depth: 1,
    limit: 12,
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
      authors: {
        equals: authorId,
      },
    },
  })

  return result
})
