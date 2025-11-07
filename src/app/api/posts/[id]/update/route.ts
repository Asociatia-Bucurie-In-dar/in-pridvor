import { createLocalReq, getPayload } from 'payload'
import configPromise from '@payload-config'
import { NextRequest, NextResponse } from 'next/server'
import { revalidatePath } from 'next/cache'
import type { Post, Category, User } from '@/payload-types'

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const payload = await getPayload({ config: configPromise })

    const { user } = await payload.auth({ headers: request.headers })

    if (!user) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { authors, categories, enableDropCap, dropCapParagraphIndex, heroImageAlignment } = body

    const updateData: any = {}

    if (authors !== undefined) {
      updateData.authors = authors
    }

    if (categories !== undefined) {
      updateData.categories = categories
    }

    if (enableDropCap !== undefined) {
      updateData.enableDropCap = enableDropCap
    }

    if (dropCapParagraphIndex !== undefined) {
      updateData.dropCapParagraphIndex = dropCapParagraphIndex
    }

    if (heroImageAlignment !== undefined) {
      updateData.heroImageAlignment = heroImageAlignment
    }

    console.log('Updating post with data:', { id, updateData })

    const payloadReq = await createLocalReq({ user }, payload)

    const updatedPost = await payload.update({
      collection: 'posts',
      id: parseInt(id, 10),
      data: updateData,
      overrideAccess: true,
      req: payloadReq,
    })

    // Comprehensive revalidation for all places where this post might appear
    // (Payload hooks should also handle this, but we do it here for API route updates)
    if (updatedPost._status === 'published' && updatedPost.slug) {
      try {
        const paths: string[] = []

        // 1. Revalidate the specific post page
        const postPath = `/posts/${updatedPost.slug}`
        paths.push(postPath)

        // 2. Revalidate homepage (may contain ArchiveBlocks with recent posts)
        paths.push('/')

        // 3. Revalidate posts index page and all pagination pages
        paths.push('/posts')

        // 4. Revalidate categories index page
        paths.push('/categories')

        // 5. Revalidate search page (may show this post in results)
        paths.push('/search')

        // 6. Revalidate all category pages this post belongs to
        if (updatedPost.categories && Array.isArray(updatedPost.categories)) {
          for (const category of updatedPost.categories) {
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
                console.error(`Failed to fetch category ${category}:`, error)
              }
            }

            if (categoryData?.slug) {
              const categoryPath = `/categories/${categoryData.slug}`
              paths.push(categoryPath)
            }
          }
        }

        // 7. Revalidate all author pages for authors of this post
        if (updatedPost.authors && Array.isArray(updatedPost.authors)) {
          for (const author of updatedPost.authors) {
            let authorData: User | null = null

            if (typeof author === 'object' && author !== null && 'name' in author) {
              authorData = author as User
            } else if (typeof author === 'number' || typeof author === 'string') {
              try {
                const result = await payload.findByID({
                  collection: 'users',
                  id: author,
                  depth: 0,
                })
                authorData = result
              } catch (error) {
                console.error(`Failed to fetch author ${author}:`, error)
              }
            }

            if (authorData?.id !== undefined && authorData?.id !== null) {
              const authorPath = `/authors/${authorData.id}`
              paths.push(authorPath)
            }
          }
        }

        // Execute all revalidations
        for (const path of paths) {
          try {
            revalidatePath(path)
            revalidatePath(path, 'layout') // Also revalidate layouts
            // For /posts path, also revalidate all nested pagination pages
            if (path === '/posts') {
              revalidatePath(path, 'page') // Revalidates /posts/page/[pageNumber]
            }
          } catch (error) {
            console.error(`Failed to revalidate ${path}:`, error)
          }
        }

        console.log(`Revalidated ${paths.length} paths for post: ${postPath}`, paths)
      } catch (error) {
        console.error('Error revalidating paths:', error)
        // Don't fail the request if revalidation fails
      }
    }

    return NextResponse.json({ success: true, post: updatedPost })
  } catch (error) {
    console.error('Error updating post:', error)
    const errorMessage = error instanceof Error ? error.message : String(error)
    const errorStack = error instanceof Error ? error.stack : undefined
    return NextResponse.json(
      {
        message: 'Error updating post',
        error: errorMessage,
        stack: errorStack,
      },
      { status: 500 },
    )
  }
}
