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
import { getPostsCardSelect } from '@/utilities/getPostsCardSelect'

export async function generateStaticParams() {
  const payload = await getPayload({ config: configPromise })
  const users = await payload.find({
    collection: 'users',
    limit: 1000,
    overrideAccess: true,
    pagination: false,
  })

  const params = users.docs
    .filter((user) => user.id !== undefined && user.id !== null)
    .map((user) => ({
      authorId: String(user.id),
    }))

  return params
}

export const dynamicParams = true

type Args = {
  params: Promise<{
    authorId: string
  }>
}

export default async function Author({ params: paramsPromise }: Args) {
  const { authorId } = await paramsPromise
  const url = '/authors/' + authorId
  const author = await queryAuthorById({ authorId })

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
              basePath={`/authors/${authorId}`}
            />
          )}
        </div>
      </div>
    </div>
  )
}

export async function generateMetadata({ params: paramsPromise }: Args): Promise<Metadata> {
  const { authorId } = await paramsPromise
  const author = await queryAuthorById({ authorId })

  return {
    title: author?.name || 'Author',
    description: `Posts by ${author?.name || 'this author'}`,
  }
}

const queryAuthorById = cache(async ({ authorId }: { authorId: string }) => {
  const payload = await getPayload({ config: configPromise })

  const normalizedId = Number.isNaN(Number(authorId)) ? authorId : Number(authorId)

  try {
    const author = await payload.findByID({
      collection: 'users',
      id: normalizedId,
      overrideAccess: true,
      depth: 0,
    })

    return author || null
  } catch (error: any) {
    if (error?.status === 404 || error?.message?.includes('not found')) {
      return null
    }

    throw error
  }
})

const queryPostsByAuthorId = cache(async (authorId: number | string) => {
  const payload = await getPayload({ config: configPromise })

  const normalizedAuthorId =
    typeof authorId === 'number'
      ? authorId
      : Number.isNaN(Number(authorId))
        ? authorId
        : Number(authorId)

  const result = await payload.find({
    collection: 'posts',
    depth: 1,
    limit: 12,
    overrideAccess: false,
    select: getPostsCardSelect(),
    where: {
      authors: {
        equals: normalizedAuthorId,
      },
    },
  })

  return result
})
