'use client'

import React, { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { cn } from '@/utilities/ui'

interface CategoryHeaderProps {
  categoryTitle: string
  categorySlug?: string | null
}

export const CategoryHeader: React.FC<CategoryHeaderProps> = ({ categoryTitle, categorySlug }) => {
  const hasValidSlug = categorySlug && categorySlug.trim() !== ''
  const [_isVisible, setIsVisible] = useState(false)
  const _observerRef = useRef<IntersectionObserver | null>(null)
  const _headerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const element = _headerRef.current
    if (!element) return

    _observerRef.current = new IntersectionObserver(
      (entries) => {
        const entry = entries[0]
        if (entry?.isIntersecting) {
          setIsVisible(true)
          if (_observerRef.current) {
            _observerRef.current.disconnect()
          }
        }
      },
      {
        threshold: 0.2,
        rootMargin: '0px 0px -50px 0px',
      },
    )

    _observerRef.current.observe(element)

    return () => {
      if (_observerRef.current) {
        _observerRef.current.disconnect()
      }
    }
  }, [])

  const content = (
    <div className="group inline-flex items-center gap-1">
      <h2
        className={cn(
          'font-playfair text-2xl lg:text-3xl tracking-normal text-gray-900',
          'transition-all duration-700 ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:text-gray-600',
          _isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4',
        )}
        style={{
          transitionDelay: _isVisible ? '0ms' : undefined,
        }}
      >
        {categoryTitle}
      </h2>
      {hasValidSlug && (
        <div
          className={cn(
            'relative flex text-yellow-500 h-8 w-8 items-center justify-center self-center sm:h-8 sm:w-8',
            'transition-all duration-700 ease-[cubic-bezier(0.16,1,0.3,1)]',
            _isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4',
          )}
          style={{
            transitionDelay: _isVisible ? '0ms' : undefined,
          }}
        >
          <svg
            className="h-full w-full transition-colors"
            viewBox="0 0 50 50"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            {/* Filled background circle - offset for shadow effect */}
            <circle cx="30" cy="31" r="19" fill="currentColor" className=" opacity-15" />
            {/* Main circle outline */}
            <circle
              cx="24"
              cy="25"
              r="18"
              stroke="currentColor"
              strokeWidth="2.5"
              fill="transparent"
              className="transition-colors group-hover:text-yellow-600"
            />
            {/* Chevron arrow */}
            <path
              d="M21 18l7 7-7 7"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="transition-colors group-hover:text-yellow-600"
            />
          </svg>
        </div>
      )}
    </div>
  )

  if (hasValidSlug) {
    return (
      <div className="container" ref={_headerRef}>
        <Link href={`/categories/${categorySlug}`}>{content}</Link>
      </div>
    )
  }

  return (
    <div className="container" ref={_headerRef}>
      {content}
    </div>
  )
}
