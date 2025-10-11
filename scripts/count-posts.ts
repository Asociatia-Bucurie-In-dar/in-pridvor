import 'dotenv/config'
import { getPayload } from 'payload'
import configPromise from '../src/payload.config'

async function countPosts() {
  const payload = await getPayload({ config: configPromise })

  console.log('📊 Checking posts in database...\n')

  const posts = await payload.find({
    collection: 'posts',
    limit: 20,
    sort: '-publishedAt',
  })

  console.log(`Total posts: ${posts.totalDocs}`)
  console.log(`\n📅 Most recent posts by publish date:`)

  posts.docs.forEach((post, idx) => {
    const publishDate = post.publishedAt
      ? new Date(post.publishedAt).toLocaleDateString('ro-RO', {
          year: 'numeric',
          month: 'long',
          day: 'numeric',
        })
      : 'No date'
    console.log(`${idx + 1}. "${post.title}" - ${publishDate}`)
  })

  console.log(`\n... and ${posts.totalDocs - 20} more posts`)

  // Check oldest post
  const oldestPosts = await payload.find({
    collection: 'posts',
    limit: 5,
    sort: 'publishedAt', // Ascending - oldest first
  })

  console.log(`\n📅 Oldest posts by publish date:`)
  oldestPosts.docs.forEach((post, idx) => {
    const publishDate = post.publishedAt
      ? new Date(post.publishedAt).toLocaleDateString('ro-RO', {
          year: 'numeric',
          month: 'long',
          day: 'numeric',
        })
      : 'No date'
    console.log(`${idx + 1}. "${post.title}" - ${publishDate}`)
  })

  process.exit(0)
}

countPosts().catch((error) => {
  console.error('Count failed:', error)
  process.exit(1)
})
