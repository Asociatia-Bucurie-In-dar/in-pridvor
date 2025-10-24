import { createLocalReq, getPayload } from 'payload'
import config from '@payload-config'
import { headers } from 'next/headers'
import { XMLParser } from 'fast-xml-parser'
import path from 'path'
import { htmlToLexical } from '@/utilities/htmlToLexical'

export const maxDuration = 300 // This function can run for a maximum of 5 minutes

interface ParsedPost {
  title: string
  slug: string
  content: string
  publishedDate: string
  categories: string[]
  featuredImageUrl?: string
  featuredImageFileName?: string
}

export async function POST(request: Request): Promise<Response> {
  const payload = await getPayload({ config })
  const requestHeaders = await headers()

  // Authenticate by passing request headers
  const { user } = await payload.auth({ headers: requestHeaders })

  if (!user) {
    return new Response('Action forbidden.', { status: 403 })
  }

  try {
    const formData = await request.formData()
    const file = formData.get('file') as File

    if (!file) {
      return new Response('No file provided.', { status: 400 })
    }

    const xmlContent = await file.text()

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

    // Create a Payload request object
    const payloadReq = await createLocalReq({ user }, payload)

    // Get existing post slugs to avoid duplicates
    const existingPosts = await payload.find({
      collection: 'posts',
      limit: 0,
      select: {
        slug: true,
      },
      req: payloadReq,
    })

    const existingSlugs = new Set(existingPosts.docs.map((post) => post.slug))
    payload.logger.info(`📋 Found ${existingSlugs.size} existing posts in database`)

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

    // Get all categories
    const allCategories = await payload.find({
      collection: 'categories',
      limit: 0,
      req: payloadReq,
    })

    // Get all media for image matching
    const allMedia = await payload.find({
      collection: 'media',
      limit: 0,
      depth: 0,
      req: payloadReq,
    })

    payload.logger.info(`🖼️ Found ${allMedia.totalDocs} existing media items`)

    const parsedPosts: ParsedPost[] = []
    const imageMap = new Map<string, string>() // postId -> imageFileName

    // First pass: collect attachment URLs
    posts.forEach((post: any) => {
      if (post['wp:post_type'] === 'attachment' && post['wp:attachment_url']) {
        const attachmentId = post['wp:post_id']
        const imageUrl = post['wp:attachment_url']
        imageMap.set(attachmentId, path.basename(imageUrl))
      }
    })

    // Second pass: parse posts
    posts.forEach((post: any) => {
      if (post['wp:post_type'] === 'post' && post['wp:status'] === 'publish') {
        const title = post.title || 'Untitled'
        const slug = post['wp:post_name'] || title.toLowerCase().replace(/[^a-z0-9]+/g, '-')

        // Skip if post already exists
        if (existingSlugs.has(slug)) {
          return
        }

        const content = post['content:encoded'] || post.description || ''
        const publishedDate = post.pubDate || new Date().toISOString()
        const categories = Array.isArray(post.category)
          ? post.category
              .filter((cat: any) => cat?.['@_domain'] === 'category')
              .map((cat: any) => cat?.['@_nicename'] || cat?.['#text'] || cat)
          : []

        // Find featured image
        let featuredImageFileName: string | undefined
        if (post['wp:postmeta']) {
          const postmeta = Array.isArray(post['wp:postmeta'])
            ? post['wp:postmeta']
            : [post['wp:postmeta']]

          for (const meta of postmeta) {
            if (meta['wp:meta_key'] === '_thumbnail_id' && meta['wp:meta_value']) {
              const thumbnailId = meta['wp:meta_value']
              featuredImageFileName = imageMap.get(thumbnailId)
              break
            }
          }
        }

        parsedPosts.push({
          title,
          slug,
          content,
          publishedDate,
          categories,
          featuredImageFileName,
        })
      }
    })

    payload.logger.info(`🆕 Found ${parsedPosts.length} new posts to import`)

    let imported = 0
    let errors = 0
    const errorsList: string[] = []

    // Import new posts
    for (const post of parsedPosts) {
      try {
        // Match categories
        const categoryIds: number[] = []
        for (const catName of post.categories) {
          const matchingCategory = allCategories.docs.find(
            (cat) =>
              cat.title?.toLowerCase() === catName.toLowerCase() ||
              cat.slug === catName.toLowerCase().replace(/\s+/g, '-'),
          )
          if (matchingCategory && typeof matchingCategory.id === 'number') {
            categoryIds.push(matchingCategory.id)
          }
        }

        // Match image to existing media
        let heroImageId: number | undefined
        if (post.featuredImageFileName) {
          const baseFileName = path.parse(post.featuredImageFileName).name.toLowerCase()
          const matchingMedia = allMedia.docs.find((media) => {
            if (!media.filename) return false
            const mediaBaseName = path.parse(media.filename).name.toLowerCase()
            return mediaBaseName === baseFileName
          })
          if (matchingMedia && typeof matchingMedia.id === 'number') {
            heroImageId = matchingMedia.id
          }
        }

        // Convert HTML content to Lexical with proper formatting
        const lexicalContent = htmlToLexical(post.content)

        const postPayload: any = {
          title: post.title,
          slug: post.slug,
          content: lexicalContent,
          publishedAt: post.publishedDate,
          _status: 'published' as const,
          authors: [ancaUser.id],
          categories: categoryIds,
        }

        if (heroImageId) {
          postPayload.heroImage = heroImageId
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
        if (imported % 10 === 0) {
          payload.logger.info(`Imported ${imported} new posts...`)
        }
      } catch (error: any) {
        errors++
        const errorMessage = `Failed to import "${post.title}": ${error.message || error}`
        errorsList.push(errorMessage)
        payload.logger.error(errorMessage)
      }
    }

    payload.logger.info(
      `✅ Incremental import completed: ${imported} new posts imported, ${errors} errors`,
    )

    return Response.json({
      success: true,
      imported,
      skipped: existingSlugs.size,
      errors,
      totalInXml: posts.filter(
        (p: any) => p['wp:post_type'] === 'post' && p['wp:status'] === 'publish',
      ).length,
      errorList: errorsList.slice(0, 10),
    })
  } catch (e: any) {
    payload.logger.error({ err: e, message: 'Error during incremental import' })
    return new Response(`Error during incremental import: ${e.message}`, { status: 500 })
  }
}
