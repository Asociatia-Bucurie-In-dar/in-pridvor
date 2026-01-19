import type { Metadata } from 'next/types'

import { CollectionArchive } from '@/components/CollectionArchive'
import configPromise from '@payload-config'
import { getPayload, Payload } from 'payload'
import React from 'react'
import { Search } from '@/search/Component'
import PageClient from './page.client'
import { CardPostData } from '@/components/Card'
import { getPostsCardSelect } from '@/utilities/getPostsCardSelect'
import { generateSearchVariants } from '@/utilities/romanianSearch'
import type { Where } from 'payload'

type Args = {
  searchParams: Promise<{
    q: string
  }>
}

async function findMatchingAuthorIds(payload: Payload, query: string): Promise<number[]> {
  const variants = generateSearchVariants(query)

  const nameConditions = variants.map((variant) => ({
    name: { like: variant },
  }))

  const users = await payload.find({
    collection: 'users',
    where: {
      or: nameConditions,
    },
    limit: 100,
  })

  return users.docs.map((user) => user.id)
}

async function buildSearchConditions(payload: Payload, query: string): Promise<Where | null> {
  if (!query) return null

  const variants = generateSearchVariants(query)

  const titleConditions = variants.map((variant) => ({
    title: { like: variant },
  }))

  const metaTitleConditions = variants.map((variant) => ({
    'meta.title': { like: variant },
  }))

  const slugConditions = variants.map((variant) => ({
    slug: { like: variant },
  }))

  const authorIds = await findMatchingAuthorIds(payload, query)
  const authorConditions = authorIds.length > 0 ? [{ authors: { in: authorIds } }] : []

  return {
    or: [...titleConditions, ...metaTitleConditions, ...slugConditions, ...authorConditions],
  }
}

export default async function Page({ searchParams: searchParamsPromise }: Args) {
  const { q: query } = await searchParamsPromise
  const payload = await getPayload({ config: configPromise })
  const nowISO = new Date().toISOString()

  const searchCondition = await buildSearchConditions(payload, query)

  const posts = await payload.find({
    collection: 'posts',
    depth: 1,
    limit: 12,
    sort: '-publishedAt',
    select: getPostsCardSelect(),
    where: {
      and: [
        {
          publishedAt: {
            less_than_equal: nowISO,
          },
        },
        ...(searchCondition ? [searchCondition] : []),
      ],
    },
  })

  return (
    <div className="pt-24 pb-24">
      <PageClient />
      <div className="container mb-16">
        <div className="prose max-w-none text-center">
          <h1 className="mb-8 lg:mb-16">Căutare</h1>

          <div className="max-w-200 mx-auto">
            <Search />
          </div>
        </div>
      </div>

      {posts.totalDocs > 0 ? (
        <CollectionArchive posts={posts.docs as CardPostData[]} />
      ) : (
        <div className="container">Niciun rezultat găsit.</div>
      )}
    </div>
  )
}

export function generateMetadata(): Metadata {
  return {
    title: `Căutare articole din revistă`,
  }
}
