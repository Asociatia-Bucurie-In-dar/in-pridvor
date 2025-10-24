import { createLocalReq, getPayload } from 'payload'
import config from '@payload-config'
import { headers } from 'next/headers'
import fs from 'fs'
import path from 'path'

interface PostData {
  title: string
  slug: string
  content: string
  excerpt: string
  publishedDate: string
  status: string
  author: string
  categories: number[]
}

export const maxDuration = 300 // This function can run for a maximum of 5 minutes

export async function POST(): Promise<Response> {
  const payload = await getPayload({ config })
  const requestHeaders = await headers()

  // Authenticate by passing request headers
  const { user } = await payload.auth({ headers: requestHeaders })

  if (!user) {
    return new Response('Action forbidden.', { status: 403 })
  }

  try {
    // Create a Payload request object to pass to the Local API for transactions
    const payloadReq = await createLocalReq({ user }, payload)

    payload.logger.info('Starting post import...')

    // Read the generated posts data
    const postsFilePath = path.join(process.cwd(), 'import-data', 'posts-final-all.json')

    if (!fs.existsSync(postsFilePath)) {
      return new Response('Posts file not found.', { status: 404 })
    }

    const postsData: PostData[] = JSON.parse(fs.readFileSync(postsFilePath, 'utf-8'))
    payload.logger.info(`Found ${postsData.length} posts to import`)

    // Get Anca Stanciu user
    const users = await payload.find({
      collection: 'users',
      where: {
        name: {
          equals: 'Anca Stanciu',
        },
      },
      limit: 1,
      req: payloadReq,
    })

    if (users.docs.length === 0) {
      return new Response('Anca Stanciu user not found.', { status: 404 })
    }

    const ancaUser = users.docs[0]
    if (!ancaUser) {
      return new Response('Anca Stanciu user not found.', { status: 404 })
    }

    payload.logger.info(`Found Anca Stanciu user: ID ${ancaUser.id}`)

    // Import posts in batches
    let imported = 0
    let errors = 0
    const errorsList: string[] = []
    const batchSize = 10

    for (let i = 0; i < postsData.length; i += batchSize) {
      const batch = postsData.slice(i, i + batchSize)

      payload.logger.info(
        `Processing batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(postsData.length / batchSize)}`,
      )

      for (const post of batch) {
        try {
          // Convert HTML content to simple Lexical format
          const lexicalContent = {
            root: {
              type: 'root',
              children: [
                {
                  type: 'paragraph',
                  children: [
                    {
                      type: 'text',
                      detail: 0,
                      format: 0,
                      mode: 'normal',
                      style: '',
                      text: post.content.replace(/<[^>]*>/g, ''), // Strip HTML tags
                      version: 1,
                    },
                  ],
                  direction: 'ltr' as const,
                  format: '' as const,
                  indent: 0,
                  textFormat: 0,
                  version: 1,
                },
              ],
              direction: 'ltr' as const,
              format: '' as const,
              indent: 0,
              version: 1,
            },
          }

          const postPayload = {
            title: post.title,
            slug: post.slug,
            content: lexicalContent,
            publishedAt: post.publishedDate,
            _status: 'published' as const,
            authors: [ancaUser.id],
            categories: post.categories,
          }

          await payload.create({
            collection: 'posts',
            depth: 0,
            context: {
              disableRevalidate: true,
            },
            data: postPayload,
            req: payloadReq,
          })

          imported++
          if (imported % 25 === 0) {
            payload.logger.info(`Imported ${imported} posts...`)
          }
        } catch (error) {
          errors++
          errorsList.push(`Post "${post.title}": ${error}`)
          payload.logger.warn(`Error importing "${post.title}": ${error}`)
        }
      }
    }

    // Final report
    payload.logger.info(`Import completed: ${imported} imported, ${errors} errors`)

    return Response.json({
      success: true,
      imported,
      errors,
      total: postsData.length,
      errorList: errorsList.slice(0, 10), // Return first 10 errors
    })
  } catch (e) {
    payload.logger.error({ err: e, message: 'Error importing posts' })
    return new Response('Error importing posts.', { status: 500 })
  }
}
