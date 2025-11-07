import { createLocalReq, getPayload } from 'payload'
import config from '@payload-config'
import { headers } from 'next/headers'
import { XMLParser } from 'fast-xml-parser'
import path from 'path'
import { htmlToLexical } from '@/utilities/htmlToLexical'
import { formatSlug } from '@/fields/slug/formatSlug'

export const maxDuration = 300 // This function can run for a maximum of 5 minutes

interface ParsedPost {
  title: string
  slug: string
  content: string
  publishedDate: string
  categories: string[]
  featuredImageUrl?: string
  featuredImageFileName?: string
  wpPostId?: string
  originalPostItem?: any
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
        if (name === 'wp:postmeta' || name === 'category' || name === 'wp:comment') return true
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

    payload.logger.info(`📂 Found ${allCategories.docs.length} categories in database`)

    // Create category maps and track newly created categories
    const categoryMapBySlug = new Map<
      string,
      { id: number | string; title: string; slug: string }
    >()
    const categoryMapByTitle = new Map<
      string,
      { id: number | string; title: string; slug: string }
    >()
    const createdCategoriesInSession = new Map<string, number | string>() // category title -> id

    for (const category of allCategories.docs) {
      const slug = category.slug || formatSlug(category.title || '')
      const categoryId = typeof category.id === 'number' ? category.id : String(category.id)

      categoryMapBySlug.set(slug.toLowerCase().trim(), {
        id: categoryId,
        title: category.title || '',
        slug: slug,
      })

      categoryMapByTitle.set((category.title || '').toLowerCase().trim(), {
        id: categoryId,
        title: category.title || '',
        slug: slug,
      })
    }

    // Helper function to get or create a category
    async function getOrCreateCategory(categoryName: string): Promise<number | string | null> {
      if (!categoryName || typeof categoryName !== 'string') {
        return null
      }

      const categorySlug = formatSlug(categoryName).toLowerCase().trim()

      // First check if we just created it in this session
      if (createdCategoriesInSession.has(categoryName)) {
        return createdCategoriesInSession.get(categoryName)!
      }

      // Try slug match FIRST (since XML often gives us slugs/nice names)
      let matchingCategory = categoryMapBySlug.get(categorySlug)

      // If not found by slug, try exact title match
      if (!matchingCategory) {
        matchingCategory = categoryMapByTitle.get(categoryName.toLowerCase().trim())
      }

      if (matchingCategory) {
        return matchingCategory.id
      }

      // Category doesn't exist - create it
      try {
        payload.logger.info(
          `   ➕ Creating new category: "${categoryName}" (slug: "${categorySlug}")`,
        )
        const newCategory = await payload.create({
          collection: 'categories',
          data: {
            title: categoryName,
          },
          req: payloadReq,
        })

        const newCategoryId =
          typeof newCategory.id === 'number' ? newCategory.id : parseInt(String(newCategory.id), 10)

        if (!isNaN(newCategoryId)) {
          const newCategorySlug = newCategory.slug || formatSlug(categoryName)

          // Add to maps for future matches in this session
          categoryMapBySlug.set(newCategorySlug.toLowerCase().trim(), {
            id: newCategoryId,
            title: categoryName,
            slug: newCategorySlug,
          })
          categoryMapByTitle.set(categoryName.toLowerCase().trim(), {
            id: newCategoryId,
            title: categoryName,
            slug: newCategorySlug,
          })
          createdCategoriesInSession.set(categoryName, newCategoryId)

          payload.logger.info(`   ✅ Created category: "${categoryName}" (ID: ${newCategoryId})`)
          return newCategoryId
        }
      } catch (error: any) {
        payload.logger.error(`   ❌ Failed to create category "${categoryName}": ${error.message}`)
        return null
      }

      return null
    }

    // Get all media for image matching
    const allMedia = await payload.find({
      collection: 'media',
      limit: 0,
      depth: 0,
      req: payloadReq,
    })

    payload.logger.info(`🖼️ Found ${allMedia.totalDocs} existing media items`)

    const parsedPosts: ParsedPost[] = []
    const imageMap = new Map<string, { fileName: string; url: string }>() // postId -> {fileName, url}
    const imageVariants = new Map<string, Array<{ attachmentId: string; fileName: string; url: string; size: number }>>() // baseFileName -> variants[]

    function getBaseFileName(fileName: string): string {
      const parsed = path.parse(fileName.toLowerCase())
      const name = parsed.name
      const sizeMatch = name.match(/^(.+)-(\d+)x(\d+)$/)
      return sizeMatch && sizeMatch[1] ? sizeMatch[1] : name
    }

    function extractImageSize(fileName: string): number {
      const parsed = path.parse(fileName.toLowerCase())
      const name = parsed.name
      const sizeMatch = name.match(/-(\d+)x(\d+)$/)
      if (sizeMatch && sizeMatch[1] && sizeMatch[2]) {
        const width = parseInt(sizeMatch[1], 10)
        const height = parseInt(sizeMatch[2], 10)
        return width * height
      }
      return Infinity
    }

    function getBestVariant(variants: Array<{ attachmentId: string; fileName: string; url: string; size: number }>): { attachmentId: string; fileName: string; url: string } {
      if (variants.length === 0) {
        throw new Error('No variants provided')
      }

      const original = variants.find((v) => {
        const parsed = path.parse(v.fileName.toLowerCase())
        const sizeMatch = parsed.name.match(/-(\d+)x(\d+)$/)
        return !sizeMatch
      })

      if (original) {
        return {
          attachmentId: original.attachmentId,
          fileName: original.fileName,
          url: original.url,
        }
      }

      const largest = variants.reduce((best, current) => {
        return current.size > best.size ? current : best
      })

      return {
        attachmentId: largest.attachmentId,
        fileName: largest.fileName,
        url: largest.url,
      }
    }

    posts.forEach((post: any) => {
      if (post['wp:post_type'] === 'attachment' && post['wp:attachment_url']) {
        const attachmentId = post['wp:post_id']
        const imageUrl = post['wp:attachment_url']
        const fileName = path.basename(imageUrl)
        const baseFileName = getBaseFileName(fileName)
        const size = extractImageSize(fileName)

        const imageData = {
          attachmentId: String(attachmentId),
          fileName,
          url: imageUrl,
          size,
        }

        imageMap.set(String(attachmentId), {
          fileName,
          url: imageUrl,
        })

        if (!imageVariants.has(baseFileName)) {
          imageVariants.set(baseFileName, [])
        }
        imageVariants.get(baseFileName)!.push(imageData)
      }
    })

    for (const [_baseFileName, variants] of imageVariants.entries()) {
      if (variants.length > 1) {
        const best = getBestVariant(variants)
        // Update all variant IDs to point to the best variant's data
        // This ensures that even if _thumbnail_id points to a smaller variant,
        // we'll still get the best quality image
        for (const variant of variants) {
          imageMap.set(variant.attachmentId, {
            fileName: best.fileName,
            url: best.url,
          })
        }
      }
    }

    // Second pass: parse posts
    const parsedSlugs = new Map<string, number>() // Track slugs to handle conflicts

    posts.forEach((post: any) => {
      // Log all post types and statuses for debugging
      const postType = post['wp:post_type']
      const postStatus = post['wp:status']

      // Import published posts, but also log what we're skipping
      if (postType === 'post') {
        if (postStatus !== 'publish') {
          const title = post.title || 'Untitled'
          payload.logger.info(`⏭️  Skipping post "${title}" with status: ${postStatus}`)
          return
        }
      } else {
        return // Skip non-post items
      }

      // Now process the post
      const title = post.title || 'Untitled'
      // Always normalize slug using our formatter so Romanian characters are handled correctly
      let rawSlug = post['wp:post_name'] || title

      // Decode URL-encoded slugs (e.g., %e2%88%92 becomes the actual character)
      try {
        rawSlug = decodeURIComponent(rawSlug)
      } catch {
        // If decoding fails, use the raw slug as-is
        payload.logger.warn(
          `   ⚠️  Failed to decode slug "${rawSlug}" for post "${title}", using as-is`,
        )
      }

      let slug = formatSlug(rawSlug)

      // Handle slug conflicts by appending WordPress ID or a number
      if (existingSlugs.has(slug) || parsedSlugs.has(slug)) {
        const wpPostId = post['wp:post_id']
        if (wpPostId) {
          slug = `${slug}-${wpPostId}`
        } else {
          let counter = 1
          let newSlug = `${slug}-${counter}`
          while (existingSlugs.has(newSlug) || parsedSlugs.has(newSlug)) {
            counter++
            newSlug = `${slug}-${counter}`
          }
          slug = newSlug
        }

        if (existingSlugs.has(slug)) {
          let counter = 1
          let newSlug = `${slug}-${counter}`
          while (existingSlugs.has(newSlug) || parsedSlugs.has(newSlug)) {
            counter++
            newSlug = `${slug}-${counter}`
          }
          slug = newSlug
        }

        payload.logger.info(`   🔄 Resolved slug conflict for "${title}": using slug "${slug}"`)
      }

      parsedSlugs.set(slug, 1)

      let content = post['content:encoded'] || post.description || ''

      // Ensure content is not empty (required field)
      if (!content || content.trim().length === 0) {
        payload.logger.warn(`⚠️  Post "${title}" has empty content, using placeholder`)
        content = '<p>No content available.</p>'
      }

      const publishedDate = post.pubDate || new Date().toISOString()

      // Extract categories from XML
      // XML structure: { text: "Category Title", domain: "category", nicename: "category-slug" }
      const categories = Array.isArray(post.category)
        ? post.category
            .filter((cat: any) => {
              const domain = cat?.['@_domain'] || cat?.domain
              return domain === 'category'
            })
            .map((cat: any) => {
              // Prefer text (title) over nicename (slug) for matching
              return cat?.text || cat?.['#text'] || cat?.['@_nicename'] || cat?.nicename || cat
            })
            .filter((cat: any) => cat && typeof cat === 'string')
        : post.category && !Array.isArray(post.category)
          ? (() => {
              const cat = post.category
              const domain = cat?.['@_domain'] || cat?.domain
              if (domain === 'category') {
                const catName =
                  cat?.text || cat?.['#text'] || cat?.['@_nicename'] || cat?.nicename || cat
                return catName && typeof catName === 'string' ? [catName] : []
              }
              return []
            })()
          : []

      // Find featured image (best quality variant - already normalized in imageMap)
      let featuredImageFileName: string | undefined
      let featuredImageUrl: string | undefined
      if (post['wp:postmeta']) {
        const postmeta = Array.isArray(post['wp:postmeta'])
          ? post['wp:postmeta']
          : [post['wp:postmeta']]

        for (const meta of postmeta) {
          if (meta['wp:meta_key'] === '_thumbnail_id' && meta['wp:meta_value']) {
            const thumbnailId = String(meta['wp:meta_value'])
            const imageData = imageMap.get(thumbnailId)
            
            if (imageData) {
              // imageMap already points to the best variant for this base filename
              featuredImageFileName = imageData.fileName
              featuredImageUrl = imageData.url
            }
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
        featuredImageUrl,
        wpPostId: post['wp:post_id'],
        originalPostItem: post,
      })
    })

    const totalPostsInXml = posts.filter(
      (p: any) => p['wp:post_type'] === 'post' && p['wp:status'] === 'publish',
    ).length

    payload.logger.info(`📊 Import Statistics:`)
    payload.logger.info(`   Total items in XML: ${posts.length}`)
    payload.logger.info(`   Published posts in XML: ${totalPostsInXml}`)
    payload.logger.info(`   Parsed posts ready to import: ${parsedPosts.length}`)

    if (parsedPosts.length < totalPostsInXml) {
      payload.logger.warn(
        `⚠️  ${totalPostsInXml - parsedPosts.length} posts from XML were not parsed (might be duplicates by slug or missing required fields)`,
      )
    }

    payload.logger.info(`🆕 Starting import of ${parsedPosts.length} posts...`)

    let imported = 0
    let errors = 0
    const errorsList: string[] = []
    const postsWithUnmatchedCategories = new Map<string, string[]>() // post title -> array of unmatched category names

    // Import new posts
    for (const post of parsedPosts) {
      try {
        // Check if post already exists by slug
        const existingPost = await payload.find({
          collection: 'posts',
          where: { slug: { equals: post.slug } },
          limit: 1,
          depth: 0,
          req: payloadReq,
        })

        if (existingPost.docs.length > 0) {
          payload.logger.info(`⏭️  Skipping existing post: "${post.title}" (slug: "${post.slug}")`)
          continue
        }

        // Debug: Log categories from XML
        if (post.categories.length > 0) {
          payload.logger.info(
            `📝 Post "${post.title}" has ${post.categories.length} categories: ${post.categories.join(', ')}`,
          )
        }

        // Match categories using fuzzy slug matching (with auto-creation)
        const categoryIds: number[] = []
        const unmatchedCategories: string[] = []

        for (const catName of post.categories) {
          if (!catName || typeof catName !== 'string') {
            payload.logger.warn(`⚠️  Invalid category name for "${post.title}": ${catName}`)
            continue
          }

          // Get or create category
          const categoryId = await getOrCreateCategory(catName)

          if (categoryId) {
            const catId =
              typeof categoryId === 'number' ? categoryId : parseInt(String(categoryId), 10)
            if (!isNaN(catId)) {
              categoryIds.push(catId)
              // Find category for logging
              const matchedCat =
                categoryMapByTitle.get(catName.toLowerCase().trim()) ||
                Array.from(categoryMapByTitle.values()).find((c) => c.id === catId)
              payload.logger.info(
                `   ✅ Matched/created category "${catName}" -> "${
                  matchedCat?.title || catName
                }" (ID: ${catId})`,
              )
            }
          } else {
            unmatchedCategories.push(catName)
            payload.logger.warn(`   ⚠️  Failed to get/create category: "${catName}"`)
          }
        }

        // Track posts with unmatched categories (only if we truly failed)
        if (unmatchedCategories.length > 0) {
          postsWithUnmatchedCategories.set(post.title, unmatchedCategories)
        }

        // Debug: Log final category assignment
        if (categoryIds.length > 0) {
          payload.logger.info(
            `   ✅ Assigning ${categoryIds.length} categories to "${post.title}": ${categoryIds.join(', ')}`,
          )
        } else if (post.categories.length > 0) {
          payload.logger.warn(
            `   ⚠️  No categories assigned to "${post.title}" (had ${post.categories.length} in XML)`,
          )
        }

        // Match or upload featured image to R2 (reuse existing if found)
        let heroImageId: number | undefined
        if (post.featuredImageFileName || post.featuredImageUrl) {
          const baseFileName = post.featuredImageFileName
            ? path.parse(post.featuredImageFileName).name.toLowerCase()
            : null
          const fileName = post.featuredImageFileName || path.basename(post.featuredImageUrl || '')

          // First, try exact filename match
          let matchingMedia = fileName
            ? allMedia.docs.find((media) => {
                if (!media.filename) return false
                return media.filename.toLowerCase() === fileName.toLowerCase()
              })
            : null

          // If not found, try base filename match (in case R2 changed extension, e.g., .jpg to .webp)
          if (!matchingMedia && baseFileName) {
            matchingMedia = allMedia.docs.find((media) => {
              if (!media.filename) return false
              const mediaBaseName = path.parse(media.filename).name.toLowerCase()
              return mediaBaseName === baseFileName
            })
          }

          if (matchingMedia) {
            const mediaId =
              typeof matchingMedia.id === 'number'
                ? matchingMedia.id
                : parseInt(String(matchingMedia.id), 10)
            if (!isNaN(mediaId)) {
              heroImageId = mediaId
              payload.logger.info(
                `   ♻️  Reusing existing image for "${post.title}": ${matchingMedia.filename} (ID: ${mediaId})`,
              )
            }
          } else if (post.featuredImageUrl) {
            // Image not found in bucket, download and upload to R2
            try {
              payload.logger.info(
                `   📥 Downloading and uploading image for "${post.title}" from ${post.featuredImageUrl}`,
              )

              const imageResponse = await fetch(post.featuredImageUrl)
              if (!imageResponse.ok) {
                payload.logger.warn(`   ⚠️  Failed to download image: ${imageResponse.statusText}`)
              } else {
                const imageBuffer = await imageResponse.arrayBuffer()
                const mimeType = imageResponse.headers.get('content-type') || 'image/jpeg'
                const uploadFileName =
                  post.featuredImageFileName || path.basename(post.featuredImageUrl)

                // Upload to Payload (which will automatically upload to R2)
                const uploadedMedia = await payload.create({
                  collection: 'media',
                  data: {
                    alt: post.title,
                  },
                  file: {
                    data: Buffer.from(imageBuffer),
                    mimetype: mimeType,
                    name: uploadFileName,
                    size: imageBuffer.byteLength,
                  },
                  req: payloadReq,
                })

                const uploadedId =
                  typeof uploadedMedia.id === 'number'
                    ? uploadedMedia.id
                    : parseInt(String(uploadedMedia.id), 10)

                if (!isNaN(uploadedId)) {
                  heroImageId = uploadedId
                  // Add to cache for future matches in this import session
                  allMedia.docs.push(uploadedMedia as any)
                  payload.logger.info(
                    `   ✅ Uploaded new image to R2 for "${post.title}": ${uploadFileName} (ID: ${uploadedId})`,
                  )
                }
              }
            } catch (imageError: any) {
              payload.logger.error(
                `   ❌ Failed to upload image for "${post.title}": ${imageError.message}`,
              )
            }
          }
        }

        // Extract images from content and upload to R2
        const imageMediaMap = new Map<string, number>()
        const imgRegex = /<img[^>]+src=["']([^"']+)["'][^>]*>/gi
        const imageUrls = new Set<string>()
        let imgMatch: RegExpExecArray | null
        while ((imgMatch = imgRegex.exec(post.content)) !== null) {
          const imageUrl = imgMatch[1]
          if (imageUrl && !imageUrl.startsWith('data:')) {
            imageUrls.add(imageUrl)
          }
        }

        // Upload images to R2 and build media map
        for (const imageUrl of imageUrls) {
          try {
            const [rawFileName] = imageUrl.split('?')
            const fileName = path.basename(rawFileName ?? imageUrl)
            
            // Check if media already exists
            const matchingMedia = allMedia.docs.find((media) => {
              if (!media.filename) return false
              const mediaBaseName = path.parse(media.filename).name.toLowerCase()
              const urlBaseName = path.parse(fileName).name.toLowerCase()
              return mediaBaseName === urlBaseName || media.filename.toLowerCase() === fileName.toLowerCase()
            })

            if (matchingMedia) {
              const mediaId = typeof matchingMedia.id === 'number' ? matchingMedia.id : parseInt(String(matchingMedia.id), 10)
              if (!isNaN(mediaId)) {
                imageMediaMap.set(imageUrl, mediaId)
                payload.logger.info(`   ♻️  Reusing existing image: ${matchingMedia.filename} (ID: ${mediaId})`)
              }
            } else {
              // Download and upload image
              payload.logger.info(`   📥 Downloading image from ${imageUrl}`)
              const imageResponse = await fetch(imageUrl)
              if (imageResponse.ok) {
                const imageBuffer = await imageResponse.arrayBuffer()
                const mimeType = imageResponse.headers.get('content-type') || 'image/jpeg'

                const uploadedMedia = await payload.create({
                  collection: 'media',
                  data: {
                    alt: post.title,
                  },
                  file: {
                    data: Buffer.from(imageBuffer),
                    mimetype: mimeType,
                    name: fileName,
                    size: imageBuffer.byteLength,
                  },
                  req: payloadReq,
                })

                const uploadedId = typeof uploadedMedia.id === 'number' ? uploadedMedia.id : parseInt(String(uploadedMedia.id), 10)
                if (!isNaN(uploadedId)) {
                  imageMediaMap.set(imageUrl, uploadedId)
                  allMedia.docs.push(uploadedMedia as any)
                  payload.logger.info(`   ✅ Uploaded image to R2: ${fileName} (ID: ${uploadedId})`)
                }
              }
            }
          } catch (imageError: any) {
            payload.logger.warn(`   ⚠️  Failed to process image ${imageUrl}: ${imageError.message}`)
          }
        }

        // Convert HTML content to Lexical with proper formatting and image map
        let lexicalContent
        try {
          lexicalContent = htmlToLexical(post.content, imageMediaMap)

          // Validate that we have a valid root structure
          if (
            !lexicalContent ||
            !lexicalContent.root ||
            !Array.isArray(lexicalContent.root.children)
          ) {
            payload.logger.warn(`⚠️  Invalid Lexical structure for "${post.title}", using fallback`)
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
                        text: post.content || 'No content available.',
                        version: 1,
                      },
                    ],
                    direction: 'ltr',
                    format: '',
                    indent: 0,
                    textFormat: 0,
                    version: 1,
                  },
                ],
                direction: 'ltr',
                format: '',
                indent: 0,
                version: 1,
              },
            }
          }

          // Ensure we have at least one child
          if (!lexicalContent.root.children || lexicalContent.root.children.length === 0) {
            lexicalContent.root.children = [
              {
                type: 'paragraph',
                children: [
                  {
                    type: 'text',
                    detail: 0,
                    format: 0,
                    mode: 'normal',
                    style: '',
                    text: ' ',
                    version: 1,
                  },
                ],
                direction: 'ltr',
                format: '',
                indent: 0,
                textFormat: 0,
                version: 1,
              },
            ]
          }
        } catch (lexicalError: any) {
          payload.logger.error(
            `❌ Failed to convert content to Lexical for "${post.title}": ${lexicalError.message}`,
          )
          // Fallback to simple paragraph
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
                      text: post.content || 'No content available.',
                      version: 1,
                    },
                  ],
                  direction: 'ltr',
                  format: '',
                  indent: 0,
                  textFormat: 0,
                  version: 1,
                },
              ],
              direction: 'ltr',
              format: '',
              indent: 0,
              version: 1,
            },
          }
        }

        const postPayload: any = {
          title: post.title,
          slug: post.slug,
          content: lexicalContent,
          publishedAt: post.publishedDate,
          _status: 'published' as const,
          authors: [ancaUser.id],
        }

        // Only set categories if we have any
        if (categoryIds.length > 0) {
          postPayload.categories = categoryIds
        }

        if (heroImageId) {
          postPayload.heroImage = heroImageId
        }

        const createdPost = await payload.create({
          collection: 'posts',
          depth: 0,
          context: {
            disableRevalidate: true,
          },
          data: postPayload,
          req: payloadReq,
        })

        // Import comments for this post
        if (post.originalPostItem) {
          const comments = post.originalPostItem['wp:comment'] || []
          const postComments = (Array.isArray(comments) ? comments : comments ? [comments] : [])
            .filter((comment: any) => {
              const commentType = comment['wp:comment_type']
              const approved = comment['wp:comment_approved']
              return commentType === 'comment' && (approved === '1' || approved === 1)
            })

          if (postComments.length > 0) {
            payload.logger.info(`   💬 Found ${postComments.length} comments for "${post.title}"`)
            const commentMap = new Map<string, any>()
            
            // First pass: create all comments and build map
            for (const comment of postComments) {
              try {
                const commentId = String(comment['wp:comment_id'] || comment['wp:comment_id'])
                const parentId = String(comment['wp:comment_parent'] || '0')
                const commentAuthor = comment['wp:comment_author'] || 'Anonymous'
                const commentContent = comment['wp:comment_content'] || ''
                const commentEmail = comment['wp:comment_author_email'] || ''
                
                if (!commentContent || commentContent.trim().length === 0) {
                  payload.logger.warn(`   ⚠️  Skipping empty comment from ${commentAuthor}`)
                  continue
                }

                const commentData: any = {
                  name: commentAuthor,
                  email: commentEmail,
                  comment: commentContent,
                  post: createdPost.id,
                  status: 'approved',
                }

                const createdComment = await payload.create({
                  collection: 'comments',
                  data: commentData,
                  req: payloadReq,
                })

                commentMap.set(commentId, createdComment.id)
                payload.logger.info(`   ✅ Imported comment from ${commentAuthor} (ID: ${commentId})`)
              } catch (commentError: any) {
                payload.logger.error(`   ❌ Failed to import comment: ${commentError.message}`)
                if (commentError.stack) {
                  payload.logger.error(`   Stack: ${commentError.stack}`)
                }
              }
            }

            // Second pass: update parent relationships
            for (const comment of postComments) {
              try {
                const commentId = String(comment['wp:comment_id'])
                const parentId = String(comment['wp:comment_parent'] || '0')
                const currentCommentId = commentMap.get(commentId)
                const parentCommentId = commentMap.get(parentId)

                if (currentCommentId && parentCommentId && parentId !== '0') {
                  await payload.update({
                    collection: 'comments',
                    id: currentCommentId,
                    data: {
                      parent: parentCommentId,
                    },
                    req: payloadReq,
                  })
                }
              } catch (commentError: any) {
                payload.logger.warn(`   ⚠️  Failed to set comment parent: ${commentError.message}`)
              }
            }

            if (commentMap.size > 0) {
              payload.logger.info(`   💬 Imported ${commentMap.size} comments for "${post.title}"`)
            }
          }
        }

        imported++
        if (imported % 10 === 0) {
          payload.logger.info(`Imported ${imported} new posts...`)
        }
      } catch (error: any) {
        errors++
        const errorMessage = `Failed to import "${post.title}" (slug: ${post.slug}): ${error.message || error}`
        errorsList.push(errorMessage)
        payload.logger.error(errorMessage)

        // Log more details for debugging
        if (error.stack) {
          payload.logger.error(`   Stack: ${error.stack}`)
        }
      }
    }

    // Prepare report of posts with unmatched categories
    const unmatchedCategoriesReport: string[] = []
    if (postsWithUnmatchedCategories.size > 0) {
      unmatchedCategoriesReport.push(`Posts with categories not found in database:`)
      for (const [postTitle, unmatchedCats] of postsWithUnmatchedCategories) {
        unmatchedCategoriesReport.push(
          `  - "${postTitle}": ${unmatchedCats.map((c) => `"${c}"`).join(', ')}`,
        )
      }
    }

    payload.logger.info(
      `✅ Incremental import completed: ${imported} new posts imported, ${errors} errors`,
    )
    if (postsWithUnmatchedCategories.size > 0) {
      payload.logger.info(
        `⚠️  ${postsWithUnmatchedCategories.size} posts had ${Array.from(postsWithUnmatchedCategories.values()).flat().length} unmatched categories`,
      )
      unmatchedCategoriesReport.forEach((line) => payload.logger.info(line))
    }

    const skippedCount = totalPostsInXml - imported - errors

    return Response.json({
      success: true,
      imported,
      skipped: skippedCount,
      errors,
      totalInXml: totalPostsInXml,
      parsedPosts: parsedPosts.length,
      errorList: errorsList.slice(0, 10),
      unmatchedCategoriesReport:
        unmatchedCategoriesReport.length > 0 ? unmatchedCategoriesReport : undefined,
      postsWithUnmatchedCategories: postsWithUnmatchedCategories.size,
    })
  } catch (e: any) {
    payload.logger.error({ err: e, message: 'Error during incremental import' })
    return new Response(`Error during incremental import: ${e.message}`, { status: 500 })
  }
}
