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
import { setRequestLocale } from 'next-intl/server'

export const dynamic = 'force-static'
// Content changes revalidate pages on demand (src/utilities/revalidate.ts), so the
// time-based refresh is only a weekly safety net. A short interval here lets every
// crawler visit re-render the page and keep the database awake.
export const revalidate = 604800

type Args = {
  params: Promise<{
    locale: string
  }>
}

export default async function Page({ params: paramsPromise }: Args) {
  const { locale } = await paramsPromise
  setRequestLocale(locale)
  const payload = await getPayload({ config: configPromise })

  const posts = await payload.find({
    collection: 'posts',
    depth: 1,
    limit: 12,
    overrideAccess: false,
    select: getPostsCardSelect(),
    context: { locale },
  })
  const postsWithCounts = await appendCommentCounts(payload, posts.docs)

  return (
    <div className="pb-24">
      <PageClient />
      <TitleBar title={`Toate Rubricile - ${websiteTitle}`} />

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
