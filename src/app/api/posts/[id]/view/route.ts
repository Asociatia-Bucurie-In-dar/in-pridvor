import { getPayload } from 'payload'
import configPromise from '@payload-config'
import { sql, type VercelPostgresAdapter } from '@payloadcms/db-vercel-postgres'
import { NextRequest, NextResponse } from 'next/server'

const BOT_USER_AGENT =
  /bot|crawl|spider|slurp|headless|lighthouse|preview|facebookexternalhit|whatsapp|telegram/i

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const postId = Number(id)

  if (!Number.isInteger(postId) || postId <= 0) {
    return NextResponse.json({ message: 'Invalid post id' }, { status: 400 })
  }

  // Crawlers don't count as readers — and shouldn't wake the database.
  if (BOT_USER_AGENT.test(request.headers.get('user-agent') ?? '')) {
    return new NextResponse(null, { status: 204 })
  }

  try {
    const payload = await getPayload({ config: configPromise })
    const db = payload.db as unknown as VercelPostgresAdapter

    // One atomic statement instead of payload.update(): a regular update would
    // snapshot the whole post (RO + EN content) into a new version row and run
    // every hook on each page view. The latest version row is bumped too, because
    // that is what the admin panel shows and saves back.
    await db.drizzle.execute(sql`
      WITH updated AS (
        UPDATE posts
        SET view_count = COALESCE(view_count, 0) + 1
        WHERE id = ${postId} AND _status = 'published'
        RETURNING id, view_count
      )
      UPDATE _posts_v
      SET version_view_count = updated.view_count
      FROM updated
      WHERE _posts_v.parent_id = updated.id AND _posts_v.latest = true
    `)

    return new NextResponse(null, { status: 204 })
  } catch (error) {
    console.error('Error incrementing view count:', error)
    return NextResponse.json({ message: 'Error incrementing view count' }, { status: 500 })
  }
}
