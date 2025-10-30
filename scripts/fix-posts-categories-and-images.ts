import { createRequire } from 'module'
const require = createRequire(import.meta.url)

require('dotenv').config()

if (!process.env.PAYLOAD_SECRET) {
  console.error('❌ PAYLOAD_SECRET is not set in environment variables')
  console.error(
    'Available env vars:',
    Object.keys(process.env)
      .filter((k) => k.includes('SECRET') || k.includes('PAYLOAD'))
      .join(', ') || 'none found',
  )
  process.exit(1)
}

import { getPayload } from 'payload'
import * as fs from 'fs'
import * as path from 'path'
import { fileURLToPath } from 'url'
import { formatSlug } from '../src/fields/slug/formatSlug'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

interface PostImageData {
  postId: number
  postTitle: string
  featuredImageUrl: string
  imageFileName: string
}

interface WordPressPost {
  title: string
  slug: string
  categories: string[]
}

async function downloadAndUploadImage(imageUrl: string, payload: any): Promise<string | null> {
  try {
    const existingMedia = await payload.find({
      collection: 'media',
      where: {
        or: [
          {
            url: {
              equals: imageUrl,
            },
          },
          {
            filename: {
              equals: path.basename(new URL(imageUrl).pathname),
            },
          },
        ],
      },
      limit: 1,
      depth: 0,
    })

    if (existingMedia.docs.length > 0) {
      return existingMedia.docs[0].id.toString()
    }

    const response = await fetch(imageUrl)
    if (!response.ok) {
      return null
    }

    const buffer = await response.arrayBuffer()
    const filename = path.basename(new URL(imageUrl).pathname)
    const contentType = response.headers.get('content-type') || 'image/jpeg'

    const media = await payload.create({
      collection: 'media',
      data: {
        alt: filename.replace(/\.[^/.]+$/, ''),
      },
      file: {
        data: Buffer.from(buffer),
        mimetype: contentType,
        name: filename,
        size: buffer.byteLength,
      },
    })

    return media.id.toString()
  } catch (error) {
    return null
  }
}

function extractPostsFromXML(xmlPath: string): WordPressPost[] {
  const xmlContent = fs.readFileSync(xmlPath, 'utf-8')
  const posts: WordPressPost[] = []

  const postMatches = xmlContent.match(/<item>[\s\S]*?<\/item>/g) || []

  for (const postMatch of postMatches) {
    const postTypeMatch = postMatch.match(/<wp:post_type><!\[CDATA\[(.*?)\]\]><\/wp:post_type>/)
    if (!postTypeMatch || postTypeMatch[1] !== 'post') {
      continue
    }

    const titleMatch = postMatch.match(/<title><!\[CDATA\[(.*?)\]\]><\/title>/)
    if (!titleMatch) continue

    const linkMatch = postMatch.match(/<link>(.*?)<\/link>/)
    if (!linkMatch) continue

    const categoryMatches =
      postMatch.match(
        /<category domain="category" nicename="([^"]*)"[^>]*><!\[CDATA\[([^\]]*)\]\]><\/category>/g,
      ) || []
    const categories = categoryMatches
      .map((match) => {
        const catMatch = match.match(
          /<category domain="category" nicename="([^"]*)"[^>]*><!\[CDATA\[([^\]]*)\]\]><\/category>/,
        )
        return catMatch ? catMatch[2] : ''
      })
      .filter((cat) => cat)

    const slug = linkMatch[1].replace('https://inpridvor.ro/', '').replace('/', '')

    posts.push({
      title: titleMatch[1],
      slug,
      categories,
    })
  }

  return posts
}

async function fixPostsCategoriesAndImages() {
  console.log('🔧 Starting fix for posts categories and images...\n')

  const xmlPath = path.join(__dirname, '../inpridvor.WordPress.2025-10-24.xml')
  const imagesDataPath = path.join(__dirname, '../import-data/post-images.json')

  if (!fs.existsSync(xmlPath)) {
    console.error('❌ WordPress XML file not found:', xmlPath)
    return
  }

  if (!fs.existsSync(imagesDataPath)) {
    console.error('❌ Images data file not found:', imagesDataPath)
    return
  }

  console.log('📖 Reading WordPress XML file...')
  const xmlPosts = extractPostsFromXML(xmlPath)
  console.log(`📊 Found ${xmlPosts.length} posts in XML\n`)

  const imagesData: PostImageData[] = JSON.parse(fs.readFileSync(imagesDataPath, 'utf-8'))
  console.log(`🖼️  Found ${imagesData.length} images in import data\n`)

  const config = await import('../src/payload.config')
  const payload = await getPayload({ config: config.default })

  console.log('🔍 Fetching existing categories...')
  const categories = await payload.find({
    collection: 'categories',
    limit: 1000,
    depth: 0,
  })

  console.log(`📂 Found ${categories.docs.length} categories in database`)

  const categoryMapBySlug = new Map<string, { id: number; slug: string; title: string }>()
  for (const category of categories.docs) {
    const slug = category.slug || formatSlug(category.title)
    categoryMapBySlug.set(slug.toLowerCase().trim(), {
      id: typeof category.id === 'number' ? category.id : parseInt(category.id.toString(), 10),
      slug: slug,
      title: category.title,
    })
  }

  console.log(`📋 Category slug map created with ${categoryMapBySlug.size} categories`)

  console.log('\n🔍 Fetching existing posts...')
  const existingPosts = await payload.find({
    collection: 'posts',
    limit: 10000,
    depth: 0,
  })

  console.log(`📝 Found ${existingPosts.docs.length} posts in database`)

  // Count posts with no categories BEFORE processing
  const postsWithNoCategories = existingPosts.docs.filter((post) => {
    const cats = post.categories || []
    if (!Array.isArray(cats) || cats.length === 0) return true
    const validCats = cats.filter((cat: any) => {
      if (typeof cat === 'object' && cat && cat.id) return true
      if (typeof cat === 'number') return true
      return false
    })
    return validCats.length === 0
  })

  console.log(`📊 Found ${postsWithNoCategories.length} posts with NO categories:`)
  postsWithNoCategories.forEach((post) => {
    console.log(`   - "${post.title}" (slug: ${post.slug}, created: ${post.createdAt || 'unknown'})`)
  })
  console.log('')

  const xmlPostMapByTitle = new Map<string, WordPressPost>()
  const xmlPostMapBySlug = new Map<string, WordPressPost>()
  for (const xmlPost of xmlPosts) {
    xmlPostMapByTitle.set(xmlPost.title.toLowerCase().trim(), xmlPost)
    xmlPostMapBySlug.set(xmlPost.slug.toLowerCase().trim(), xmlPost)
  }

  const imageMapByTitle = new Map<string, PostImageData>()
  for (const img of imagesData) {
    imageMapByTitle.set(img.postTitle.toLowerCase().trim(), img)
  }

  const imageCache = new Map<string, string>()

  let categoriesFixed = 0
  let imagesFixed = 0
  let errors = 0
  let postsWithNoCategoriesProcessed = 0
  let postsWithCategoriesNeedingUpdate = 0

  console.log('🔧 Fixing posts...\n')

  let postsWithNoMatch = 0
  let postsMatched = 0

  for (const existingPost of existingPosts.docs) {
    try {
      const postTitle = existingPost.title?.toLowerCase().trim() || ''
      const postSlug = existingPost.slug?.toLowerCase().trim() || ''

      let xmlPost = xmlPostMapByTitle.get(postTitle)
      if (!xmlPost && postSlug) {
        xmlPost = xmlPostMapBySlug.get(postSlug)
      }

      if (!xmlPost) {
        postsWithNoMatch++
        
        // Check if post has no categories
        const currentCategoryIds = (existingPost.categories || [])
          .map((cat: any) => {
            if (typeof cat === 'object' && cat && cat.id) {
              return typeof cat.id === 'number' ? cat.id : parseInt(String(cat.id), 10)
            }
            return typeof cat === 'number' ? cat : parseInt(String(cat), 10)
          })
          .filter((id) => !isNaN(id))
        
        if (currentCategoryIds.length === 0) {
          postsWithNoCategoriesProcessed++
          console.log(
            `   ⚠️  No match found: "${existingPost.title}" (slug: ${existingPost.slug}) - HAS NO CATEGORIES`,
          )
          
          // Try to find a default category - maybe "Editorial"?
          const defaultCategorySlug = 'editorial'
          const defaultCategory = categoryMapBySlug.get(defaultCategorySlug)
          
          if (defaultCategory) {
            console.log(`   💡 Suggestion: Assign default category "Editorial" (ID: ${defaultCategory.id})`)
          } else {
            console.log(`   ⚠️  Could not find default category. This post needs manual category assignment.`)
          }
        } else {
          if (postsWithNoMatch <= 5) {
            console.log(
              `   ⚠️  No match found for: "${existingPost.title}" (slug: ${existingPost.slug})`,
            )
          }
        }
        continue
      }

      postsMatched++
      let needsUpdate = false
      const updateData: any = {}

      if (xmlPost.categories.length > 0) {
        const correctCategoryIds: number[] = []

        for (const categoryName of xmlPost.categories) {
          const categorySlug = formatSlug(categoryName).toLowerCase().trim()
          const category = categoryMapBySlug.get(categorySlug)
          
          if (category) {
            correctCategoryIds.push(category.id)
          } else {
            console.log(`   ⚠️  Category not found in Payload: "${categoryName}" (slug: "${categorySlug}")`)
          }
        }

        const currentCategoryIds = (existingPost.categories || [])
          .map((cat: any) => {
            if (typeof cat === 'object' && cat && cat.id) {
              return typeof cat.id === 'number' ? cat.id : parseInt(String(cat.id), 10)
            }
            return typeof cat === 'number' ? cat : parseInt(String(cat), 10)
          })
          .filter((id) => !isNaN(id))

        if (currentCategoryIds.length === 0) {
          postsWithNoCategoriesProcessed++
        }

        // If post has no categories but XML has categories, we should set them
        if (currentCategoryIds.length === 0 && correctCategoryIds.length > 0) {
          // Post has NO categories but we found categories in Payload - MUST UPDATE
          updateData.categories = correctCategoryIds
          needsUpdate = true
          postsWithCategoriesNeedingUpdate++
          console.log(
            `   📂 "${existingPost.title}": NO categories → setting ${correctCategoryIds.length} categories [${correctCategoryIds.join(', ')}]`,
          )
        } else if (correctCategoryIds.length > 0) {
          const currentSet = new Set(currentCategoryIds)
          const correctSet = new Set(correctCategoryIds)

          const needsCategoryUpdate =
            currentSet.size !== correctSet.size ||
            ![...correctSet].every((id) => currentSet.has(id))

          if (needsCategoryUpdate) {
            updateData.categories = correctCategoryIds
            needsUpdate = true
            postsWithCategoriesNeedingUpdate++
            console.log(
              `   📂 "${existingPost.title}": categories ${currentCategoryIds.length} → ${correctCategoryIds.length}`,
            )
            console.log(
              `       Current: [${currentCategoryIds.join(', ') || 'none'}] → New: [${correctCategoryIds.join(', ')}]`,
            )
          }
        } else {
          // We found categories in XML but none matched in Payload
          if (xmlPost.categories.length > 0) {
            console.log(
              `   ⚠️  "${existingPost.title}": Found ${xmlPost.categories.length} categories in XML but none exist in Payload`,
            )
            console.log(
              `       XML categories: ${xmlPost.categories.map((c) => `"${c}"`).join(', ')}`,
            )
            const slugs = xmlPost.categories.map((c) => formatSlug(c).toLowerCase().trim())
            console.log(
              `       Category slugs: ${slugs.join(', ')}`,
            )
            console.log(
              `       Available slugs: ${Array.from(categoryMapBySlug.keys()).slice(0, 10).join(', ')}${categoryMapBySlug.size > 10 ? '...' : ''}`,
            )
          }
        }
      }

      let imageData = imageMapByTitle.get(postTitle)
      if (!imageData && postSlug) {
        const postSlugFromImage = imagesData.find((img) => {
          const imgTitle = img.postTitle.toLowerCase().trim()
          return (
            imgTitle === postTitle || imgTitle.includes(postTitle) || postTitle.includes(imgTitle)
          )
        })
        if (postSlugFromImage) {
          imageData = postSlugFromImage
        }
      }

      if (imageData && !existingPost.heroImage) {
        let mediaId: string | undefined = imageCache.get(imageData.featuredImageUrl)

        if (!mediaId) {
          const downloadedId = await downloadAndUploadImage(imageData.featuredImageUrl, payload)
          if (downloadedId) {
            mediaId = downloadedId
            imageCache.set(imageData.featuredImageUrl, downloadedId)
          }
        }

        if (mediaId) {
          const mediaIdNum = typeof mediaId === 'string' ? parseInt(mediaId, 10) : mediaId
          if (!isNaN(mediaIdNum)) {
            updateData.heroImage = mediaIdNum
            needsUpdate = true
            console.log(`   🖼️  "${existingPost.title}": added hero image (ID: ${mediaIdNum})`)
          } else {
            console.log(`   ⚠️  "${existingPost.title}": Invalid media ID: ${mediaId}`)
          }
        } else {
          console.log(`   ⚠️  "${existingPost.title}": Failed to download/upload image`)
        }
      }

      if (needsUpdate) {
        console.log(`   🔄 Updating post with data:`, JSON.stringify(updateData, null, 2))
        try {
          const result = await payload.update({
            id: existingPost.id,
            collection: 'posts',
            data: updateData,
            context: {
              disableRevalidate: true,
            },
          })

          if (updateData.categories) {
            categoriesFixed++
            console.log(`      ✅ Categories updated successfully - post now has: ${result.categories?.length || 0} categories`)
          }
          if (updateData.heroImage) {
            imagesFixed++
            console.log(`      ✅ Hero image updated successfully`)
          }
        } catch (updateError: any) {
          console.error(
            `   ❌ Failed to update "${existingPost.title}":`,
            updateError.message || updateError,
          )
          if (updateError.errors) {
            updateError.errors.forEach((err: any) => {
              console.error(`      - ${err.path}: ${err.message}`)
            })
          }
          errors++
        }
      }
    } catch (error) {
      console.error(`   ❌ Error fixing post "${existingPost.title}":`, error)
      errors++
    }
  }

  console.log('\n📊 FIX SUMMARY:')
  console.log('================')
  console.log(`   Total posts in database: ${existingPosts.docs.length}`)
  console.log(`   Posts matched with XML: ${postsMatched}`)
  console.log(`   Posts not matched: ${postsWithNoMatch}`)
  console.log(`   Posts with no categories (processed): ${postsWithNoCategoriesProcessed}`)
  console.log(`   Posts needing category update: ${postsWithCategoriesNeedingUpdate}`)
  console.log(`   Categories fixed: ${categoriesFixed}`)
  console.log(`   Images added: ${imagesFixed}`)
  console.log(`   Errors: ${errors}`)

  if (postsWithNoMatch > 0 && postsWithNoMatch <= 10) {
    console.log('\n⚠️  Posts that could not be matched:')
    console.log('   (Title matching might have encoding issues)')
  }

  if (categoriesFixed > 0 || imagesFixed > 0) {
    console.log('\n✅ Fix completed successfully!')
  } else if (postsMatched === 0) {
    console.log('\n❌ No posts were matched! This might mean:')
    console.log('   - Post titles in database do not match XML titles')
    console.log('   - Encoding differences (special characters)')
    console.log('   - Posts were imported with different titles')
  }
}

fixPostsCategoriesAndImages()
  .then(() => {
    console.log('\n✅ Fix process finished!')
    process.exit(0)
  })
  .catch((error) => {
    console.error('❌ Error during fix:', error)
    process.exit(1)
  })
