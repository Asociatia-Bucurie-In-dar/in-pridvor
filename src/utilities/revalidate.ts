import { revalidatePath, revalidateTag } from 'next/cache'

import { routing } from '@/i18n/routing'

/**
 * On-demand cache invalidation for the public site.
 *
 * Every frontend route lives under the `[locale]` segment, and next-intl rewrites
 * "/posts/x" to "/ro/posts/x". The cache therefore only knows locale-prefixed
 * pathnames ("/ro/posts/x", "/en/posts/x") and route patterns, which include the
 * route group ("/(frontend)/[locale]/posts/[slug]/page") — a plain "/posts/x"
 * matches nothing.
 *
 * Invalidation is lazy: entries are only marked stale, and a page is re-rendered
 * (querying the database) the next time someone requests it.
 *
 * Outside a Next.js request (CLI scripts, migrations, seeding) there is no cache to
 * purge and Next throws, so failures are swallowed.
 */
const safely = (fn: () => void) => {
  try {
    fn()
  } catch {
    // No Next.js request context — nothing to invalidate.
  }
}

/** Expire a data-cache tag immediately so the next request gets fresh data. */
export const expireTag = (tag: string) => safely(() => revalidateTag(tag, { expire: 0 }))

/** Revalidate one concrete path, e.g. "/posts/my-slug", in every locale. */
export const revalidateLocalizedPath = (path: string) => {
  const suffix = path === '/' ? '' : path
  for (const locale of routing.locales) {
    safely(() => revalidatePath(`/${locale}${suffix}`))
  }
}

const FRONTEND_ROUTE = '/(frontend)/[locale]'

/** Revalidate every page rendered from a route pattern, e.g. "/posts/page/[pageNumber]". */
export const revalidateRoute = (route: string) =>
  safely(() => revalidatePath(`${FRONTEND_ROUTE}${route === '/' ? '' : route}`, 'page'))

/** Revalidate the whole public site (every page in every locale). Use for rare, global changes. */
export const revalidateSite = () => safely(() => revalidatePath(FRONTEND_ROUTE, 'layout'))

// Every route that lists posts or shows their title, image, author or comment count.
const POST_LISTING_ROUTES = [
  '/', // home page blocks (featured, archive, carousel, latest comments)
  '/[slug]', // CMS pages can embed archive blocks
  '/posts',
  '/posts/page/[pageNumber]',
  '/categories',
  '/categories/[...slug]',
  '/authors',
  '/authors/[authorId]',
  '/authors/[authorId]/page/[pageNumber]',
]

export const revalidatePostListings = () => {
  for (const route of POST_LISTING_ROUTES) revalidateRoute(route)
  expireTag('posts-sitemap')
}

export const revalidatePost = (slug?: string | null) => {
  if (slug) revalidateLocalizedPath(`/posts/${slug}`)
}

/** Data-cache tag for the next due scheduled publish (see /api/publish-scheduled). */
export const PUBLISH_SCHEDULE_TAG = 'publish-schedule'

/** Data-cache tag for the "latest comments" blocks. */
export const LATEST_COMMENTS_TAG = 'latest-comments'

export const headerCategoriesTag = (locale: string) => `header_categories_${locale}`
export const globalTag = (slug: string, locale: string) => `global_${slug}_${locale}`

export const expireHeaderCategories = () => {
  for (const locale of routing.locales) expireTag(headerCategoriesTag(locale))
}

export const expireGlobal = (slug: string) => {
  for (const locale of routing.locales) expireTag(globalTag(slug, locale))
}
