#!/usr/bin/env tsx

/**
 * Update Post Authors Script
 *
 * Updates all posts to associate them with "Anca Stanciu" user
 * This is useful when a user was accidentally deleted and all posts need to be reassociated
 */

import { createRequire } from 'module'
import { config } from 'dotenv'

const require = createRequire(import.meta.url)

// Load environment variables
config()

class PostAuthorUpdater {
  private updatedCount = 0
  private errorCount = 0
  private targetUserName = 'Anca Stanciu'

  async run() {
    console.log('🔄 Starting post authors update...')
    console.log(`👤 Target author: ${this.targetUserName}`)
    console.log('─'.repeat(50))

    try {
      // Use direct PostgreSQL connection
      const { Pool } = await import('pg')

      const pool = new Pool({
        connectionString: process.env.POSTGRES_URL,
      })

      console.log('📡 Connected to database')

      // Find the target user
      const userResult = await pool.query(
        `
        SELECT id, name, email 
        FROM users 
        WHERE name = $1
        LIMIT 1
      `,
        [this.targetUserName],
      )

      if (userResult.rows.length === 0) {
        console.error(`❌ User "${this.targetUserName}" not found in database`)
        console.log('\n📋 Available users:')
        const allUsers = await pool.query('SELECT id, name, email FROM users')
        allUsers.rows.forEach((user: any) => {
          console.log(`   - ${user.name} (${user.email}) [ID: ${user.id}]`)
        })
        await pool.end()
        process.exit(1)
      }

      const targetUser = userResult.rows[0]
      console.log(`✅ Found user: ${targetUser.name} (${targetUser.email})`)
      console.log(`   User ID: ${targetUser.id}`)
      console.log('─'.repeat(50))

      // Get all posts
      const postsResult = await pool.query(`
        SELECT id, title
        FROM posts
      `)

      console.log(`📝 Found ${postsResult.rows.length} posts to update`)

      if (postsResult.rows.length === 0) {
        console.log('✅ No posts found')
        await pool.end()
        return
      }

      // First, check existing author relationships
      const existingAuthors = await pool.query(`
        SELECT parent_id, users_id
        FROM posts_rels
        WHERE path = 'authors'
      `)

      console.log(`📊 Currently ${existingAuthors.rows.length} author relationships exist`)

      // Delete all existing author relationships
      console.log(`\n🗑️  Removing old author relationships...`)
      await pool.query(`
        DELETE FROM posts_rels
        WHERE path = 'authors'
      `)
      console.log(`✅ Removed all old author relationships`)

      // Add new author relationships for all posts
      console.log(`\n📝 Adding new author relationships...`)
      for (const post of postsResult.rows) {
        await this.updatePostAuthor(pool, post, targetUser.id)
      }

      // Print summary
      this.printSummary()

      await pool.end()
    } catch (error) {
      console.error('❌ Post author update failed:', error)
      process.exit(1)
    }
  }

  private async updatePostAuthor(pool: any, post: any, targetUserId: number) {
    try {
      // In Payload v3, relationships are stored in the posts_rels table
      // Insert a new row with path='authors' and users_id=targetUserId
      const insertQuery = `
        INSERT INTO posts_rels ("order", parent_id, path, users_id)
        VALUES ($1, $2, $3, $4)
      `

      await pool.query(insertQuery, [1, post.id, 'authors', targetUserId])

      // Also update the post's updated_at timestamp
      await pool.query(
        `
        UPDATE posts 
        SET updated_at = NOW()
        WHERE id = $1
      `,
        [post.id],
      )

      this.updatedCount++
      console.log(`✅ Updated: "${post.title}" (ID: ${post.id})`)
    } catch (error: any) {
      console.error(`❌ Failed to update post "${post.title}":`, error.message)
      this.errorCount++
    }
  }

  private printSummary() {
    console.log('\n' + '='.repeat(50))
    console.log('📊 POST AUTHORS UPDATE SUMMARY')
    console.log('='.repeat(50))
    console.log(`✅ Updated: ${this.updatedCount} posts`)
    console.log(`❌ Failed: ${this.errorCount} posts`)

    if (this.updatedCount > 0) {
      console.log(`\n🎉 All posts have been reassociated to "${this.targetUserName}"!`)
      console.log('\nNext steps:')
      console.log('1. Check posts in admin panel to verify author assignment')
      console.log('2. Review posts on the frontend to ensure they display correctly')
      console.log('3. Check that post metadata shows the correct author')
    }
  }
}

// Run the update
if (import.meta.url === `file://${process.argv[1]}`) {
  const updater = new PostAuthorUpdater()
  updater.run().catch((error) => {
    console.error('❌ Post author update failed:', error)
    process.exit(1)
  })
}
