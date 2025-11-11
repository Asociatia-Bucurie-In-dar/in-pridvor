import type { Metadata } from 'next/types'

import { CollectionArchive } from '@/components/CollectionArchive'
import configPromise from '@payload-config'
import { getPayload } from 'payload'
import React from 'react'
import { Search } from '@/search/Component'
import PageClient from './page.client'
import { CardPostData } from '@/components/Card'
import { getPostsCardSelect } from '@/utilities/getPostsCardSelect'

type Args = {
  searchParams: Promise<{
    q: string
  }>
}
export default async function Page({ searchParams: searchParamsPromise }: Args) {
  const { q: query } = await searchParamsPromise
  const payload = await getPayload({ config: configPromise })
  const nowISO = new Date().toISOString()

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
        ...(query
          ? [
              {
                or: [
                  {
                    title: {
                      like: query,
                    },
                  },
                  {
                    'meta.title': {
                      like: query,
                    },
                  },
                  {
                    slug: {
                      like: query,
                    },
                  },
                ],
              },
            ]
          : []),
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
