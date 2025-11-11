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

    resizeObserverRef.current = new ResizeObserver((_entries) => {
      resetScroll()
    })
    resizeObserverRef.current.observe(container)

    const speed = 0.22
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
    <section className="w-full border-y border-gray-200 bg-white">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-6 py-12">
        <header className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
          <div className="flex flex-col gap-1">
            <h2 className="text-2xl font-semibold tracking-tight text-gray-900">{props.heading}</h2>
            <p className="text-sm text-gray-500">{props.subheading}</p>
          </div>
          {props.items.length > 3 && (
            <span className="hidden text-xs font-medium uppercase tracking-wide text-gray-400 md:inline">
              Scrollează pentru mai multe
            </span>
          )}
        </header>
        <div className="-mx-6">
          <div
            ref={containerRef}
            className="flex gap-4 overflow-x-auto px-6 pb-6 pt-1 snap-x snap-mandatory [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
            onMouseEnter={handlePause}
            onMouseLeave={handleResume}
            onTouchStart={handlePause}
            onTouchEnd={handleResume}
            onFocusCapture={handlePause}
            onBlurCapture={handleResume}
          >
            {!hasItems && (
              <div className="flex min-w-full items-center justify-center rounded-2xl border border-gray-200 bg-gray-50 px-6 py-16 text-sm text-gray-500">
                Nu există comentarii publicate încă.
              </div>
            )}
            {displayedItems.map((item, index) => (
              <article
                key={`${item.id}-${index}`}
                className="flex w-[320px] flex-none snap-start flex-col justify-between rounded-3xl border border-gray-200 bg-white px-6 py-5 shadow-[0_15px_35px_-20px_rgba(15,23,42,0.25)] transition hover:-translate-y-0.5 hover:shadow-[0_20px_45px_-25px_rgba(15,23,42,0.35)]"
              >
                <div className="flex flex-col gap-3">
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-sm font-semibold text-gray-900">{item.name}</span>
                    {item.createdAt && (
                      <time className="text-xs text-gray-400" dateTime={item.createdAt}>
                        {formatDateTime(item.createdAt)}
                      </time>
                    )}
                  </div>
                  <p className="text-sm leading-relaxed text-gray-600">{item.body}</p>
                </div>
                <div className="mt-6 flex items-center justify-between gap-3">
                  <Link
                    className="inline-flex items-center gap-2 text-sm font-semibold text-amber-600 transition hover:text-amber-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-200 focus-visible:ring-offset-2 focus-visible:ring-offset-white"
                    href={item.href}
                    prefetch={false}
                  >
                    {item.postTitle}
                    <span aria-hidden="true">↗</span>
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
