import { createLocalReq, getPayload } from 'payload'
import config from '@payload-config'
import { headers } from 'next/headers'
import { XMLParser } from 'fast-xml-parser'
import fs from 'fs'
import path from 'path'
import { htmlToLexical } from '@/utilities/htmlToLexical'

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
    const payloadReq = await createLocalReq({ user }, payload)

    // Read the XML file
    const xmlFilePath = path.join(process.cwd(), 'inpridvor.WordPress.2025-10-24.xml')

    if (!fs.existsSync(xmlFilePath)) {
      return new Response('XML file not found.', { status: 404 })
    }

    const xmlContent = fs.readFileSync(xmlFilePath, 'utf-8')

    payload.logger.info('📄 Parsing WordPress XML...')

    // Parse XML
    const parser = new XMLParser({
      ignoreAttributes: false,
      attributeNamePrefix: '',
      textNodeName: 'text',
      isArray: (name) => {
        if (name === 'wp:postmeta' || name === 'category') return true
        return false
      },
    })

    const xmlData = parser.parse(xmlContent)
    const posts = xmlData.rss.channel.item || []

    payload.logger.info(`📊 Found ${posts.length} items in XML`)

    // Get all existing posts
    const existingPosts = await payload.find({
      collection: 'posts',
      limit: 0,
      depth: 0,
      req: payloadReq,
    })

    payload.logger.info(`📋 Found ${existingPosts.totalDocs} posts in database`)

    // Create a map of slug -> HTML content from XML
    const contentMap = new Map<string, string>()

    posts.forEach((post: any) => {
      if (post['wp:post_type'] === 'post' && post['wp:status'] === 'publish') {
        const slug = post['wp:post_name']
        const content = post['content:encoded'] || post.description || ''
        if (slug && content) {
          contentMap.set(slug, content)
        }
      }
    })

    payload.logger.info(`🔍 Found ${contentMap.size} posts with content in XML`)

    let updated = 0
    let skipped = 0
    let errors = 0
    const errorsList: string[] = []

    // Update each post with properly formatted content
    for (const post of existingPosts.docs) {
      try {
        if (!post.slug) {
          skipped++
          payload.logger.warn(`⚠️ Post has no slug: "${post.title}"`)
          continue
        }

        const htmlContent = contentMap.get(post.slug)

        if (!htmlContent) {
          skipped++
          payload.logger.warn(`⚠️ No content found in XML for slug: "${post.slug}"`)
          continue
        }

        // Convert HTML to Lexical with proper formatting
        let lexicalContent
        try {
          lexicalContent = htmlToLexical(htmlContent)
        } catch (parseError: any) {
          // If HTML parsing fails, use a fallback simple paragraph with the text
          payload.logger.warn(
            `⚠️ Failed to parse HTML for "${post.title}", using fallback: ${parseError.message}`,
          )
          lexicalContent = {
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
                      text: htmlContent.replace(/<[^>]*>/g, '').substring(0, 10000), // Strip HTML and limit length
                      version: 1,
                    },
                  ],
                  direction: 'ltr' as const,
                  format: '' as const,
                  indent: 0,
                  version: 1,
                },
              ],
              direction: 'ltr' as const,
              format: '' as const,
              indent: 0,
              version: 1,
            },
          }
        }

        // Validate that lexicalContent has at least one child
        if (!lexicalContent.root.children || lexicalContent.root.children.length === 0) {
          throw new Error('Generated empty Lexical content')
        }

        // Update the post
        await payload.update({
          collection: 'posts',
          id: post.id,
          data: {
            content: lexicalContent,
          },
          depth: 0,
          context: {
            disableRevalidate: true,
          },
          req: payloadReq,
        })

        updated++
        if (updated % 10 === 0) {
          payload.logger.info(`Updated ${updated} posts...`)
        }
      } catch (error: any) {
        errors++
        // Log more detailed error information
        const errorDetails = error.data?.errors || error.message || error
        const errorMessage = `Failed to update "${post.title}": ${typeof errorDetails === 'object' ? JSON.stringify(errorDetails) : errorDetails}`
        errorsList.push(errorMessage)
        payload.logger.error(`❌ ${errorMessage}`)

        // Also log the generated content structure for debugging
        if (post.slug) {
          payload.logger.error(`Post slug: ${post.slug}`)
        }
      }
    }

    payload.logger.info(
      `✅ Content reformatting completed: ${updated} updated, ${skipped} skipped, ${errors} errors`,
    )

    return Response.json({
      success: true,
      updated,
      skipped,
      errors,
      total: existingPosts.totalDocs,
      errorList: errorsList.slice(0, 10),
    })
  } catch (e: any) {
    payload.logger.error({ err: e, message: 'Error reformatting content' })
    return new Response(`Error reformatting content: ${e.message}`, { status: 500 })
  }
}
