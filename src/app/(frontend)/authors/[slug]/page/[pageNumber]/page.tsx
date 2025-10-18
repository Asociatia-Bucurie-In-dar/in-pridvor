import type { Metadata } from 'next'

import { CollectionArchive } from '@/components/CollectionArchive'
import { Pagination } from '@/components/Pagination'
import { PageRange } from '@/components/PageRange'
import configPromise from '@payload-config'
import { getPayload } from 'payload'
import { cache } from 'react'
import { notFound } from 'next/navigation'
import PageClient from './page.client'
import { toKebabCase } from '@/utilities/toKebabCase'

type Args = {
  params: Promise<{
    pageNumber: string
    slug: string
  }>
}

export default async function AuthorPage({ params: paramsPromise }: Args) {
  const { pageNumber, slug } = await paramsPromise
  const payload = await getPayload({ config: configPromise })

  const sanitizedPageNumber = Number(pageNumber)

  if (!Number.isInteger(sanitizedPageNumber)) notFound()

  // Find the author by slug
  const author = await queryAuthorBySlug({ slug })

  if (!author) notFound()

  const posts = await payload.find({
    collection: 'posts',
    depth: 1,
    limit: 12,
    page: sanitizedPageNumber,
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
        equals: author.id,
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
              basePath={`/authors/${slug}`}
            />
          )}
        </div>
      </div>
    </div>
  )
}

export async function generateMetadata({ params: paramsPromise }: Args): Promise<Metadata> {
  const { slug, pageNumber } = await paramsPromise
  const author = await queryAuthorBySlug({ slug })

  return {
    title: `${author?.name || 'Author'} - Page ${pageNumber}`,
    description: `Posts by ${author?.name || 'this author'} - Page ${pageNumber}`,
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

export async function generateStaticParams() {
  const payload = await getPayload({ config: configPromise })

  // Get all users
  const users = await payload.find({
    collection: 'users',
    limit: 1000,
    overrideAccess: true,
    pagination: false,
    select: {
      name: true,
    },
  })

  const params: { slug: string; pageNumber: string }[] = []

  // For each user, get their post count and generate page numbers
  for (const user of users.docs) {
    if (!user.name) continue

    const slug = toKebabCase(user.name)

    // Get the total number of posts by this author
    const postsCount = await payload.find({
      collection: 'posts',
      limit: 0,
      overrideAccess: true,
      where: {
        authors: {
          equals: user.id,
        },
      },
    })

    const totalPages = Math.ceil(postsCount.totalDocs / 12)

    // Generate params for pages 1 through totalPages
    for (let page = 1; page <= totalPages; page++) {
      params.push({
        slug,
        pageNumber: String(page),
      })
    }
  }

  return params
}
