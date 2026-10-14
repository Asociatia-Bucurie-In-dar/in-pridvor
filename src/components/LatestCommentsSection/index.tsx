import React from 'react'
import { getTranslations } from 'next-intl/server'
import { MessageCircle } from 'lucide-react'

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

// Desktop shows one row of this many cards; smaller screens swipe through all of them.
const DESKTOP_CARDS = 4

/**
 * Compact homepage strip with the most recent reader comments, each linking to the
 * comment itself on its article. Server-rendered and cached until a comment changes.
 */
export async function LatestCommentsSection({ locale, limit = 8 }: { locale: string; limit?: number }) {
  const [comments, t] = await Promise.all([
    getLatestComments(limit, locale),
    getTranslations({ locale, namespace: 'Comments' }),
  ])

  const items = comments.filter((comment) => comment.post && comment.comment?.trim())
  if (items.length === 0) return null

  return (
    <section aria-labelledby="latest-comments-heading" className="container my-12 first:mt-0">
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-amber-50 via-amber-50/40 to-white px-5 py-6 ring-1 ring-amber-100 md:px-8">
        {/* Decorative quote mark */}
        <span
          aria-hidden="true"
          className="pointer-events-none absolute -top-6 right-6 select-none font-playfair text-[8rem] leading-none text-amber-200/60"
        >
          &ldquo;
        </span>

        <header className="relative mb-5 flex flex-wrap items-baseline gap-x-4 gap-y-1">
          <h2
            id="latest-comments-heading"
            className="inline-flex items-center gap-2 font-playfair text-2xl tracking-normal text-gray-900"
          >
            <MessageCircle className="h-5 w-5 text-amber-600" aria-hidden="true" />
            {t('railHeading')}
          </h2>
          <p className="text-sm text-gray-600">{t('railSubheading')}</p>
        </header>

        {/* One swipeable row below lg, a single row of DESKTOP_CARDS from lg up */}
        <ul className="relative -mx-5 flex snap-x snap-mandatory gap-4 overflow-x-auto px-5 pb-1 [scrollbar-width:none] md:-mx-8 md:px-8 lg:mx-0 lg:grid lg:grid-cols-4 lg:overflow-visible lg:px-0 [&::-webkit-scrollbar]:hidden">
          {items.map((comment, index) => {
            const name = comment.name?.trim() || t('anonymousReader')

            return (
              <li
                key={comment.id}
                className={`w-[78%] shrink-0 snap-start sm:w-[45%] lg:w-auto ${index >= DESKTOP_CARDS ? 'lg:hidden' : ''}`}
              >
                <figure className="flex h-full flex-col justify-between rounded-2xl bg-white p-4 shadow-[0_10px_30px_-22px_rgba(120,53,15,0.45)] ring-1 ring-gray-200/70 transition duration-300 hover:-translate-y-0.5 hover:ring-amber-200">
                  <blockquote className="line-clamp-3 font-playfair text-[0.95rem] italic leading-relaxed text-gray-800">
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
      </div>
    </section>
  )
}
