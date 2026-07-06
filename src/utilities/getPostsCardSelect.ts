import type { PostsSelect } from '@/payload-types'

export const getPostsCardSelect = (): PostsSelect<true> => {
  return {
    title: true,
    slug: true,
    categories: true,
    meta: true,
    heroImage: true,
    heroImageAlignment: true,
    content: true,
    authors: true,
    populatedAuthors: true,
    publishedAt: true,
    // The English shadow group must be selected so the withEnglishFallback
    // afterRead hook has en.* values to overlay on card lists; otherwise an
    // `en` request silently shows Romanian titles/meta.
    en: true,
  } as const satisfies PostsSelect<true>
}
