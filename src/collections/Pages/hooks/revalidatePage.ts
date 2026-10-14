import type { CollectionAfterChangeHook, CollectionAfterDeleteHook } from 'payload'

import type { Page } from '../../../payload-types'
import { expireTag, revalidateLocalizedPath } from '@/utilities/revalidate'

const pagePath = (slug?: string | null) => (slug === 'home' ? '/' : `/${slug}`)

export const revalidatePage: CollectionAfterChangeHook<Page> = ({
  doc,
  previousDoc,
  req: { payload, context },
}) => {
  if (context.disableRevalidate) return doc

  const wasPublished = previousDoc?._status === 'published'
  const isPublished = doc._status === 'published'

  if (isPublished) {
    payload.logger.info(`Revalidating page at path: ${pagePath(doc.slug)}`)
    revalidateLocalizedPath(pagePath(doc.slug))
  }

  // Unpublished, or published under a new slug: the old URL must stop serving the old page.
  if (wasPublished && (!isPublished || previousDoc.slug !== doc.slug)) {
    revalidateLocalizedPath(pagePath(previousDoc.slug))
  }

  if (isPublished || wasPublished) expireTag('pages-sitemap')

  return doc
}

export const revalidateDelete: CollectionAfterDeleteHook<Page> = ({ doc, req: { context } }) => {
  if (!context.disableRevalidate && doc) {
    revalidateLocalizedPath(pagePath(doc.slug))
    expireTag('pages-sitemap')
  }

  return doc
}
