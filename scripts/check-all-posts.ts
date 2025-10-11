import 'dotenv/config'
import { getPayload } from 'payload'
import configPromise from '../src/payload.config'

async function checkAllPosts() {
  const payload = await getPayload({ config: configPromise })

  console.log('🔍 Checking ALL posts...\n')

  // Get total count first
  const count = await payload.count({
    collection: 'posts',
  })

  console.log(`Total posts in database: ${count.totalDocs}\n`)

  // Get posts with different statuses
  const published = await payload.find({
    collection: 'posts',
    where: {
      _status: {
        equals: 'published',
      },
    },
    limit: 5,
  })

  console.log(`Published posts: ${published.totalDocs}`)

  const draft = await payload.find({
    collection: 'posts',
    where: {
      _status: {
        equals: 'draft',
      },
    },
    limit: 5,
  })

  console.log(`Draft posts: ${draft.totalDocs}`)

  // Get all without filter
  const all = await payload.find({
    collection: 'posts',
    limit: 10,
    sort: '-createdAt',
  })

  console.log(`\nAll posts (limit 10): ${all.totalDocs} total`)
  all.docs.forEach((post, idx) => {
    console.log(
      `${idx + 1}. "${post.title}" - Status: ${post._status || 'unknown'}, Created: ${new Date(post.createdAt).toLocaleString()}`,
    )
  })

  process.exit(0)
}

checkAllPosts().catch((error) => {
  console.error('Check failed:', error)
  process.exit(1)
})
