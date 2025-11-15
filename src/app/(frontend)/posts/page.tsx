import type { Metadata } from 'next/types'

import { CollectionArchive } from '@/components/CollectionArchive'
import { PageRange } from '@/components/PageRange'
import { Pagination } from '@/components/Pagination'
import { TitleBar } from '@/components/TitleBar'
import configPromise from '@payload-config'
import { getPayload } from 'payload'
import PageClient from './page.client'
import { websiteTitle } from '@/utilities/commonInfo'
import { getPostsCardSelect } from '@/utilities/getPostsCardSelect'

export const dynamic = 'force-static'
export const revalidate = 60

export default async function Page() {
  const payload = await getPayload({ config: configPromise })
  const now = new Date().toISOString()

  const posts = await payload.find({
    collection: 'posts',
    depth: 1,
    limit: 12,
    sort: '-publishedAt',
    overrideAccess: false,
    select: getPostsCardSelect(),
    where: {
      and: [
        {
          publishedAt: {
            less_than_equal: now,
          },
        },
      ],
    },
  })

  return (
    <div className="pb-24">
      <PageClient />
      <TitleBar title="Toate Articolele" />

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
          <Pagination page={posts.page} totalPages={posts.totalPages} />
        )}
      </div>
    </div>
  )
}

export function generateMetadata(): Metadata {
  return {
    title: websiteTitle + 'Posts',
  }
}
