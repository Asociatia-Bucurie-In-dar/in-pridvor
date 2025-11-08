import Link from 'next/link'
import React from 'react'
import configPromise from '@payload-config'
import { getPayload } from 'payload'

import type { PopularPostsBlock as PopularPostsBlockProps, Comment, Post } from '@/payload-types'

import { formatDateTime } from '@/utilities/formatDateTime'

type PopularEntry = {
  id: string
  count: number
  latest: number
}

const normalizePostId = (post: Comment['post']) => {
  if (!post) return null
  if (typeof post === 'string') return post
  if (typeof post === 'number') return String(post)
  if (typeof post === 'object' && 'id' in post && post.id) return String(post.id)
  return null
}

const collectPopularIds = (comments: Comment[], limit: number) => {
  const map = new Map<string, PopularEntry>()

  comments.forEach((comment) => {
    const id = normalizePostId(comment.post)
    if (!id) return
    const createdAt = comment.createdAt ? new Date(comment.createdAt).getTime() : 0
    const existing = map.get(id)
    if (!existing) {
      map.set(id, {
        id,
        count: 1,
        latest: createdAt,
      })
      return
    }
    existing.count += 1
    existing.latest = Math.max(existing.latest, createdAt)
  })

  return Array.from(map.values())
    .sort((a, b) => {
      if (b.count !== a.count) return b.count - a.count
      return b.latest - a.latest
    })
    .slice(0, limit)
    .map((entry) => entry.id)
}

const fetchPopularPosts = async (limit: number) => {
  const payload = await getPayload({ config: configPromise })

  const [commentsResult, fallbackResult] = await Promise.all([
    payload.find({
      collection: 'comments',
      depth: 0,
      limit: 500,
      pagination: false,
      select: {
        post: true,
        createdAt: true,
        status: true,
      },
      where: {
        status: {
          equals: 'approved',
        },
      },
    }),
    payload.find({
      collection: 'posts',
      depth: 0,
      limit,
      sort: '-publishedAt',
      select: {
        id: true,
        title: true,
        slug: true,
        publishedAt: true,
      },
      where: {
        _status: {
          equals: 'published',
        },
      },
    }),
  ])

  const commentDocs = (commentsResult.docs || []) as Comment[]
  const targetIds = collectPopularIds(commentDocs, limit * 2)

  let popularPosts: Post[] = []

  if (targetIds.length > 0) {
    const postsResult = await payload.find({
      collection: 'posts',
      depth: 0,
      limit: targetIds.length,
      select: {
        id: true,
        title: true,
        slug: true,
        publishedAt: true,
      },
      where: {
        and: [
          {
            id: {
              in: targetIds,
            },
          },
          {
            _status: {
              equals: 'published',
            },
          },
        ],
      },
    })

    const postMap = new Map(
      ((postsResult.docs || []) as Post[]).map((post) => [String(post.id), post]),
    )

    popularPosts = targetIds
      .map((id) => postMap.get(id))
      .filter((post): post is Post => Boolean(post))
      .slice(0, limit)
  }

  if (popularPosts.length < limit) {
    const fallbackPosts = (fallbackResult.docs || []) as Post[]
    const existingIds = new Set(popularPosts.map((post) => String(post.id)))
    for (const post of fallbackPosts) {
      const id = String(post.id)
      if (existingIds.has(id)) continue
      popularPosts.push(post)
      existingIds.add(id)
      if (popularPosts.length >= limit) break
    }
  }

  return popularPosts
}

export const PopularPostsBlock: React.FC<PopularPostsBlockProps> = async (props) => {
  const limit = props.limit || 5
  const posts = await fetchPopularPosts(limit)

  return (
    <section className="rounded-3xl bg-gray-50 p-6 shadow-sm ring-1 ring-gray-100">
      <header className="mb-4">
        <h2 className="text-lg font-semibold text-gray-900">
          {props.heading || 'Cele mai citite articole'}
        </h2>
        {props.subheading ? (
          <p className="text-sm text-gray-500">{props.subheading}</p>
        ) : (
          <p className="text-sm text-gray-500">Top bazat pe activitatea din comentarii</p>
        )}
      </header>
      <ol className="space-y-4">
        {posts.length === 0 && (
          <li className="text-sm text-gray-500">Nu există articole pentru afișare.</li>
        )}
        {posts.map((post, index) => {
          const href = post.slug ? `/posts/${post.slug}` : '#'
          return (
            <li className="flex items-start gap-3" key={String(post.id)}>
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-amber-100 text-sm font-semibold text-amber-800">
                {index + 1}
              </span>
              <div>
                <Link className="font-semibold text-gray-900 hover:text-gray-700" href={href}>
                  {post.title || 'Articol fără titlu'}
                </Link>
                {post.publishedAt && (
                  <time className="block text-xs text-gray-500" dateTime={post.publishedAt}>
                    {formatDateTime(post.publishedAt)}
                  </time>
                )}
              </div>
            </li>
          )
        })}
      </ol>
    </section>
  )
}

