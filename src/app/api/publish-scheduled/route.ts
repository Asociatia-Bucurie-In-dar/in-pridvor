import { getPayload, type Where } from 'payload'
import configPromise from '@payload-config'
import { unstable_cache } from 'next/cache'

import {
  expireTag,
  PUBLISH_SCHEDULE_TAG,
  revalidatePost,
  revalidatePostListings,
} from '@/utilities/revalidate'

export const dynamic = 'force-dynamic'

const HOUR = 60 * 60 * 1000

// The cron only auto-publishes drafts whose date passed recently. A draft that is
// still unpublished a week after its date is treated as abandoned (or failing
// validation) so it can't keep waking the database every 15 minutes forever.
// The "Force Cache Revalidation" button in the admin still publishes all of them.
const CRON_DRAFT_WINDOW = 7 * 24 * HOUR

const pendingScheduledJobs: Where = {
  and: [
    { taskSlug: { equals: 'schedulePublish' } },
    { completedAt: { exists: false } },
    { hasError: { not_equals: true } },
    { processing: { equals: false } },
  ],
}

/**
 * When the next scheduled thing is due (epoch ms), or null when nothing is scheduled:
 * - draft posts with a publish date (this route publishes them once it passes),
 * - published posts dated in the future (hidden from listings until then),
 * - "Schedule publish" jobs created from the admin panel.
 *
 * Kept in the Next.js data cache and expired by the Posts and payload-jobs hooks,
 * so the cron can answer "nothing to do" without touching (and waking) Neon.
 */
const getNextDueAt = unstable_cache(
  async (): Promise<number | null> => {
    const payload = await getPayload({ config: configPromise })
    const now = Date.now()

    const [posts, jobs] = await Promise.all([
      payload.find({
        collection: 'posts',
        depth: 0,
        limit: 1,
        pagination: false,
        sort: 'publishedAt',
        select: { publishedAt: true },
        overrideAccess: true,
        where: {
          or: [
            {
              and: [
                { _status: { equals: 'draft' } },
                { publishedAt: { greater_than: new Date(now - CRON_DRAFT_WINDOW).toISOString() } },
              ],
            },
            {
              and: [
                { _status: { equals: 'published' } },
                { publishedAt: { greater_than: new Date(now).toISOString() } },
              ],
            },
          ],
        },
      }),
      payload.find({
        collection: 'payload-jobs',
        depth: 0,
        limit: 1,
        pagination: false,
        sort: 'waitUntil',
        select: { waitUntil: true },
        overrideAccess: true,
        where: pendingScheduledJobs,
      }),
    ])

    const dates = [posts.docs[0]?.publishedAt, jobs.docs[0] && (jobs.docs[0].waitUntil ?? now)]
      .filter((date) => date != null)
      .map((date) => new Date(date!).getTime())

    return dates.length ? Math.min(...dates) : null
  },
  ['publish-schedule'],
  // Hooks expire the tag on every change; the TTL is only a safety net.
  { tags: [PUBLISH_SCHEDULE_TAG], revalidate: 12 * 60 * 60 },
)

const processDueWork = async ({ includeOldDrafts }: { includeOldDrafts: boolean }) => {
  const payload = await getPayload({ config: configPromise })
  const now = new Date()

  // 1. Publish drafts whose publish date has passed.
  const duePublishDate = includeOldDrafts
    ? { less_than_equal: now.toISOString() }
    : {
        less_than_equal: now.toISOString(),
        greater_than: new Date(now.getTime() - CRON_DRAFT_WINDOW).toISOString(),
      }

  const dueDrafts = await payload.find({
    collection: 'posts',
    depth: 0,
    limit: 20,
    pagination: false,
    overrideAccess: true,
    select: { title: true },
    where: { and: [{ _status: { equals: 'draft' } }, { publishedAt: duePublishDate }] },
  })

  let published = 0
  for (const post of dueDrafts.docs) {
    try {
      // The Posts afterChange hook revalidates the post and every listing.
      await payload.update({
        collection: 'posts',
        id: post.id,
        data: { _status: 'published' },
        overrideAccess: true,
      })
      published++
      payload.logger.info(`✅ Auto-published scheduled post: "${post.title}" (ID: ${post.id})`)
    } catch (error) {
      payload.logger.error(
        `❌ Failed to auto-publish post ${post.id}: ${error instanceof Error ? error.message : 'Unknown error'}`,
      )
    }
  }

  // 2. Run "Schedule publish" jobs created from the admin panel.
  const { jobStatus } = await payload.jobs.run({
    allQueues: true,
    limit: 20,
    where: pendingScheduledJobs,
  })
  const jobsRun = Object.keys(jobStatus ?? {}).length

  // 3. Posts published earlier with a future date that have now gone live.
  const wentLive = await payload.find({
    collection: 'posts',
    depth: 0,
    limit: 50,
    pagination: false,
    overrideAccess: true,
    select: { slug: true },
    where: {
      and: [
        { _status: { equals: 'published' } },
        {
          publishedAt: {
            greater_than: new Date(now.getTime() - 24 * HOUR).toISOString(),
            less_than_equal: now.toISOString(),
          },
        },
      ],
    },
  })

  for (const post of wentLive.docs) revalidatePost(post.slug)
  if (wentLive.docs.length > 0) revalidatePostListings()

  expireTag(PUBLISH_SCHEDULE_TAG)

  return {
    published,
    jobsRun,
    revalidated: wentLive.docs.length,
    checked: dueDrafts.docs.length + jobsRun + wentLive.docs.length,
  }
}

export async function GET(request: Request) {
  try {
    const isCron =
      Boolean(process.env.CRON_SECRET) &&
      request.headers.get('authorization') === `Bearer ${process.env.CRON_SECRET}`

    if (!isCron) {
      // Manual run from the admin dashboard widget: logged-in users only.
      const payload = await getPayload({ config: configPromise })
      const { user } = await payload.auth({ headers: request.headers })
      if (!user) {
        return Response.json({ success: false, error: 'Unauthorized' }, { status: 401 })
      }

      return Response.json({ success: true, ...(await processDueWork({ includeOldDrafts: true })) })
    }

    const nextDueAt = await getNextDueAt()
    if (nextDueAt === null || nextDueAt > Date.now()) {
      return Response.json({
        success: true,
        skipped: true,
        nextDueAt: nextDueAt === null ? null : new Date(nextDueAt).toISOString(),
      })
    }

    return Response.json({ success: true, ...(await processDueWork({ includeOldDrafts: false })) })
  } catch (error) {
    return Response.json(
      { success: false, error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 },
    )
  }
}
