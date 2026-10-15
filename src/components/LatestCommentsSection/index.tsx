import React from 'react'
import { getTranslations } from 'next-intl/server'

import { Link } from '@/i18n/routing'
import { formatDateTime } from '@/utilities/formatDateTime'
import { getLatestComments } from '@/utilities/getLatestComments'

// Full class names so Tailwind picks them up; one is chosen per commenter name.
const AVATAR_COLORS = [
  'bg-amber-100 text-amber-800',
  'bg-rose-100 text-rose-800',
  'bg-emerald-100 text-emerald-800',
  'bg-sky-100 text-sky-800',
  'bg-violet-100 text-violet-800',
  'bg-orange-100 text-orange-800',
]

const avatarColor = (name: string) => {
  let hash = 0
  for (const char of name) hash = (hash * 31 + char.charCodeAt(0)) >>> 0
  return AVATAR_COLORS[hash % AVATAR_COLORS.length]
}

// The desktop side column lists this many; smaller screens swipe through all of them.
const DESKTOP_ITEMS = 6

/**
 * Most recent reader comments, each linking to the comment itself on its article.
 * Rendered as the homepage side column on desktop and as a swipeable row below `lg`.
 * Server-rendered and cached until a comment changes. Renders nothing without comments,
 * so a wrapping column can collapse with `empty:hidden`.
 */
export async function LatestCommentsSection({ locale, limit = 8 }: { locale: string; limit?: number }) {
  const [comments, t] = await Promise.all([
    getLatestComments(limit, locale),
    getTranslations({ locale, namespace: 'Comments' }),
  ])

  const items = comments.filter((comment) => comment.post && comment.comment?.trim())
  if (items.length === 0) return null

  return (
    <section aria-labelledby="latest-comments-heading">
      {/* Same heading style as the category sections ("Editorial", ...) it sits next to */}
      <h2
        id="latest-comments-heading"
        className="mb-6 font-playfair text-2xl tracking-normal text-gray-900 lg:mb-8 lg:text-3xl"
      >
        {t('railHeading')}
      </h2>

      {/* A swipeable row of cards below lg, a divided vertical list in the side column from lg up */}
      <ul className="-mx-4 flex snap-x snap-mandatory gap-4 overflow-x-auto px-4 pb-1 [scrollbar-width:none] md:-mx-8 md:px-8 lg:mx-0 lg:flex-col lg:gap-0 lg:divide-y lg:divide-gray-200 lg:overflow-visible lg:p-0 [&::-webkit-scrollbar]:hidden">
        {items.map((comment, index) => {
          const name = comment.name?.trim() || t('anonymousReader')

          return (
            <li
              key={comment.id}
              className={`w-[78%] shrink-0 snap-start sm:w-[45%] lg:w-auto lg:py-5 lg:first:pt-0 lg:last:pb-0 ${index >= DESKTOP_ITEMS ? 'lg:hidden' : ''}`}
            >
              <figure className="flex h-full flex-col justify-between rounded-2xl bg-white p-4 ring-1 ring-gray-200 lg:rounded-none lg:p-0 lg:ring-0">
                <blockquote className="line-clamp-3 text-sm leading-relaxed text-gray-800">
                  {comment.comment.trim()}
                </blockquote>

                <figcaption className="mt-3 flex items-center gap-2.5">
                  <span
                    aria-hidden="true"
                    className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-semibold ${avatarColor(name)}`}
                  >
                    {name.charAt(0).toUpperCase()}
                  </span>
                  <div className="min-w-0 flex-1 text-xs leading-snug">
                    <div className="flex items-baseline justify-between gap-2">
                      <span className="truncate font-semibold text-gray-900">{name}</span>
                      {comment.createdAt && (
                        <time className="shrink-0 text-gray-500" dateTime={comment.createdAt}>
                          {formatDateTime(comment.createdAt)}
                        </time>
                      )}
                    </div>
                    <Link
                      href={`/posts/${comment.post!.slug}#comment-${comment.id}`}
                      prefetch={false}
                      className="block truncate text-amber-700 transition-colors hover:text-amber-900 hover:underline"
                    >
                      <span className="text-gray-500">{t('onArticle')} </span>
                      {comment.post!.title || t('unknownArticle')}
                    </Link>
                  </div>
                </figcaption>
              </figure>
            </li>
          )
        })}
      </ul>
    </section>
  )
}
