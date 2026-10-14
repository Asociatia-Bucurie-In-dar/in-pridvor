import type { Metadata } from 'next'

import { PayloadRedirects } from '@/components/PayloadRedirects'
import configPromise from '@payload-config'
import { getPayload, type RequiredDataFromCollectionSlug } from 'payload'
import { draftMode } from 'next/headers'
import React, { cache } from 'react'

import { RenderBlocks } from '@/blocks/RenderBlocks'
import { RenderHero } from '@/heros/RenderHero'
import { generateMeta } from '@/utilities/generateMeta'
import PageClient from './page.client'
import { LivePreviewListener } from '@/components/LivePreviewListener'
import { LatestCommentsSection } from '@/components/LatestCommentsSection'
import { routing } from '@/i18n/routing'
import { setRequestLocale } from 'next-intl/server'

const queryPageBySlug = cache(async ({ slug, locale }: { slug: string; locale: string }) => {
  const { isEnabled: draft } = await draftMode()

  const payload = await getPayload({ config: configPromise })

  const result = await payload.find({
    collection: 'pages',
    draft,
    limit: 1,
    depth: 3,
    pagination: false,
    overrideAccess: draft,
    context: { locale },
    where: {
      slug: {
        equals: slug,
      },
    },
  })

  return result.docs?.[0] || null
})

export async function generateStaticParams() {
  const payload = await getPayload({ config: configPromise })
  const pages = await payload.find({
    collection: 'pages',
    draft: false,
    limit: 1000,
    overrideAccess: false,
    pagination: false,
    select: {
      slug: true,
    },
  })

  const slugParams =
    pages.docs
      ?.filter((doc) => {
        return doc.slug !== 'home'
      })
      .map(({ slug }) => {
        return { slug }
      }) || []

  return routing.locales.flatMap((locale) =>
    slugParams.map(({ slug }) => ({ locale, slug })),
  )
}

export const dynamicParams = true
// Content changes revalidate pages on demand (src/utilities/revalidate.ts), so the
// time-based refresh is only a weekly safety net. A short interval here lets every
// crawler visit re-render the page and keep the database awake.
export const revalidate = 604800

type Args = {
  params: Promise<{
    slug?: string
    locale: string
  }>
}

export default async function Page({ params: paramsPromise }: Args) {
  const { isEnabled: draft } = await draftMode()
  const { slug = 'home', locale } = await paramsPromise
  setRequestLocale(locale)
  const url = '/' + slug

  const page = (await queryPageBySlug({
    slug,
    locale,
  })) as RequiredDataFromCollectionSlug<'pages'> | null

  if (!page) {
    return <PayloadRedirects url={url} />
  }

  const { hero, layout } = page

  // The homepage opens with the latest reader comments (right after the hero
  // carousel), unless an editor already placed a comments block in its layout.
  const showLatestComments =
    slug === 'home' &&
    !layout?.some((block) => ['latestComments', 'latestCommentsRail'].includes(block.blockType))

  const leadingHeroBlocks = showLatestComments
    ? layout.findIndex((block) => !['heroCarousel', 'titleBar'].includes(block.blockType))
    : -1
  const splitAt = leadingHeroBlocks === -1 ? layout.length : leadingHeroBlocks

  return (
    <article className="pt-16 pb-16">
      <PageClient />
      <PayloadRedirects disableNotFound url={url} />

      {draft && <LivePreviewListener />}

      <RenderHero {...hero} />
      {showLatestComments ? (
        <>
          <RenderBlocks blocks={layout.slice(0, splitAt)} />
          <LatestCommentsSection locale={locale} />
          <RenderBlocks blocks={layout.slice(splitAt)} />
        </>
      ) : (
        <RenderBlocks blocks={layout} />
      )}
    </article>
  )
}

export async function generateMetadata({ params: paramsPromise }: Args): Promise<Metadata> {
  const { slug = 'home', locale } = await paramsPromise
  const page = await queryPageBySlug({
    slug,
    locale,
  })

  const path = slug === 'home' ? '/' : `/${slug}`

  return generateMeta({ doc: page, path })
}
