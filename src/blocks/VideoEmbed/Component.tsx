import React from 'react'

export type VideoEmbedBlockProps = {
  url: string
  caption?: string
}

function getYouTubeEmbedUrl(url: string): string | null {
  // Extract YouTube video ID from various URL formats including Shorts
  const patterns = [
    /youtube\.com\/shorts\/([a-zA-Z0-9_-]{11})/, // Shorts URLs
    /youtube\.com\/watch\?.*?[&?]v=([a-zA-Z0-9_-]{11})/, // Handles query params before v=
    /youtube\.com\/watch\?v=([a-zA-Z0-9_-]{11})/, // Direct v= after watch?
    /youtu\.be\/([a-zA-Z0-9_-]{11})/, // Short URLs
    /youtube\.com\/embed\/([a-zA-Z0-9_-]{11})/, // Embed URLs
  ]

  for (const pattern of patterns) {
    const match = url.match(pattern)
    if (match && match[1]) {
      // Use youtube-nocookie.com for privacy-enhanced mode
      return `https://www.youtube-nocookie.com/embed/${match[1]}`
    }
  }

  return null
}

function getVimeoEmbedUrl(url: string): string | null {
  // Extract Vimeo video ID
  const match = url.match(/vimeo\.com\/(\d+)/)
  if (match && match[1]) {
    return `https://player.vimeo.com/video/${match[1]}`
  }
  return null
}

export const VideoEmbedBlock: React.FC<VideoEmbedBlockProps> = ({ url, caption }) => {
  let embedUrl: string | null = null
  let platform = 'unknown'
  const isShorts = url.includes('/shorts/')

  // Detect platform and get embed URL
  if (url.includes('youtube.com') || url.includes('youtu.be')) {
    embedUrl = getYouTubeEmbedUrl(url)
    platform = 'youtube'
  } else if (url.includes('vimeo.com')) {
    embedUrl = getVimeoEmbedUrl(url)
    platform = 'vimeo'
  }

  if (!embedUrl) {
    return (
      <div className="my-8 rounded-lg border border-red-200 bg-red-50 p-6 text-center">
        <p className="text-sm text-red-800">Unable to embed video. Please check the URL format.</p>
        <p className="mt-2 text-xs text-red-600">{url}</p>
      </div>
    )
  }

  // Portrait aspect ratio for Shorts (9:16), landscape for regular videos (16:9)
  const aspectRatio = isShorts ? '177.78%' : '56.25%'
  const maxWidth = isShorts ? '100%' : '100%'

  return (
    <div className="my-8">
      <div
        className="relative overflow-hidden rounded-lg mx-auto"
        style={{ paddingBottom: aspectRatio, maxWidth }}
      >
        <iframe
          src={embedUrl}
          className="absolute left-0 top-0 h-full w-full"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
          title={caption || 'Embedded video'}
          style={{ border: 0 }}
        />
      </div>
      {caption && <p className="mt-2 text-center text-sm italic text-gray-600">{caption}</p>}
    </div>
  )
}
