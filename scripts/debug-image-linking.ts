// Debug script to check image linking
import { getPayload } from 'payload'
import config from '@payload-config'
import fs from 'fs'
import path from 'path'

interface PostImage {
  postId: string
  postTitle: string
  featuredImageUrl: string
  imageFileName: string
}

async function debugImageLinking() {
  console.log('🔍 Debugging image linking...')

  try {
    const payload = await getPayload({ config })

    // Read the post images data
    const imagesFilePath = path.join(process.cwd(), 'import-data', 'post-images.json')
    const postImages: PostImage[] = JSON.parse(fs.readFileSync(imagesFilePath, 'utf-8'))

    console.log(`📊 Found ${postImages.length} post images in data file`)

    // Get all posts from the database
    const allPosts = await payload.find({
      collection: 'posts',
      limit: 0, // Get all posts
      depth: 0,
    })

    console.log(`📋 Found ${allPosts.totalDocs} posts in database`)

    // Check first 5 posts
    console.log('\n📋 Sample posts from database:')
    allPosts.docs.slice(0, 5).forEach((post, index) => {
      console.log(`${index + 1}. "${post.title}" (ID: ${post.id}) - Image: ${post.image || 'null'}`)
    })

    // Check first 5 post images
    console.log('\n🖼️ Sample post images from data:')
    postImages.slice(0, 5).forEach((img, index) => {
      console.log(`${index + 1}. "${img.postTitle}" -> ${img.imageFileName}`)
    })

    // Try to find matches
    console.log('\n🔍 Checking matches:')
    let matches = 0
    let noMatches = 0

    for (const postImage of postImages.slice(0, 10)) {
      const matchingPost = allPosts.docs.find((post) => post.title === postImage.postTitle)
      if (matchingPost) {
        matches++
        console.log(
          `✅ Match: "${postImage.postTitle}" -> Post ID: ${matchingPost.id}, Current Image: ${matchingPost.image || 'null'}`,
        )
      } else {
        noMatches++
        console.log(`❌ No match: "${postImage.postTitle}"`)
      }
    }

    console.log(`\n📊 Match results: ${matches} matches, ${noMatches} no matches`)

    // Check media collection
    const media = await payload.find({
      collection: 'media',
      limit: 5,
      depth: 0,
    })

    console.log(`\n📎 Found ${media.totalDocs} media items`)
    media.docs.forEach((item, index) => {
      console.log(`${index + 1}. ID: ${item.id}, Filename: ${item.filename}, URL: ${item.url}`)
    })
  } catch (error) {
    console.error('❌ Error:', error)
  }
}

debugImageLinking().catch(console.error)
