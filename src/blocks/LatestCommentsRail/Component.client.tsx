'use client'

import Link from 'next/link'
import { useEffect, useMemo, useRef } from 'react'

import { formatDateTime } from '@/utilities/formatDateTime'

type LatestCommentsRailItem = {
  id: string
  name: string
  body: string
  createdAt: string | null
  href: string
  postTitle: string
}

type LatestCommentsRailClientProps = {
  heading: string
  subheading: string
  items: LatestCommentsRailItem[]
}

const avatarGradients = [
  'from-amber-400 to-orange-500',
  'from-emerald-400 to-teal-500',
  'from-violet-400 to-purple-500',
  'from-rose-400 to-pink-500',
  'from-sky-400 to-blue-500',
  'from-lime-400 to-green-500',
]

const getInitials = (name: string): string => {
  const parts = name.trim().split(/\s+/)
  if (parts.length === 1) return parts[0]!.charAt(0).toUpperCase()
  return (parts[0]!.charAt(0) + parts[parts.length - 1]!.charAt(0)).toUpperCase()
}

const getGradientForName = (name: string): string => {
  let hash = 0
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash)
  }
  return avatarGradients[Math.abs(hash) % avatarGradients.length]!
}

export const LatestCommentsRailClient: React.FC<LatestCommentsRailClientProps> = (props) => {
  const containerRef = useRef<HTMLDivElement | null>(null)
  const isPausedRef = useRef(false)
  const frameRef = useRef<number | null>(null)
  const resizeObserverRef = useRef<ResizeObserver | null>(null)

  const hasItems = props.items.length > 0

  const displayedItems = useMemo(() => {
    if (!hasItems) return []
    const duplicateCount = props.items.length >= 6 ? 2 : 3
    return Array.from({ length: duplicateCount }, () => props.items).flat()
  }, [hasItems, props.items])

  useEffect(() => {
    const container = containerRef.current
    if (!container) return
    if (!hasItems) return

    const resetScroll = () => {
      container.scrollLeft = 0
    }

    resetScroll()

    if (resizeObserverRef.current) {
      resizeObserverRef.current.disconnect()
    }

    resizeObserverRef.current = new ResizeObserver(() => {
      resetScroll()
    })
    resizeObserverRef.current.observe(container)

    const speed = 0.18
    let lastTime = performance.now()

    const tick = (now: number) => {
      const delta = now - lastTime
      lastTime = now

      const maxScroll = container.scrollWidth - container.clientWidth

      if (!isPausedRef.current && maxScroll > 1) {
        container.scrollLeft += delta * speed

        if (container.scrollLeft >= maxScroll - 2) {
          container.scrollLeft = 0
        }
      }

      frameRef.current = requestAnimationFrame(tick)
    }

    frameRef.current = requestAnimationFrame(tick)

    return () => {
      if (frameRef.current) cancelAnimationFrame(frameRef.current)
      if (resizeObserverRef.current) {
        resizeObserverRef.current.disconnect()
        resizeObserverRef.current = null
      }
    }
  }, [displayedItems, hasItems])

  const handlePause = () => {
    isPausedRef.current = true
  }

  const handleResume = () => {
    isPausedRef.current = false
  }

  return (
    <section className="w-full bg-gradient-to-b from-stone-900 via-stone-900 to-stone-950 relative overflow-hidden">
      <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxwYXRoIGQ9Ik0zNiAxOGMtOS45NDEgMC0xOCA4LjA1OS0xOCAxOHM4LjA1OSAxOCAxOCAxOCAxOC04LjA1OSAxOC0xOC04LjA1OS0xOC0xOC0xOHptMCAzMmMtNy43MzIgMC0xNC02LjI2OC0xNC0xNHM2LjI2OC0xNCAxNC0xNCAxNCA2LjI2OCAxNCAxNC02LjI2OCAxNC0xNCAxNHoiIGZpbGw9IiNmZmYiIGZpbGwtb3BhY2l0eT0iLjAyIi8+PC9nPjwvc3ZnPg==')] opacity-50" />
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-8 px-6 py-16 relative">
        <header className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div className="flex flex-col gap-2">
            <h2 className="font-playfair text-3xl md:text-4xl font-medium tracking-tight text-white">
              {props.heading}
            </h2>
            <p className="text-base text-stone-400">{props.subheading}</p>
          </div>
          <Link
            href="/posts"
            className="group inline-flex items-center gap-2 text-sm font-medium text-amber-400 transition-colors hover:text-amber-300"
          >
            Vezi toate articolele
            <svg
              className="h-4 w-4 transition-transform group-hover:translate-x-0.5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M17 8l4 4m0 0l-4 4m4-4H3" />
            </svg>
          </Link>
        </header>
        <div className="-mx-6">
          <div
            ref={containerRef}
            className="flex gap-5 overflow-x-auto px-6 pb-8 pt-2 snap-x snap-mandatory [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
            onMouseEnter={handlePause}
            onMouseLeave={handleResume}
            onTouchStart={handlePause}
            onTouchEnd={handleResume}
            onFocusCapture={handlePause}
            onBlurCapture={handleResume}
          >
            {!hasItems && (
              <div className="flex min-w-full items-center justify-center rounded-2xl border border-stone-700 bg-stone-800/50 px-6 py-16 text-sm text-stone-400">
                Nu există comentarii publicate încă.
              </div>
            )}
            {displayedItems.map((item, index) => (
              <article
                key={`${item.id}-${index}`}
                className="group flex w-[340px] flex-none snap-start flex-col justify-between rounded-2xl border border-stone-700/50 bg-stone-800/40 backdrop-blur-sm px-6 py-6 transition-all duration-300 hover:-translate-y-1 hover:bg-stone-800/60 hover:border-stone-600/50 hover:shadow-[0_25px_50px_-12px_rgba(0,0,0,0.5)]"
              >
                <div className="flex flex-col gap-4">
                  <div className="flex items-start gap-3">
                    <div
                      className={`flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-gradient-to-br ${getGradientForName(item.name)} text-sm font-semibold text-white shadow-lg`}
                    >
                      {getInitials(item.name)}
                    </div>
                    <div className="flex flex-col gap-0.5 min-w-0">
                      <span className="text-sm font-semibold text-white truncate">{item.name}</span>
                      {item.createdAt && (
                        <time className="text-xs text-stone-500" dateTime={item.createdAt}>
                          {formatDateTime(item.createdAt)}
                        </time>
                      )}
                    </div>
                  </div>
                  <p className="text-sm leading-relaxed text-stone-300 line-clamp-4">{item.body}</p>
                </div>
                <div className="mt-5 pt-4 border-t border-stone-700/50">
                  <Link
                    className="inline-flex items-center gap-2 text-sm font-medium text-amber-400 transition-colors hover:text-amber-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400/50 focus-visible:ring-offset-2 focus-visible:ring-offset-stone-800 group/link"
                    href={item.href}
                    prefetch={false}
                  >
                    <span className="truncate max-w-[240px]">{item.postTitle}</span>
                    <svg
                      className="h-4 w-4 flex-shrink-0 transition-transform group-hover/link:translate-x-0.5 group-hover/link:-translate-y-0.5"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={2}
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M7 17L17 7M17 7H7M17 7v10"
                      />
                    </svg>
                  </Link>
                </div>
              </article>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}
