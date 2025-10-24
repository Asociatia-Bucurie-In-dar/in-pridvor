// Clean up database using direct API calls instead of Payload SDK
// This avoids the schema pulling issues

const baseUrl = process.env.PAYLOAD_PUBLIC_SERVER_URL || 'http://localhost:3000'

async function cleanupViaAPI() {
  console.log('🧹 Starting database cleanup via API...')
  console.log('=====================================\n')

  try {
    console.log('📊 Step 1: Check current data counts')
    console.log('------------------------------------')

    // Check posts count
    const postsResponse = await fetch(`${baseUrl}/api/posts?limit=1`)
    if (postsResponse.ok) {
      const postsData = await postsResponse.json()
      console.log(`Posts: ${postsData.totalDocs}`)
    } else {
      console.log('❌ Failed to fetch posts count')
    }

    // Check media count
    const mediaResponse = await fetch(`${baseUrl}/api/media?limit=1`)
    if (mediaResponse.ok) {
      const mediaData = await mediaResponse.json()
      console.log(`Media: ${mediaData.totalDocs}`)
    } else {
      console.log('❌ Failed to fetch media count')
    }

    console.log('\n🗑️  Step 2: Delete all posts')
    console.log('----------------------------')

    let deletedPosts = 0
    let hasMore = true

    while (hasMore) {
      const postsResponse = await fetch(`${baseUrl}/api/posts?limit=100`)

      if (!postsResponse.ok) {
        console.log('❌ Failed to fetch posts for deletion')
        break
      }

      const postsData = await postsResponse.json()
      const posts = postsData.docs || []

      if (posts.length === 0) {
        hasMore = false
        break
      }

      for (const post of posts) {
        try {
          const deleteResponse = await fetch(`${baseUrl}/api/posts/${post.id}`, {
            method: 'DELETE',
          })

          if (deleteResponse.ok) {
            deletedPosts++
            if (deletedPosts % 50 === 0) {
              console.log(`Deleted ${deletedPosts} posts...`)
            }
          } else {
            console.warn(`⚠️  Failed to delete post ${post.id}`)
          }
        } catch (error) {
          console.warn(`⚠️  Error deleting post ${post.id}:`, error)
        }
      }
    }

    console.log(`✅ Deleted ${deletedPosts} posts`)

    console.log('\n🖼️  Step 3: Delete all media')
    console.log('----------------------------')

    let deletedMedia = 0
    hasMore = true

    while (hasMore) {
      const mediaResponse = await fetch(`${baseUrl}/api/media?limit=100`)

      if (!mediaResponse.ok) {
        console.log('❌ Failed to fetch media for deletion')
        break
      }

      const mediaData = await mediaResponse.json()
      const mediaItems = mediaData.docs || []

      if (mediaItems.length === 0) {
        hasMore = false
        break
      }

      for (const mediaItem of mediaItems) {
        try {
          const deleteResponse = await fetch(`${baseUrl}/api/media/${mediaItem.id}`, {
            method: 'DELETE',
          })

          if (deleteResponse.ok) {
            deletedMedia++
            if (deletedMedia % 50 === 0) {
              console.log(`Deleted ${deletedMedia} media items...`)
            }
          } else {
            console.warn(`⚠️  Failed to delete media ${mediaItem.id}`)
          }
        } catch (error) {
          console.warn(`⚠️  Error deleting media ${mediaItem.id}:`, error)
        }
      }
    }

    console.log(`✅ Deleted ${deletedMedia} media items`)

    console.log('\n📊 Step 4: Final verification')
    console.log('-----------------------------')

    const finalPostsResponse = await fetch(`${baseUrl}/api/posts?limit=1`)
    const finalMediaResponse = await fetch(`${baseUrl}/api/media?limit=1`)

    if (finalPostsResponse.ok) {
      const finalPostsData = await finalPostsResponse.json()
      console.log(`Posts: ${finalPostsData.totalDocs}`)
    }

    if (finalMediaResponse.ok) {
      const finalMediaData = await finalMediaResponse.json()
      console.log(`Media: ${finalMediaData.totalDocs}`)
    }

    console.log('\n🎉 Database cleanup completed!')
    console.log('Ready for fresh import from new XML file.')
  } catch (error) {
    console.error('❌ Error during cleanup:', error)
  }
}

cleanupViaAPI().catch(console.error)
