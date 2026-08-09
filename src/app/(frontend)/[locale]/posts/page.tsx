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
import { appendCommentCounts } from '@/utilities/appendCommentCounts'

export const dynamic = 'force-static'
// ISR so newly-translated en_* post titles/cards surface without a rebuild.
export const revalidate = 300

type Args = {
  params: Promise<{
    locale: string
  }>
}

export default async function Page({ params: paramsPromise }: Args) {
  const { locale } = await paramsPromise
  const payload = await getPayload({ config: configPromise })
  const now = new Date().toISOString()

  const posts = await payload.find({
    collection: 'posts',
    depth: 1,
    limit: 12,
    sort: '-publishedAt',
    overrideAccess: false,
    select: getPostsCardSelect(),
    context: { locale },
    where: {
      publishedAt: {
        less_than_equal: now,
      },
    },
  })
  const postsWithCounts = await appendCommentCounts(payload, posts.docs)

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

      <CollectionArchive posts={postsWithCounts} />

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
