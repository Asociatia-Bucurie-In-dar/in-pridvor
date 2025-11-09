import Link from 'next/link'
import React from 'react'
import configPromise from '@payload-config'
import { getPayload } from 'payload'

import { formatDateTime } from '@/utilities/formatDateTime'

const fetchLatestComments = async (limit: number) => {
  const payload = await getPayload({ config: configPromise })

  const result = await payload.find({
    collection: 'comments',
    depth: 1,
    limit,
    sort: '-createdAt',
    where: {
      status: {
        equals: 'approved',
      },
    },
  })

  return result.docs || []
}

const truncate = (value: string, length: number) => {
  if (!value) return ''
  const condensed = value.trim().replace(/\s+/g, ' ')
  if (condensed.length <= length) return condensed
  return `${condensed.slice(0, length - 3)}...`
}

type LatestCommentsBlockProps = {
  limit?: number
  heading?: string
  subheading?: string
}

export const LatestCommentsBlock: React.FC<LatestCommentsBlockProps> = async (props) => {
  const limit = props.limit || 5
  const comments = await fetchLatestComments(limit)

  return (
    <section className="rounded-3xl bg-gray-50 p-6 shadow-sm ring-1 ring-gray-100">
      <header className="mb-4">
        <h2 className="text-lg font-semibold text-gray-900">
          {props.heading || 'Ultimele comentarii'}
        </h2>
        {props.subheading ? (
          <p className="text-sm text-gray-500">{props.subheading}</p>
        ) : (
          <p className="text-sm text-gray-500">Cele mai recente răspunsuri din comunitate</p>
        )}
      </header>
      <ul className="space-y-4">
        {comments.length === 0 && (
          <li className="text-sm text-gray-500">Nu există comentarii publicate încă.</li>
        )}
        {comments.map((comment) => {
          const post = comment.post
          const postSlug =
            post && typeof post === 'object' && 'slug' in post && post.slug
              ? String(post.slug)
              : null
          const postTitle =
            post && typeof post === 'object' && 'title' in post && post.title
              ? String(post.title)
              : 'Articol necunoscut'
          const href = postSlug ? `/posts/${postSlug}` : '#'

          return (
            <li key={String(comment.id)}>
              <div className="flex flex-col gap-1.5">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-sm font-semibold text-gray-900">
                    {comment.name || 'Cititor anonim'}
                  </span>
                  {comment.createdAt && (
                    <time className="text-xs text-gray-500" dateTime={comment.createdAt}>
                      {formatDateTime(comment.createdAt)}
                    </time>
                  )}
                </div>
                <p className="text-sm text-gray-700">{truncate(comment.comment || '', 140)}</p>
                <Link
                  className="text-sm font-medium text-amber-700 hover:text-amber-800"
                  href={href}
                >
                  {postTitle}
                </Link>
              </div>
            </li>
          )
        })}
      </ul>
    </section>
  )
}
