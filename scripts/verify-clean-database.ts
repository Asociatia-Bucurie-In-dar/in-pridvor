// Verify that the database is completely clean before reimport

import { getPayload } from 'payload'
import config from '../src/payload.config'

async function verifyCleanDatabase() {
  console.log('🔍 Verifying database is clean...')
  console.log('=================================\n')

  try {
    const payload = await getPayload({ config })

    console.log('📊 Checking all collections:')
    console.log('----------------------------')

    const postsCount = await payload.count({ collection: 'posts' })
    const mediaCount = await payload.count({ collection: 'media' })
    const categoriesCount = await payload.count({ collection: 'categories' })
    const usersCount = await payload.count({ collection: 'users' })
    const commentsCount = await payload.count({ collection: 'comments' })

    console.log(`Posts: ${postsCount.totalDocs}`)
    console.log(`Media: ${mediaCount.totalDocs}`)
    console.log(`Categories: ${categoriesCount.totalDocs}`)
    console.log(`Users: ${usersCount.totalDocs}`)
    console.log(`Comments: ${commentsCount.totalDocs}`)
    console.log('')

    // Check if we have any posts or media
    const hasPosts = postsCount.totalDocs > 0
    const hasMedia = mediaCount.totalDocs > 0

    if (!hasPosts && !hasMedia) {
      console.log('✅ Database is clean!')
      console.log('- No posts found')
      console.log('- No media found')
      console.log('- Ready for fresh import')

      if (usersCount.totalDocs > 0) {
        console.log(`- ${usersCount.totalDocs} users preserved (will be reused for authors)`)
      }

      if (categoriesCount.totalDocs > 0) {
        console.log(`- ${categoriesCount.totalDocs} categories preserved (structure maintained)`)
      }

      return true
    } else {
      console.log('⚠️  Database is NOT clean:')
      if (hasPosts) {
        console.log(`- ${postsCount.totalDocs} posts still exist`)
      }
      if (hasMedia) {
        console.log(`- ${mediaCount.totalDocs} media items still exist`)
      }
      console.log('\nRun the cleanup script again before importing.')
      return false
    }
  } catch (error) {
    console.error('❌ Error verifying database:', error)
    throw error
  }
}

verifyCleanDatabase().catch(console.error)
