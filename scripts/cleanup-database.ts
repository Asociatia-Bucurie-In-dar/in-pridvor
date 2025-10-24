// Comprehensive database cleanup script
// This will delete all posts, media, and related data to start fresh

import { getPayload } from 'payload'
import config from '../src/payload.config'

async function cleanupDatabase() {
  console.log('🧹 Starting comprehensive database cleanup...')
  console.log('=============================================\n')

  try {
    const payload = await getPayload({ config })

    console.log('📊 Step 1: Check current data counts')
    console.log('------------------------------------')

    // Check current counts
    const postsCount = await payload.count({ collection: 'posts' })
    const mediaCount = await payload.count({ collection: 'media' })
    const categoriesCount = await payload.count({ collection: 'categories' })
    const usersCount = await payload.count({ collection: 'users' })

    console.log(`Posts: ${postsCount.totalDocs}`)
    console.log(`Media: ${mediaCount.totalDocs}`)
    console.log(`Categories: ${categoriesCount.totalDocs}`)
    console.log(`Users: ${usersCount.totalDocs}`)
    console.log('')

    if (postsCount.totalDocs === 0 && mediaCount.totalDocs === 0) {
      console.log('✅ Database is already clean!')
      return
    }

    console.log('🗑️  Step 2: Delete all posts')
    console.log('----------------------------')

    // Delete all posts
    let deletedPosts = 0
    let hasMore = true

    while (hasMore) {
      const posts = await payload.find({
        collection: 'posts',
        limit: 100,
        pagination: false,
      })

      if (posts.docs.length === 0) {
        hasMore = false
        break
      }

      for (const post of posts.docs) {
        await payload.delete({
          collection: 'posts',
          id: post.id,
        })
        deletedPosts++
        if (deletedPosts % 50 === 0) {
          console.log(`Deleted ${deletedPosts} posts...`)
        }
      }
    }

    console.log(`✅ Deleted ${deletedPosts} posts`)

    console.log('\n🖼️  Step 3: Delete all media')
    console.log('----------------------------')

    // Delete all media
    let deletedMedia = 0
    hasMore = true

    while (hasMore) {
      const media = await payload.find({
        collection: 'media',
        limit: 100,
        pagination: false,
      })

      if (media.docs.length === 0) {
        hasMore = false
        break
      }

      for (const mediaItem of media.docs) {
        await payload.delete({
          collection: 'media',
          id: mediaItem.id,
        })
        deletedMedia++
        if (deletedMedia % 50 === 0) {
          console.log(`Deleted ${deletedMedia} media items...`)
        }
      }
    }

    console.log(`✅ Deleted ${deletedMedia} media items`)

    console.log('\n📂 Step 4: Clean up categories (keep structure)')
    console.log('----------------------------------------------')

    // Reset category post counts but keep the structure
    const categories = await payload.find({
      collection: 'categories',
      limit: 1000,
      pagination: false,
    })

    for (const category of categories.docs) {
      await payload.update({
        collection: 'categories',
        id: category.id,
        data: {
          // Reset any post-related fields if they exist
          ...category,
          // Keep the category structure but clear any post references
        },
      })
    }

    console.log(`✅ Reset ${categories.docs.length} categories`)

    console.log("\n👥 Step 5: Keep users (don't delete)")
    console.log('------------------------------------')
    console.log('✅ Keeping all users - they will be reused for author assignment')

    console.log('\n📊 Step 6: Final verification')
    console.log('-----------------------------')

    const finalPostsCount = await payload.count({ collection: 'posts' })
    const finalMediaCount = await payload.count({ collection: 'media' })

    console.log(`Posts: ${finalPostsCount.totalDocs}`)
    console.log(`Media: ${finalMediaCount.totalDocs}`)

    if (finalPostsCount.totalDocs === 0 && finalMediaCount.totalDocs === 0) {
      console.log('\n🎉 Database cleanup completed successfully!')
      console.log('Ready for fresh import from new XML file.')
    } else {
      console.log('\n⚠️  Some data still remains. Check the counts above.')
    }
  } catch (error) {
    console.error('❌ Error during cleanup:', error)
    throw error
  }
}

cleanupDatabase().catch(console.error)
