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
  } as const satisfies PostsSelect<true>
}
