// Import just 3 test posts to verify everything works

import fs from 'fs'
import path from 'path'

async function importTestPosts() {
  console.log('🧪 Importing 3 test posts...')
  console.log('============================\n')

  try {
    // Read the generated posts data
    const postsFilePath = path.join(process.cwd(), 'import-data', 'posts-final-all.json')

    if (!fs.existsSync(postsFilePath)) {
      console.error('❌ Posts file not found:', postsFilePath)
      return
    }

    const postsData = JSON.parse(fs.readFileSync(postsFilePath, 'utf-8'))
    console.log(`📊 Found ${postsData.length} posts in data file`)

    // Take first 3 posts
    const testPosts = postsData.slice(0, 3)

    console.log('\n📝 Test posts to import:')
    console.log('=======================')
    testPosts.forEach((post, index) => {
      console.log(`${index + 1}. ${post.title}`)
      console.log(`   Categories: ${post.categories.length} categories`)
      console.log(`   Author: ${post.author}`)
      console.log('')
    })

    // Save test posts to separate file
    const testFilePath = path.join(process.cwd(), 'import-data', 'test-posts.json')
    fs.writeFileSync(testFilePath, JSON.stringify(testPosts, null, 2))

    console.log('✅ Test posts saved to: import-data/test-posts.json')
    console.log('\n🎯 Next steps:')
    console.log('1. Go to Payload Admin: http://localhost:3000/admin')
    console.log('2. Navigate to Posts → Create New')
    console.log('3. Copy data from test-posts.json for each post')
    console.log('4. Test with these 3 posts first')
    console.log('5. If successful, import the remaining posts')
  } catch (error) {
    console.error('❌ Error:', error)
  }
}

importTestPosts().catch(console.error)
