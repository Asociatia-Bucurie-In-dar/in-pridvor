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

    payload.logger.info(`📂 Found ${allCategories.docs.length} categories in database`)

    // Create category maps and track newly created categories
    const categoryMapBySlug = new Map<string, { id: number | string; title: string; slug: string }>()
    const categoryMapByTitle = new Map<string, { id: number | string; title: string; slug: string }>()
    const createdCategoriesInSession = new Map<string, number | string>() // category title -> id

    for (const category of allCategories.docs) {
      const slug = category.slug || formatSlug(category.title || '')
      const categoryId = typeof category.id === 'number' ? category.id : category.id.toString()

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
    async function getOrCreateCategory(
      categoryName: string,
    ): Promise<number | string | null> {
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
        payload.logger.info(`   ➕ Creating new category: "${categoryName}" (slug: "${categorySlug}")`)
        const newCategory = await payload.create({
          collection: 'categories',
          data: {
            title: categoryName,
          },
          req: payloadReq,
        })

        const newCategoryId =
          typeof newCategory.id === 'number'
            ? newCategory.id
            : parseInt(String(newCategory.id), 10)

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

    // First pass: collect attachment URLs
    posts.forEach((post: any) => {
      if (post['wp:post_type'] === 'attachment' && post['wp:attachment_url']) {
        const attachmentId = post['wp:post_id']
        const imageUrl = post['wp:attachment_url']
        imageMap.set(attachmentId, {
          fileName: path.basename(imageUrl),
          url: imageUrl,
        })
      }
    })

    // Second pass: parse posts
    posts.forEach((post: any) => {
      if (post['wp:post_type'] === 'post' && post['wp:status'] === 'publish') {
        const title = post.title || 'Untitled'
        // Always normalize slug using our formatter so Romanian characters are handled correctly
        const rawSlug = post['wp:post_name'] || title
        const slug = formatSlug(rawSlug)

        // Skip if post already exists
        if (existingSlugs.has(slug)) {
          return
        }

        const content = post['content:encoded'] || post.description || ''
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

        // Find featured image
        let featuredImageFileName: string | undefined
        let featuredImageUrl: string | undefined
        if (post['wp:postmeta']) {
          const postmeta = Array.isArray(post['wp:postmeta'])
            ? post['wp:postmeta']
            : [post['wp:postmeta']]

          for (const meta of postmeta) {
            if (meta['wp:meta_key'] === '_thumbnail_id' && meta['wp:meta_value']) {
              const thumbnailId = meta['wp:meta_value']
              const imageData = imageMap.get(thumbnailId)
              if (imageData) {
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
        })
      }
    })

    payload.logger.info(`🆕 Found ${parsedPosts.length} new posts to import`)

    let imported = 0
    let errors = 0
    const errorsList: string[] = []
    const postsWithUnmatchedCategories = new Map<string, string[]>() // post title -> array of unmatched category names

    // Import new posts
    for (const post of parsedPosts) {
      try {
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

        // Convert HTML content to Lexical with proper formatting
        const lexicalContent = htmlToLexical(post.content)

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

    return Response.json({
      success: true,
      imported,
      skipped: existingSlugs.size,
      errors,
      totalInXml: posts.filter(
        (p: any) => p['wp:post_type'] === 'post' && p['wp:status'] === 'publish',
      ).length,
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
