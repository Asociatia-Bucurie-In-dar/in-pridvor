import { getPayload } from 'payload'
import configPromise from '@payload-config'
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
  payload.logger.info(`[${action}] Revalidating homepage`)

  paths.push('/posts')
  payload.logger.info(`[${action}] Revalidating posts index and pagination`)

  paths.push('/categories')
  payload.logger.info(`[${action}] Revalidating categories index`)

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
        payload.logger.info(`[${action}] Revalidating category: ${categoryPath}`)
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
      payload.logger.error(
        `Failed to revalidate ${path}: ${error instanceof Error ? error.message : 'Unknown error'}`,
      )
    }
  }

  revalidateTag('posts-sitemap')
}

export async function GET(request: Request) {
  try {
    const payload = await getPayload({ config: configPromise })
    const now = new Date()
    const nowISO = now.toISOString()
    
    const twentyFourHoursAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString()

    const scheduledPosts = await payload.find({
      collection: 'posts',
      where: {
        and: [
          {
            _status: {
              equals: 'draft',
            },
          },
          {
            publishedAt: {
              less_than_equal: nowISO,
            },
          },
        ],
      },
      limit: 50,
      depth: 0,
      overrideAccess: true,
    })

    let publishedCount = 0

    for (const post of scheduledPosts.docs) {
      try {
        await payload.update({
          collection: 'posts',
          id: post.id,
          data: {
            _status: 'published',
          },
          context: {
            disableRevalidate: false,
          },
          overrideAccess: true,
        })

        payload.logger.info(
          `✅ Auto-published scheduled post: "${post.title}" (ID: ${post.id})`,
        )
        publishedCount++
      } catch (error) {
        payload.logger.error(
          `❌ Failed to auto-publish post ${post.id}: ${error instanceof Error ? error.message : 'Unknown error'}`,
        )
      }
    }

    const futurePostsNowActive = await payload.find({
      collection: 'posts',
      where: {
        and: [
          {
            _status: {
              equals: 'published',
            },
          },
          {
            publishedAt: {
              greater_than: twentyFourHoursAgo,
              less_than_equal: nowISO,
            },
          },
        ],
      },
      limit: 200,
      depth: 0,
      overrideAccess: true,
    })

    let revalidatedCount = 0

    for (const post of futurePostsNowActive.docs) {
      try {
        await revalidatePostPages(post, payload, 'publish')
        payload.logger.info(
          `✅ Revalidated cache for post that became active: "${post.title}" (ID: ${post.id}, publishedAt: ${post.publishedAt})`,
        )
        revalidatedCount++
      } catch (error) {
        payload.logger.error(
          `❌ Failed to revalidate post ${post.id}: ${error instanceof Error ? error.message : 'Unknown error'}`,
        )
      }
    }

    return Response.json({
      success: true,
      published: publishedCount,
      revalidated: revalidatedCount,
      checked: scheduledPosts.docs.length + futurePostsNowActive.docs.length,
    })
  } catch (error) {
    return Response.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 },
    )
  }
}

