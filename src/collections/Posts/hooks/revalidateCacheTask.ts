import { revalidatePath, revalidateTag } from 'next/cache'
import type { Post, Category } from '@/payload-types'

const revalidatePostPages = async (
  post: Post,
  payload: any,
  action: 'publish' | 'unpublish' | 'delete',
) => {
  const paths: string[] = []

  if (post.slug) {
    const postPath = `/posts/${post.slug}`
    paths.push(postPath)
    payload.logger.info(`[${action}] Revalidating post: ${postPath}`)
  }

  paths.push('/')
  paths.push('/posts')
  paths.push('/categories')

  if (post.categories && Array.isArray(post.categories) && post.categories.length > 0) {
    for (const category of post.categories) {
      let categoryData: Category | null = null

      if (typeof category === 'object' && category !== null && 'slug' in category) {
        categoryData = category as Category
      } else if (typeof category === 'number' || typeof category === 'string') {
        try {
          const result = await payload.findByID({
            collection: 'categories',
            id: category,
            depth: 0,
          })
          categoryData = result
        } catch (error) {
          payload.logger.error(
            `Failed to fetch category ${category}: ${error instanceof Error ? error.message : 'Unknown error'}`,
          )
        }
      }

      if (categoryData?.slug) {
        const categoryPath = `/categories/${categoryData.slug}`
        paths.push(categoryPath)
      }
    }
  }

  for (const path of paths) {
    try {
      revalidatePath(path)
      revalidatePath(path, 'layout')
      if (path === '/posts') {
        revalidatePath(path, 'page')
      }
    } catch (error) {
      payload.logger.error(`Failed to revalidate ${path}`)
    }
  }

  revalidateTag('posts-sitemap')
}

export const revalidateCacheTask = async ({ payload, req, input }: {
  payload: any
  req: any
  input: unknown
}) => {
  try {
    const postId = typeof input === 'object' && input !== null && 'postId' in input
      ? input.postId
      : null

    if (!postId || typeof postId !== 'number') {
      payload.logger.error('❌ Invalid postId in revalidateCache task input')
      return { success: false, error: 'Invalid postId' }
    }

    const post = await payload.findByID({
      collection: 'posts',
      id: postId,
      depth: 1,
      overrideAccess: true,
    })

    if (!post) {
      payload.logger.error(`❌ Post ${postId} not found for cache revalidation`)
      return { success: false, error: 'Post not found' }
    }

    const now = new Date()
    const publishedAt = post.publishedAt ? new Date(post.publishedAt) : null

    if (post._status === 'published' && publishedAt && publishedAt <= now) {
      await revalidatePostPages(post, payload, 'publish')
      payload.logger.info(
        `✅ Cache revalidated for post "${post.title}" (ID: ${post.id})`,
      )
      return { success: true, postId, postTitle: post.title }
    } else {
      payload.logger.info(
        `ℹ️ Post "${post.title}" (ID: ${post.id}) is not ready for revalidation yet`,
      )
      return { success: false, reason: 'Post not ready' }
    }
  } catch (error) {
    payload.logger.error(
      `❌ Error in revalidateCache task: ${error instanceof Error ? error.message : 'Unknown error'}`,
    )
    throw error
  }
}

