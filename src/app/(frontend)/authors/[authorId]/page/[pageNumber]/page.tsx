import type { Metadata } from 'next'

import { CollectionArchive } from '@/components/CollectionArchive'
import { Pagination } from '@/components/Pagination'
import { PageRange } from '@/components/PageRange'
import configPromise from '@payload-config'
import { getPayload } from 'payload'
import { cache } from 'react'
import { notFound } from 'next/navigation'
import PageClient from './page.client'
import { getPostsCardSelect } from '@/utilities/getPostsCardSelect'

type Args = {
  params: Promise<{
    pageNumber: string
    authorId: string
  }>
}

export default async function AuthorPage({ params: paramsPromise }: Args) {
  const { pageNumber, authorId } = await paramsPromise
  const payload = await getPayload({ config: configPromise })

  const sanitizedPageNumber = Number(pageNumber)

  if (!Number.isInteger(sanitizedPageNumber)) notFound()

  // Find the author by ID
  const author = await queryAuthorById({ authorId })

  if (!author) notFound()

  const authorRelationId =
    typeof author.id === 'number'
      ? author.id
      : Number.isNaN(Number(author.id))
        ? String(author.id)
        : Number(author.id)

  const posts = await payload.find({
    collection: 'posts',
    depth: 1,
    limit: 12,
    page: sanitizedPageNumber,
    overrideAccess: false,
    select: getPostsCardSelect(),
    where: {
      authors: {
        equals: authorRelationId,
      },
    },
  })

  return (
    <div className="pt-16 pb-16">
      <PageClient />

      <div className="flex flex-col items-center gap-4 pt-8">
        <div className="container mb-16">
          <div className="prose max-w-none text-center">
            <h1 className="text-4xl lg:text-5xl">{author.name}</h1>
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
  const { authorId, pageNumber } = await paramsPromise
  const author = await queryAuthorById({ authorId })

  return {
    title: `${author?.name || 'Author'} - Page ${pageNumber}`,
    description: `Posts by ${author?.name || 'this author'} - Page ${pageNumber}`,
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

export async function generateStaticParams() {
  const payload = await getPayload({ config: configPromise })

  // Get all users
  const users = await payload.find({
    collection: 'users',
    limit: 1000,
    overrideAccess: true,
    pagination: false,
  })

  const params: { authorId: string; pageNumber: string }[] = []

  // For each user, get their post count and generate page numbers
  for (const user of users.docs) {
    if (user.id === undefined || user.id === null) continue

    const normalizedUserId =
      typeof user.id === 'number'
        ? user.id
        : Number.isNaN(Number(user.id))
          ? String(user.id)
          : Number(user.id)

    // Get the total number of posts by this author
    const postsCount = await payload.find({
      collection: 'posts',
      limit: 0,
      overrideAccess: true,
      where: {
        authors: {
          equals: normalizedUserId,
        },
      },
    })

    const totalPages = Math.ceil(postsCount.totalDocs / 12)

    // Generate params for pages 1 through totalPages
    for (let page = 1; page <= totalPages; page++) {
      params.push({
        authorId: String(user.id),
        pageNumber: String(page),
      })
    }
  }

  return params
}
