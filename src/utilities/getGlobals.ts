import type { Config } from 'src/payload-types'

import configPromise from '@payload-config'
import { getPayload } from 'payload'
import { unstable_cache } from 'next/cache'

type Global = keyof Config['globals']

async function getGlobal(slug: Global, depth = 0, locale = 'ro') {
  const payload = await getPayload({ config: configPromise })

  const global = await payload.findGlobal({
    slug,
    depth,
    // Signal the requested locale to afterRead hooks (English fallback).
    // Payload localization is OFF, so this travels via request context only.
    context: { locale },
  })

  return global
}

/**
 * Returns a unstable_cache function mapped with the cache tag for the slug.
 * The locale is part of both the cache key and the tag so each language is
 * cached and revalidated independently.
 */
export const getCachedGlobal = (slug: Global, depth = 0, locale = 'ro') =>
  unstable_cache(async () => getGlobal(slug, depth, locale), [slug, locale], {
    tags: [`global_${slug}_${locale}`],
  })
