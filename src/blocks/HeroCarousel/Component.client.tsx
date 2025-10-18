'use client'

import React from 'react'
import { Swiper, SwiperSlide } from 'swiper/react'
import { Autoplay, EffectFade, Pagination, Navigation } from 'swiper/modules'
import { motion } from 'framer-motion'
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
  const [activeIndex, setActiveIndex] = React.useState<number>(0)

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
        onSlideChange={(swiper) => {
          setActiveIndex(swiper.realIndex)
        }}
        onInit={(swiper) => {
          setActiveIndex(swiper.realIndex)
        }}
      >
        {posts.map((post, index) => {
          const isActive = index === activeIndex

          return (
            <SwiperSlide key={post.id}>
              <div className="relative w-full h-full">
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
                    <div className="max-w-4xl">
                      {/* Date */}
                      <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={isActive ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
                        transition={{ duration: 0.6, delay: 0.2 }}
                        className="mb-3 md:mb-4"
                      >
                        <time className="text-sm md:text-base text-white/80 font-light tracking-wider uppercase">
                          {post.publishedAt ? formatDateTime(post.publishedAt) : ''}
                        </time>
                      </motion.div>

                      {/* Title */}
                      <motion.h1
                        initial={{ opacity: 0, y: 30 }}
                        animate={isActive ? { opacity: 1, y: 0 } : { opacity: 0, y: 30 }}
                        transition={{ duration: 0.8, delay: 0.3 }}
                        className="text-3xl md:text-4xl lg:text-5xl xl:text-6xl font-bold text-white mb-4 md:mb-6 leading-tight"
                      >
                        {post.title}
                      </motion.h1>

                      {/* Description - Always visible when slide is active */}
                      {post.content && (
                        <motion.p
                          initial={{ opacity: 0, y: 20 }}
                          animate={isActive ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
                          transition={{ duration: 0.8, delay: 0.5 }}
                          className="text-base md:text-lg text-white/90 leading-relaxed max-w-3xl mb-6"
                        >
                          {extractTextFromLexical(post.content, 150)}
                        </motion.p>
                      )}

                      {/* Read More Button */}
                      <motion.div
                        initial={{ opacity: 0, x: -20 }}
                        animate={isActive ? { opacity: 1, x: 0 } : { opacity: 0, x: -20 }}
                        transition={{ duration: 0.6, delay: 0.7 }}
                        className="inline-flex items-center text-white font-medium group"
                      >
                        <span className="border-b-2 border-white pb-1 transition-all group-hover:border-white/60">
                          Citește articolul
                        </span>
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
                    </div>
                  </div>
                </Link>
              </div>
            </SwiperSlide>
          )
        })}
      </Swiper>

      <style jsx global>{`
        .hero-carousel .swiper-button-next,
        .hero-carousel .swiper-button-prev {
          color: white;
          width: 48px;
          height: 48px;
          background: rgba(255, 255, 255, 0.1);
          backdrop-filter: blur(10px);
          border-radius: 50%;
          transition: all 0.3s ease;
          z-index: 20;
        }

        .hero-carousel .swiper-button-next {
          right: 24px;
        }

        .hero-carousel .swiper-button-prev {
          left: 24px;
        }

        .hero-carousel .swiper-button-next:hover,
        .hero-carousel .swiper-button-prev:hover {
          background: rgba(255, 255, 255, 0.2);
          transform: scale(1.05);
        }

        .hero-carousel .swiper-button-next::after,
        .hero-carousel .swiper-button-prev::after {
          font-size: 13px !important;
          font-weight: 600 !important;
        }

        .hero-carousel .swiper-button-next svg,
        .hero-carousel .swiper-button-prev svg {
          width: 50% !important;
          height: 50% !important;
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

          .hero-carousel .swiper-button-next {
            right: 16px;
          }

          .hero-carousel .swiper-button-prev {
            left: 16px;
          }

          .hero-carousel .swiper-button-next svg,
          .hero-carousel .swiper-button-prev svg {
            width: 45% !important;
            height: 45% !important;
          }
        }
      `}</style>
    </div>
  )
}
