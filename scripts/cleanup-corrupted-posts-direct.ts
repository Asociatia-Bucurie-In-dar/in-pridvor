// Direct cleanup of corrupted posts using SQL
import { Pool } from 'pg'

async function cleanupCorruptedPosts() {
  console.log('🧹 Starting direct cleanup of corrupted posts...')

  const pool = new Pool({
    connectionString: process.env.POSTGRES_URL,
  })

  try {
    // First, let's see what posts exist
    const result = await pool.query(`
      SELECT id, title, slug, created_at, updated_at 
      FROM posts 
      ORDER BY id 
      LIMIT 20
    `)

    console.log(`📊 Found ${result.rows.length} posts in database`)

    if (result.rows.length > 0) {
      console.log('Sample posts:')
      result.rows.forEach((post, index) => {
        console.log(
          `${index + 1}. ID: ${post.id}, Title: ${post.title || 'NO TITLE'}, Slug: ${post.slug || 'NO SLUG'}`,
        )
      })
    }

    // Check for posts with invalid data
    const corruptedResult = await pool.query(`
      SELECT id, title, slug 
      FROM posts 
      WHERE id IS NULL 
         OR title IS NULL 
         OR title = '' 
         OR slug IS NULL 
         OR slug = ''
         OR id::text = ''
    `)

    console.log(`🔍 Found ${corruptedResult.rows.length} corrupted posts`)

    if (corruptedResult.rows.length > 0) {
      console.log('Corrupted posts:')
      corruptedResult.rows.forEach((post, index) => {
        console.log(
          `${index + 1}. ID: ${post.id}, Title: ${post.title || 'NO TITLE'}, Slug: ${post.slug || 'NO SLUG'}`,
        )
      })

      // Delete corrupted posts
      console.log('\n🗑️  Deleting corrupted posts...')

      const deleteResult = await pool.query(`
        DELETE FROM posts 
        WHERE id IS NULL 
           OR title IS NULL 
           OR title = '' 
           OR slug IS NULL 
           OR slug = ''
           OR id::text = ''
      `)

      console.log(`✅ Deleted ${deleteResult.rowCount} corrupted posts`)
    }

    // Final count
    const finalResult = await pool.query('SELECT COUNT(*) as count FROM posts')
    console.log(`\n✅ Cleanup complete! ${finalResult.rows[0].count} posts remaining`)
  } catch (error) {
    console.error('❌ Cleanup failed:', error)
  } finally {
    await pool.end()
  }
}

cleanupCorruptedPosts().catch(console.error)
