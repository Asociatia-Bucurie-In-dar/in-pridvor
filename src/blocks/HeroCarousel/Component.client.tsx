'use client'

import React, { useEffect, useRef } from 'react'
import { Swiper, SwiperSlide } from 'swiper/react'
import { Autoplay, EffectFade, Pagination, Navigation } from 'swiper/modules'
import { motion, AnimatePresence } from 'framer-motion'
import type { Post } from '@/payload-types'
import { Media } from '@/components/Media'
import Link from 'next/link'
import { formatDateTime } from '@/utilities/formatDateTime'
import { extractTextFromLexical } from '@/utilities/extractTextFromLexical'

// Import Swiper styles
import 'swiper/css'
import 'swiper/css/effect-fade'
import 'swiper/css/pagination'
import 'swiper/css/navigation'

interface HeroCarouselClientProps {
  posts: Post[]
  autoplayDelay?: number
  showNavigation?: boolean
  showPagination?: boolean
}

export const HeroCarouselClient: React.FC<HeroCarouselClientProps> = ({
  posts,
  autoplayDelay = 5000,
  showNavigation = true,
  showPagination = true,
}) => {
  const [hoveredIndex, setHoveredIndex] = React.useState<number | null>(null)

  if (!posts || posts.length === 0) {
    return null
  }

  return (
    <div className="relative w-full h-[500px] md:h-[600px] lg:h-[700px] overflow-hidden bg-black">
      <Swiper
        modules={[Autoplay, EffectFade, Pagination, Navigation]}
        effect="fade"
        speed={1000}
        autoplay={{
          delay: autoplayDelay,
          disableOnInteraction: false,
          pauseOnMouseEnter: true,
        }}
        pagination={
          showPagination
            ? {
                clickable: true,
                dynamicBullets: true,
              }
            : false
        }
        navigation={showNavigation}
        loop={posts.length > 1}
        className="h-full w-full hero-carousel"
        onSlideChange={() => setHoveredIndex(null)}
      >
        {posts.map((post, index) => (
          <SwiperSlide key={post.id}>
            <div
              className="relative w-full h-full"
              onMouseEnter={() => setHoveredIndex(index)}
              onMouseLeave={() => setHoveredIndex(null)}
            >
              {/* Background Image with Overlay */}
              <div className="absolute inset-0">
                {post.heroImage && typeof post.heroImage === 'object' && (
                  <Media
                    resource={post.heroImage}
                    fill
                    className="object-cover"
                    imgClassName="object-cover"
                  />
                )}
                {/* Gradient Overlay */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/50 to-black/30" />
              </div>

              {/* Content Container */}
              <Link
                href={`/posts/${post.slug}`}
                className="absolute inset-0 flex items-end cursor-pointer z-10"
              >
                <div className="container mx-auto px-4 md:px-6 lg:px-8 pb-12 md:pb-16 lg:pb-20 relative">
                  <motion.div
                    initial={{ opacity: 0, y: 30 }}
                    animate={{
                      opacity: 1,
                      y: hoveredIndex === index ? -20 : 0,
                    }}
                    transition={{ duration: 0.5, ease: 'easeOut' }}
                    className="max-w-4xl"
                  >
                    {/* Date */}
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ duration: 0.6, delay: 0.2 }}
                      className="mb-3 md:mb-4"
                    >
                      <time className="text-sm md:text-base text-white/80 font-light tracking-wider uppercase">
                        {post.publishedAt ? formatDateTime(post.publishedAt) : ''}
                      </time>
                    </motion.div>

                    {/* Title */}
                    <motion.h1
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.8, delay: 0.3 }}
                      className="text-3xl md:text-5xl lg:text-6xl xl:text-7xl font-bold text-white mb-4 md:mb-6 leading-tight"
                    >
                      {post.title}
                    </motion.h1>

                    {/* Description - Always visible but subtle */}
                    {post.meta?.description && (
                      <motion.p
                        initial={{ opacity: 0 }}
                        animate={{ opacity: hoveredIndex === index ? 1 : 0.7 }}
                        transition={{ duration: 0.3 }}
                        className="text-base md:text-lg text-white/80 leading-relaxed max-w-3xl mb-4"
                      >
                        {post.meta.description}
                      </motion.p>
                    )}

                    {/* Article Content Preview - Shown on Hover */}
                    <AnimatePresence>
                      {hoveredIndex === index && post.content && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: 'auto' }}
                          exit={{ opacity: 0, height: 0 }}
                          transition={{ duration: 0.4, ease: 'easeInOut' }}
                          className="overflow-hidden"
                        >
                          <div className="border-l-4 border-white/30 pl-4 mb-6">
                            <p className="text-sm md:text-base text-white/75 leading-relaxed line-clamp-3 max-w-3xl">
                              {extractTextFromLexical(post.content).substring(0, 200)}...
                            </p>
                          </div>
                          <motion.div
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ duration: 0.3, delay: 0.2 }}
                            className="inline-flex items-center text-white font-medium group"
                          >
                            <span className="border-b-2 border-white pb-1">Citește articolul</span>
                            <svg
                              className="ml-2 w-5 h-5 transform group-hover:translate-x-2 transition-transform"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M17 8l4 4m0 0l-4 4m4-4H3"
                              />
                            </svg>
                          </motion.div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </motion.div>
                </div>
              </Link>
            </div>
          </SwiperSlide>
        ))}
      </Swiper>

      <style jsx global>{`
        .hero-carousel .swiper-button-next,
        .hero-carousel .swiper-button-prev {
          color: white;
          width: 50px;
          height: 50px;
          background: rgba(255, 255, 255, 0.1);
          backdrop-filter: blur(10px);
          border-radius: 50%;
          transition: all 0.3s ease;
          z-index: 20;
        }

        .hero-carousel .swiper-button-next:hover,
        .hero-carousel .swiper-button-prev:hover {
          background: rgba(255, 255, 255, 0.2);
          transform: scale(1.1);
        }

        .hero-carousel .swiper-button-next::after,
        .hero-carousel .swiper-button-prev::after {
          font-size: 20px;
          font-weight: bold;
        }

        .hero-carousel .swiper-pagination-bullet {
          width: 12px;
          height: 12px;
          background: white;
          opacity: 0.5;
          transition: all 0.3s ease;
          z-index: 20;
        }

        .hero-carousel .swiper-pagination-bullet-active {
          opacity: 1;
          width: 32px;
          border-radius: 6px;
        }

        @media (max-width: 768px) {
          .hero-carousel .swiper-button-next,
          .hero-carousel .swiper-button-prev {
            width: 40px;
            height: 40px;
          }

          .hero-carousel .swiper-button-next::after,
          .hero-carousel .swiper-button-prev::after {
            font-size: 16px;
          }
        }
      `}</style>
    </div>
  )
}
