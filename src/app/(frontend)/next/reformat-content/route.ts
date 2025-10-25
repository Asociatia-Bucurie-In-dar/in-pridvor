import { createLocalReq, getPayload } from 'payload'
import config from '@payload-config'
import { headers } from 'next/headers'
import { XMLParser } from 'fast-xml-parser'
import fs from 'fs'
import path from 'path'
import { htmlToLexical } from '@/utilities/htmlToLexical'
import { formatSlug } from '@/fields/slug/formatSlug'

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
    const items = xmlData.rss.channel.item || []

    payload.logger.info(`📊 Found ${items.length} items in XML`)

    // Build lookup maps from XML: by slug, by normalized title, by image filename (thumbnail)
    const contentBySlug = new Map<string, string>()
    const contentByTitle = new Map<string, string>()
    const contentByImageBase = new Map<string, string>()

    // Map attachment ID -> filename base
    const attachmentIdToFilenameBase = new Map<string, string>()

    // First pass: gather attachments
    items.forEach((item: any) => {
      if (item['wp:post_type'] === 'attachment' && item['wp:attachment_url']) {
        const id = item['wp:post_id']
        const url = item['wp:attachment_url'] as string
        const filename = url.split('/').pop() || ''
        const base = filename.split('.').slice(0, -1).join('.') || filename
        if (id) attachmentIdToFilenameBase.set(id, base.toLowerCase())
      }
    })

    // Second pass: gather published posts
    items.forEach((item: any) => {
      if (item['wp:post_type'] === 'post' && item['wp:status'] === 'publish') {
        const title = item.title || ''
        const xmlSlug = formatSlug(item['wp:post_name'] || title)
        const content = item['content:encoded'] || item.description || ''

        if (xmlSlug) contentBySlug.set(xmlSlug, content)
        if (title) contentByTitle.set(formatSlug(title), content)

        // Thumbnail -> filename base mapping
        const postmeta = Array.isArray(item['wp:postmeta'])
          ? item['wp:postmeta']
          : item['wp:postmeta']
            ? [item['wp:postmeta']]
            : []
        const thumb = postmeta.find(
          (m: any) => m['wp:meta_key'] === '_thumbnail_id' && m['wp:meta_value'],
        )
        const thumbId = thumb?.['wp:meta_value']
        if (thumbId && attachmentIdToFilenameBase.has(thumbId)) {
          const base = attachmentIdToFilenameBase.get(thumbId) as string
          contentByImageBase.set(base, content)
        }
      }
    })

    payload.logger.info(
      `🔍 Built content maps: bySlug=${contentBySlug.size}, byTitle=${contentByTitle.size}, byImage=${contentByImageBase.size}`,
    )

    // Get all existing posts
    const existingPosts = await payload.find({
      collection: 'posts',
      limit: 0,
      depth: 0,
      req: payloadReq,
    })

    payload.logger.info(`📋 Found ${existingPosts.totalDocs} posts in database`)

    // Preload media to resolve heroImage filename bases
    const allMedia = await payload.find({
      collection: 'media',
      limit: 0,
      depth: 0,
      req: payloadReq,
    })
    const mediaIdToBase = new Map<string | number, string>()
    allMedia.docs.forEach((m: any) => {
      if (m?.filename) {
        const base = (m.filename as string).split('/').pop()!.split('.').slice(0, -1).join('.')
        mediaIdToBase.set(m.id, base.toLowerCase())
      }
    })

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

        // Lookup content by multiple strategies
        const slugCurrent = typeof post.slug === 'string' ? post.slug : ''
        const normalizedSlug = formatSlug(slugCurrent || (post.title as string) || '')
        const normalizedTitle = formatSlug((post.title as string) || '')

        let htmlContent: string | undefined = undefined
        htmlContent = htmlContent || (slugCurrent ? contentBySlug.get(slugCurrent) : undefined)
        htmlContent = htmlContent || contentBySlug.get(normalizedSlug)
        htmlContent = htmlContent || contentByTitle.get(normalizedTitle)

        // Try via hero image filename base
        if (!htmlContent && (post as any).heroImage) {
          const heroId = (post as any).heroImage
          const base = mediaIdToBase.get(heroId)
          if (base) htmlContent = contentByImageBase.get(base)
        }

        if (!htmlContent) {
          skipped++
          payload.logger.warn(
            `⚠️ No content found in XML for post id=${post.id}, slug="${post.slug}", title="${post.title}"`,
          )
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
