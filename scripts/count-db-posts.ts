import { getPayload } from 'payload'
import config from '../src/payload.config'

async function countDatabasePosts() {
  console.log('📊 Counting posts in database...\n')

  const payload = await getPayload({ config })

  const result = await payload.find({
    collection: 'posts',
    limit: 0, // Just get the count
    depth: 0,
  })

  console.log(`📝 Total posts in database: ${result.totalDocs}`)

  return result.totalDocs
}

// Run the count
countDatabasePosts()
  .then((count) => {
    console.log(`\n✅ Database contains ${count} posts`)
    process.exit(0)
  })
  .catch((error) => {
    console.error('❌ Error counting posts:', error)
    process.exit(1)
  })
