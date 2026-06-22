import { getPayload } from 'payload'
import configPromise from '@payload-config'

/**
 * Progress snapshot for the RO -> EN backfill. Reports, per collection, how many
 * documents already have an English title vs. how many still need translating.
 *
 *   curl -H "Authorization: Bearer $CRON_SECRET" https://<domain>/api/translate-status
 *
 * Read-only; protected by CRON_SECRET (same as the backfill endpoint).
 */
export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const COLLECTIONS = ['posts', 'pages', 'categories'] as const

const isAuthorized = (request: Request) => {
  const secret = process.env.CRON_SECRET
  if (!secret) return false
  return request.headers.get('authorization') === `Bearer ${secret}`
}

export async function GET(request: Request) {
  if (!isAuthorized(request)) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const payload = await getPayload({ config: configPromise })

  const untranslatedWhere = {
    or: [{ 'en.title': { exists: false } }, { 'en.title': { equals: '' } }],
  }

  const perCollection: Record<string, { total: number; translated: number; remaining: number }> = {}
  let totalRemaining = 0

  for (const collection of COLLECTIONS) {
    const [all, remaining] = await Promise.all([
      payload.count({ collection: collection as any, overrideAccess: true }),
      payload.count({
        collection: collection as any,
        where: untranslatedWhere as any,
        overrideAccess: true,
      }),
    ])
    const rem = remaining.totalDocs
    perCollection[collection] = {
      total: all.totalDocs,
      translated: all.totalDocs - rem,
      remaining: rem,
    }
    totalRemaining += rem
  }

  return Response.json({
    done: totalRemaining === 0,
    totalRemaining,
    collections: perCollection,
  })
}
