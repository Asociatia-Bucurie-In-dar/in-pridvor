// Clean up corrupted posts with empty IDs

import { getPayload } from 'payload'
import config from '../src/payload.config'

async function cleanCorruptedPosts() {
  console.log('🧹 Cleaning up corrupted posts...')
  
  try {
    const payload = await getPayload({ config })
    
    // First, let's see what posts exist
    const posts = await payload.find({
      collection: 'posts',
      limit: 1000,
      depth: 0
    })
    
    console.log(`📊 Found ${posts.docs.length} posts`)
    
    // Check for posts with invalid IDs or missing required fields
    const corruptedPosts = posts.docs.filter(post => {
      return !post.id || 
             !post.title || 
             !post.slug ||
             typeof post.id !== 'number'
    })
    
    console.log(`🔍 Found ${corruptedPosts.length} corrupted posts`)
    
    if (corruptedPosts.length > 0) {
      console.log('Corrupted posts:')
      corruptedPosts.forEach((post, index) => {
        console.log(`${index + 1}. ID: ${post.id}, Title: ${post.title || 'NO TITLE'}, Slug: ${post.slug || 'NO SLUG'}`)
      })
      
      // Delete corrupted posts
      console.log('\n🗑️  Deleting corrupted posts...')
      
      for (const post of corruptedPosts) {
        try {
          if (post.id) {
            await payload.delete({
              collection: 'posts',
              id: post.id
            })
            console.log(`✅ Deleted post ID: ${post.id}`)
          }
        } catch (error) {
          console.log(`❌ Failed to delete post ID: ${post.id}, Error: ${error}`)
        }
      }
    }
    
    // Final count
    const finalPosts = await payload.find({
      collection: 'posts',
      limit: 1000,
      depth: 0
    })
    
    console.log(`\n✅ Cleanup complete! ${finalPosts.docs.length} posts remaining`)
    
  } catch (error) {
    console.error('❌ Cleanup failed:', error)
  }
}

cleanCorruptedPosts().catch(console.error)
