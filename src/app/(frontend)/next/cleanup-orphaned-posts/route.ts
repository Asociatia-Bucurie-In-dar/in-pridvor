import { getPayload } from 'payload'
import config from '@payload-config'
import { headers } from 'next/headers'

export const maxDuration = 1000

class OrphanedPostsCleanup {
  private cleanedCount: Record<string, number> = {}
  private payload: any

  constructor(payload: any) {
    this.payload = payload
  }

  async run() {
    this.payload.logger.info('🧹 Starting orphaned posts cleanup...')
    this.payload.logger.info('─'.repeat(50))

    try {
      const { Pool } = await import('pg')

      if (!process.env.POSTGRES_URL) {
        throw new Error('POSTGRES_URL missing in .env')
      }

      const pool = new Pool({
        connectionString: process.env.POSTGRES_URL,
      })

      this.payload.logger.info('📡 Connected to database')
      this.payload.logger.info('─'.repeat(50))

      const existingPosts = await this.getExistingPostIds(pool)
      this.payload.logger.info(`📊 Found ${existingPosts.size} valid posts in database`)

      if (existingPosts.size === 0) {
        this.payload.logger.info('⚠️  No posts exist in database. Cleaning up all orphaned records...')
      }

      await this.cleanupPostsRels(pool, existingPosts)
      await this.cleanupPostsVersionsRels(pool, existingPosts)
      await this.cleanupPostsVersions(pool, existingPosts)
      await this.cleanupComments(pool, existingPosts)
      await this.cleanupRedirects(pool, existingPosts)
      await this.cleanupLockedDocuments(pool, existingPosts)
      await this.cleanupSearchIndex(pool, existingPosts)

      const summary = this.getSummary()
      this.payload.logger.info(summary)

      await pool.end()

      return summary
    } catch (error: any) {
      this.payload.logger.error('❌ Cleanup failed:', error)
      throw error
    }
  }

  private async getExistingPostIds(pool: any): Promise<Set<number>> {
    const result = await pool.query('SELECT id FROM posts')
    return new Set(result.rows.map((row: any) => row.id))
  }

  private async cleanupPostsRels(pool: any, existingPosts: Set<number>) {
    this.payload.logger.info('\n🗑️  Cleaning up posts_rels table...')
    
    if (existingPosts.size === 0) {
      const result = await pool.query('DELETE FROM posts_rels')
      this.cleanedCount['posts_rels'] = result.rowCount || 0
      this.payload.logger.info(`   ✅ Deleted ${this.cleanedCount['posts_rels']} orphaned records`)
    } else {
      const result = await pool.query(
        `DELETE FROM posts_rels 
         WHERE parent_id IS NOT NULL 
         AND parent_id NOT IN (SELECT unnest($1::int[]))`,
        [Array.from(existingPosts)]
      )
      this.cleanedCount['posts_rels'] = result.rowCount || 0
      this.payload.logger.info(`   ✅ Deleted ${this.cleanedCount['posts_rels']} orphaned records`)
    }
  }

  private async cleanupPostsVersionsRels(pool: any, existingPosts: Set<number>) {
    this.payload.logger.info('\n🗑️  Cleaning up _posts_v_rels table...')
    
    if (existingPosts.size === 0) {
      const result = await pool.query('DELETE FROM _posts_v_rels')
      this.cleanedCount['_posts_v_rels'] = result.rowCount || 0
      this.payload.logger.info(`   ✅ Deleted ${this.cleanedCount['_posts_v_rels']} orphaned records`)
    } else {
      const result = await pool.query(
        `DELETE FROM _posts_v_rels 
         WHERE parent_id IS NOT NULL 
         AND parent_id NOT IN (SELECT unnest($1::int[]))`,
        [Array.from(existingPosts)]
      )
      this.cleanedCount['_posts_v_rels'] = result.rowCount || 0
      this.payload.logger.info(`   ✅ Deleted ${this.cleanedCount['_posts_v_rels']} orphaned records`)
    }
  }

  private async cleanupPostsVersions(pool: any, existingPosts: Set<number>) {
    this.payload.logger.info('\n🗑️  Cleaning up _posts_v table...')
    
    const tableExists = await this.tableExists(pool, '_posts_v')
    if (!tableExists) {
      this.payload.logger.info('   ℹ️  Table _posts_v does not exist, skipping')
      this.cleanedCount['_posts_v'] = 0
      return
    }

    if (existingPosts.size === 0) {
      const result = await pool.query('DELETE FROM _posts_v')
      this.cleanedCount['_posts_v'] = result.rowCount || 0
      this.payload.logger.info(`   ✅ Deleted ${this.cleanedCount['_posts_v']} orphaned records`)
    } else {
      const result = await pool.query(
        `DELETE FROM _posts_v 
         WHERE id IS NOT NULL 
         AND id NOT IN (SELECT unnest($1::int[]))`,
        [Array.from(existingPosts)]
      )
      this.cleanedCount['_posts_v'] = result.rowCount || 0
      this.payload.logger.info(`   ✅ Deleted ${this.cleanedCount['_posts_v']} orphaned records`)
    }
  }

  private async cleanupComments(pool: any, existingPosts: Set<number>) {
    this.payload.logger.info('\n🗑️  Cleaning up comments table...')
    
    const commentsRelsExists = await this.tableExists(pool, 'comments_rels')
    
    if (commentsRelsExists) {
      if (existingPosts.size === 0) {
        const deleteComments = await pool.query(
          `DELETE FROM comments 
           WHERE id IN (SELECT DISTINCT parent_id FROM comments_rels WHERE path = 'post')`
        )
        const deleteRels = await pool.query('DELETE FROM comments_rels WHERE path = \'post\'')
        this.cleanedCount['comments'] = (deleteComments.rowCount || 0) + (deleteRels.rowCount || 0)
        this.payload.logger.info(`   ✅ Deleted ${deleteComments.rowCount || 0} orphaned comments and ${deleteRels.rowCount || 0} orphaned relationships`)
      } else {
        const deleteComments = await pool.query(
          `DELETE FROM comments 
           WHERE id IN (
             SELECT DISTINCT parent_id 
             FROM comments_rels 
             WHERE path = 'post' 
             AND posts_id IS NOT NULL 
             AND posts_id NOT IN (SELECT unnest($1::int[]))
           )`,
          [Array.from(existingPosts)]
        )
        const deleteRels = await pool.query(
          `DELETE FROM comments_rels 
           WHERE path = 'post' 
           AND posts_id IS NOT NULL 
           AND posts_id NOT IN (SELECT unnest($1::int[]))`,
          [Array.from(existingPosts)]
        )
        this.cleanedCount['comments'] = (deleteComments.rowCount || 0) + (deleteRels.rowCount || 0)
        this.payload.logger.info(`   ✅ Deleted ${deleteComments.rowCount || 0} orphaned comments and ${deleteRels.rowCount || 0} orphaned relationships`)
      }
    } else {
      this.payload.logger.info('   ℹ️  Table comments_rels does not exist, trying direct column...')
      const hasPostColumn = await this.columnExists(pool, 'comments', 'post')
      if (hasPostColumn) {
        if (existingPosts.size === 0) {
          const result = await pool.query('DELETE FROM comments WHERE post IS NOT NULL')
          this.cleanedCount['comments'] = result.rowCount || 0
          this.payload.logger.info(`   ✅ Deleted ${this.cleanedCount['comments']} orphaned comments`)
        } else {
          const result = await pool.query(
            `DELETE FROM comments 
             WHERE post IS NOT NULL 
             AND post NOT IN (SELECT unnest($1::int[]))`,
            [Array.from(existingPosts)]
          )
          this.cleanedCount['comments'] = result.rowCount || 0
          this.payload.logger.info(`   ✅ Deleted ${this.cleanedCount['comments']} orphaned comments`)
        }
      } else {
        this.payload.logger.info('   ℹ️  Comments table structure not recognized, skipping')
        this.cleanedCount['comments'] = 0
      }
    }
  }
  
  private async columnExists(pool: any, tableName: string, columnName: string): Promise<boolean> {
    const result = await pool.query(
      `SELECT EXISTS (
        SELECT FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = $1
        AND column_name = $2
      )`,
      [tableName, columnName]
    )
    return result.rows[0].exists
  }

  private async cleanupRedirects(pool: any, existingPosts: Set<number>) {
    this.payload.logger.info('\n🗑️  Cleaning up redirects table...')
    
    const tableExists = await this.tableExists(pool, 'redirects')
    if (!tableExists) {
      this.payload.logger.info('   ℹ️  Table redirects does not exist, skipping')
      this.cleanedCount['redirects'] = 0
      return
    }

    const hasToColumn = await this.columnExists(pool, 'redirects', 'to')
    if (!hasToColumn) {
      this.payload.logger.info('   ℹ️  Redirects table does not have "to" column, checking redirects_rels...')
      const redirectsRelsExists = await this.tableExists(pool, 'redirects_rels')
      if (redirectsRelsExists) {
        if (existingPosts.size === 0) {
          const result = await pool.query(
            `UPDATE redirects 
             SET "from" = NULL 
             WHERE id IN (
               SELECT DISTINCT parent_id 
               FROM redirects_rels 
               WHERE path = 'to.reference' 
               AND posts_id IS NOT NULL
             )`
          )
          const deleteRels = await pool.query(
            `DELETE FROM redirects_rels 
             WHERE path = 'to.reference' 
             AND posts_id IS NOT NULL`
          )
          this.cleanedCount['redirects'] = (result.rowCount || 0) + (deleteRels.rowCount || 0)
          this.payload.logger.info(`   ✅ Updated ${result.rowCount || 0} redirects and deleted ${deleteRels.rowCount || 0} orphaned relationships`)
        } else {
          const result = await pool.query(
            `UPDATE redirects 
             SET "from" = NULL 
             WHERE id IN (
               SELECT DISTINCT parent_id 
               FROM redirects_rels 
               WHERE path = 'to.reference' 
               AND posts_id IS NOT NULL 
               AND posts_id NOT IN (SELECT unnest($1::int[]))
             )`,
            [Array.from(existingPosts)]
          )
          const deleteRels = await pool.query(
            `DELETE FROM redirects_rels 
             WHERE path = 'to.reference' 
             AND posts_id IS NOT NULL 
             AND posts_id NOT IN (SELECT unnest($1::int[]))`,
            [Array.from(existingPosts)]
          )
          this.cleanedCount['redirects'] = (result.rowCount || 0) + (deleteRels.rowCount || 0)
          this.payload.logger.info(`   ✅ Updated ${result.rowCount || 0} redirects and deleted ${deleteRels.rowCount || 0} orphaned relationships`)
        }
      } else {
        this.payload.logger.info('   ℹ️  Redirects table structure not recognized, skipping')
        this.cleanedCount['redirects'] = 0
      }
      return
    }

    if (existingPosts.size === 0) {
      const result = await pool.query(
        `UPDATE redirects 
         SET "to" = NULL 
         WHERE "to"->>'type' = 'reference' 
         AND "to"->>'relationTo' = 'posts'`
      )
      this.cleanedCount['redirects'] = result.rowCount || 0
      this.payload.logger.info(`   ✅ Updated ${this.cleanedCount['redirects']} redirects`)
    } else {
      const postIds = Array.from(existingPosts)
      const result = await pool.query(
        `UPDATE redirects 
         SET "to" = NULL 
         WHERE "to"->>'type' = 'reference' 
         AND "to"->>'relationTo' = 'posts'
         AND ("to"->>'value')::int NOT IN (SELECT unnest($1::int[]))`,
        [postIds]
      )
      this.cleanedCount['redirects'] = result.rowCount || 0
      this.payload.logger.info(`   ✅ Updated ${this.cleanedCount['redirects']} redirects`)
    }
  }

  private async cleanupLockedDocuments(pool: any, existingPosts: Set<number>) {
    this.payload.logger.info('\n🗑️  Cleaning up payload_locked_documents table...')
    
    const tableExists = await this.tableExists(pool, 'payload_locked_documents')
    if (!tableExists) {
      this.payload.logger.info('   ℹ️  Table payload_locked_documents does not exist, skipping')
      this.cleanedCount['payload_locked_documents'] = 0
      return
    }

    const hasDocumentColumn = await this.columnExists(pool, 'payload_locked_documents', 'document')
    
    if (!hasDocumentColumn) {
      this.payload.logger.info('   ℹ️  payload_locked_documents table does not have "document" column, skipping')
      this.cleanedCount['payload_locked_documents'] = 0
      return
    }

    if (existingPosts.size === 0) {
      const result = await pool.query(
        `DELETE FROM payload_locked_documents 
         WHERE document->>'relationTo' = 'posts'`
      )
      this.cleanedCount['payload_locked_documents'] = result.rowCount || 0
      this.payload.logger.info(`   ✅ Deleted ${this.cleanedCount['payload_locked_documents']} orphaned locked documents`)
    } else {
      const result = await pool.query(
        `DELETE FROM payload_locked_documents 
         WHERE document->>'relationTo' = 'posts'
         AND (document->>'value')::int NOT IN (SELECT unnest($1::int[]))`,
        [Array.from(existingPosts)]
      )
      this.cleanedCount['payload_locked_documents'] = result.rowCount || 0
      this.payload.logger.info(`   ✅ Deleted ${this.cleanedCount['payload_locked_documents']} orphaned locked documents`)
    }
  }

  private async cleanupSearchIndex(pool: any, existingPosts: Set<number>) {
    this.payload.logger.info('\n🗑️  Cleaning up search index...')
    
    const tableExists = await this.tableExists(pool, 'payload_search')
    if (!tableExists) {
      this.payload.logger.info('   ℹ️  Table payload_search does not exist, skipping')
      this.cleanedCount['payload_search'] = 0
      return
    }

    if (existingPosts.size === 0) {
      const result = await pool.query(
        `DELETE FROM payload_search 
         WHERE "relationTo" = 'posts'`
      )
      this.cleanedCount['payload_search'] = result.rowCount || 0
      this.payload.logger.info(`   ✅ Deleted ${this.cleanedCount['payload_search']} orphaned search entries`)
    } else {
      const result = await pool.query(
        `DELETE FROM payload_search 
         WHERE "relationTo" = 'posts'
         AND id::int NOT IN (SELECT unnest($1::int[]))`,
        [Array.from(existingPosts)]
      )
      this.cleanedCount['payload_search'] = result.rowCount || 0
      this.payload.logger.info(`   ✅ Deleted ${this.cleanedCount['payload_search']} orphaned search entries`)
    }
  }

  private async tableExists(pool: any, tableName: string): Promise<boolean> {
    const result = await pool.query(
      `SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = $1
      )`,
      [tableName]
    )
    return result.rows[0].exists
  }

  private getSummary() {
    const totalCleaned = Object.values(this.cleanedCount).reduce((sum, count) => sum + count, 0)
    
    return {
      totalCleaned,
      details: this.cleanedCount,
      message: totalCleaned > 0
        ? `🎉 Cleanup completed! ${totalCleaned} orphaned records were removed.`
        : 'ℹ️  No orphaned records found. Everything looks clean!',
    }
  }
}

export async function POST(): Promise<Response> {
  const payload = await getPayload({ config })
  const requestHeaders = await headers()

  const { user } = await payload.auth({ headers: requestHeaders })

  if (!user) {
    return new Response('Action forbidden.', { status: 403 })
  }

  try {
    const cleanup = new OrphanedPostsCleanup(payload)
    const summary = await cleanup.run()

    return Response.json({
      success: true,
      ...summary,
    })
  } catch (error: any) {
    payload.logger.error('❌ Cleanup failed:', error)
    return Response.json(
      {
        success: false,
        message: error.message || 'Cleanup failed',
        totalCleaned: 0,
        details: {},
      },
      { status: 500 },
    )
  }
}

