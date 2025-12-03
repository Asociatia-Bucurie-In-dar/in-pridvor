import type { Metadata } from 'next'

import { RelatedPosts } from '@/blocks/RelatedPosts/Component'
import { PayloadRedirects } from '@/components/PayloadRedirects'
import configPromise from '@payload-config'
import { getPayload } from 'payload'
import { draftMode } from 'next/headers'
import React, { cache } from 'react'
import RichText from '@/components/RichText'

import type { Post } from '@/payload-types'

import { PostHero } from '@/heros/PostHero'
import { PostHeroEditable } from '@/components/PostHeroEditable'
import { generateMeta } from '@/utilities/generateMeta'
import PageClient from './page.client'
import { LivePreviewListener } from '@/components/LivePreviewListener'
import { Comments } from '@/components/Comments/Comments'
import { DropCapHandler } from '@/components/DropCapHandler'
import { EditPostLink } from '@/components/EditPostLink'
import { ArticleStructuredData } from '@/components/StructuredData/ArticleStructuredData'

export async function generateStaticParams() {
  const payload = await getPayload({ config: configPromise })
  const posts = await payload.find({
    collection: 'posts',
    draft: false,
    limit: 1000,
    overrideAccess: false,
    pagination: false,
    select: {
      slug: true,
    },
  })

  const params = posts.docs.map(({ slug }) => {
    return { slug }
  })

  return params
}

export const dynamicParams = true

type Args = {
  params: Promise<{
    slug?: string
  }>
}

export default async function Post({ params: paramsPromise }: Args) {
  const { isEnabled: draft } = await draftMode()
  const { slug = '' } = await paramsPromise
  const url = '/posts/' + slug
  const post = await queryPostBySlug({ slug })

  if (!post) return <PayloadRedirects url={url} />

  // Use the enableDropCap field from the post (defaults to true)
  const showDropCap = post.enableDropCap !== false
  const dropCapIndex = post.dropCapParagraphIndex || 1

  return (
    <article className="pt-16 pb-16">
      <ArticleStructuredData post={post} />
      <PageClient postId={post.id} />

      {/* Allows redirects for valid pages too */}
      <PayloadRedirects disableNotFound url={url} />

      {draft && <LivePreviewListener />}

      <EditPostLink postId={post.id} />

      <PostHeroEditable post={post} showDropCap={showDropCap} dropCapIndex={dropCapIndex} />

      <div className="flex flex-col items-center gap-4 pt-8">
        <div className="container">
          {showDropCap && (
            <DropCapHandler
              containerSelector=".article-content-with-dropcap"
              dropCapIndex={dropCapIndex}
            />
          )}
          <RichText
            className={`max-w-3xl mx-auto ${showDropCap ? 'article-content-with-dropcap' : ''}`}
            data-dropcap-index={showDropCap ? dropCapIndex : undefined}
            data={post.content as any}
            enableGutter={false}
          />
          {post.relatedPosts && post.relatedPosts.length > 0 && (
            <RelatedPosts
              className="mt-12 max-w-208 lg:grid lg:grid-cols-subgrid col-start-1 col-span-3 grid-rows-[2fr]"
              docs={post.relatedPosts.filter((post) => typeof post === 'object')}
            />
          )}
          <hr className="article-separator" />
          <Comments postId={String(post.id)} />
        </div>
      </div>
    </article>
  )
}

export async function generateMetadata({ params: paramsPromise }: Args): Promise<Metadata> {
  const { slug = '' } = await paramsPromise
  const post = await queryPostBySlug({ slug })
  const path = slug ? `/posts/${slug}` : '/posts'

  return generateMeta({ doc: post, path, ogType: 'article' })
}

const queryPostBySlug = cache(async ({ slug }: { slug: string }) => {
  const { isEnabled: draft } = await draftMode()

  const payload = await getPayload({ config: configPromise })

  const result = await payload.find({
    collection: 'posts',
    draft,
    limit: 1,
    overrideAccess: draft,
    pagination: false,
    where: {
      slug: {
        equals: slug,
      },
    },
  })

  return result.docs?.[0] || null
})
