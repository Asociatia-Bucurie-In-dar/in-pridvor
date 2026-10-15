import type { Metadata } from 'next'

import { PayloadRedirects } from '@/components/PayloadRedirects'
import configPromise from '@payload-config'
import { getPayload, type RequiredDataFromCollectionSlug } from 'payload'
import { draftMode } from 'next/headers'
import React, { cache } from 'react'

import { RenderBlocks } from '@/blocks/RenderBlocks'
import { FeaturedArchiveBlock } from '@/blocks/FeaturedArchive/Component'
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

  // On the homepage the latest reader comments sit in a side column next to the first
  // section after the hero carousel (the editorial), unless an editor already placed a
  // comments block in its layout. Below lg the column stacks under that section.
  const showLatestComments =
    slug === 'home' &&
    !layout?.some((block) => ['latestComments', 'latestCommentsRail'].includes(block.blockType))

  const leadingHeroBlocks = showLatestComments
    ? layout.findIndex((block) => !['heroCarousel', 'titleBar'].includes(block.blockType))
    : -1
  const splitAt = leadingHeroBlocks === -1 ? layout.length : leadingHeroBlocks
  const leadBlock = layout[splitAt]
  // On desktop the comments column starts level with the featured post's image, below the
  // category heading (36px heading row + its 32px bottom margin, see CategoryHeader).
  const offsetAside =
    leadBlock?.blockType === 'featuredArchive' && Boolean(leadBlock.useCustomCategoryHeader)

  return (
    <article className="pt-16 pb-16">
      <PageClient />
      <PayloadRedirects disableNotFound url={url} />

      {draft && <LivePreviewListener />}

      <RenderHero {...hero} />
      {showLatestComments ? (
        <>
          <RenderBlocks blocks={layout.slice(0, splitAt)} />
          <div className="container my-16 flex flex-col gap-12 lg:flex-row lg:gap-10">
            {leadBlock && (
              <div className="min-w-0 flex-1">
                {leadBlock.blockType === 'featuredArchive' ? (
                  // Only its featured post: the comments column takes the place of the rest
                  <FeaturedArchiveBlock
                    {...leadBlock}
                    id={leadBlock.id ?? undefined}
                    disableInnerContainer
                    featuredOnly
                  />
                ) : (
                  <RenderBlocks blocks={[leadBlock]} disableInnerContainer />
                )}
              </div>
            )}
            {/* Collapses when there are no comments, giving the lead section the full width */}
            <aside
              className={`min-w-0 empty:hidden lg:w-80 lg:shrink-0 xl:w-96 ${offsetAside ? 'lg:pt-17' : ''}`}
            >
              <LatestCommentsSection locale={locale} />
            </aside>
          </div>
          <RenderBlocks blocks={layout.slice(splitAt + 1)} />
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
