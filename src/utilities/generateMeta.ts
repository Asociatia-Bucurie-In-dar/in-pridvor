import type { Metadata } from 'next'

import type { Media, Page, Post } from '../payload-types'

import { mergeOpenGraph } from './mergeOpenGraph'
import { getServerSideURL } from './getURL'
import { websiteTitle as websiteTitle } from './commonInfo'

const _stripTrailingSlash = (value: string) => {
  if (!value || value.length === 0) return ''
  return value.endsWith('/') ? value.slice(0, -1) : value
}

const _ensureLeadingSlash = (value: string) => {
  if (!value || value.length === 0) return ''
  return value.startsWith('/') ? value : `/${value}`
}

const _isAbsolute = (value: string) => {
  return value.startsWith('http://') || value.startsWith('https://')
}

const _resolveUrl = (value: string, baseUrl: string) => {
  if (_isAbsolute(value)) return value
  const _base = _stripTrailingSlash(baseUrl)
  const _path = _ensureLeadingSlash(value)
  return `${_base}${_path}`
}

const _derivePath = (doc?: Partial<Page> | Partial<Post> | null) => {
  if (!doc) return '/'
  const slug = doc.slug
  if (Array.isArray(slug)) return _ensureLeadingSlash(slug.join('/'))
  if (typeof slug === 'string' && slug.length > 0) return _ensureLeadingSlash(slug)
  return '/'
}

const _isMedia = (value: unknown): value is Media => {
  return !!value && typeof value === 'object' && 'url' in (value as Record<string, unknown>)
}

const _selectMedia = (doc?: Partial<Page> | Partial<Post> | null): Media | null => {
  if (!doc) return null

  const _postDoc = doc as Partial<Post>
  const _pageDoc = doc as Partial<Page>

  const _rawMetaImage = _postDoc?.meta?.image
  if (_isMedia(_rawMetaImage)) return _rawMetaImage

  const _rawHeroImage = _postDoc?.heroImage
  if (_isMedia(_rawHeroImage)) return _rawHeroImage

  const _rawHeroGroupImage = _pageDoc?.hero?.media
  if (_isMedia(_rawHeroGroupImage)) return _rawHeroGroupImage

  return null
}

const _resolveImageMeta = (media: Media | null, serverUrl: string) => {
  const _fallbackUrl = _resolveUrl('/logo-in-pridvor-1.jpg', serverUrl)

  if (!media) {
    return {
      alt: undefined,
      height: undefined,
      url: _fallbackUrl,
      width: undefined,
    }
  }

  const _ogSize = media.sizes?.og
  const _selectedUrl = _ogSize?.url || media.url || _fallbackUrl
  const _url = _resolveUrl(_selectedUrl, serverUrl)
  const _alt =
    typeof media.alt === 'string' && media.alt.trim().length > 0 ? media.alt.trim() : undefined

  return {
    alt: _alt,
    height: _ogSize?.height || media.height || undefined,
    url: _url,
    width: _ogSize?.width || media.width || undefined,
  }
}

export const generateMeta = async (args: {
  doc: Partial<Page> | Partial<Post> | null
  path?: string
  ogType?: string
}): Promise<Metadata> => {
  const { doc } = args
  const serverUrl = getServerSideURL()
  const path = args.path && args.path.length > 0 ? args.path : _derivePath(doc)
  const canonical = _resolveUrl(path, serverUrl)
  const descriptionValue =
    doc?.meta && 'description' in doc.meta
      ? (doc.meta.description as string | undefined)
      : undefined
  const description =
    typeof descriptionValue === 'string' && descriptionValue.trim().length > 0
      ? descriptionValue.trim()
      : undefined

  const _media = _selectMedia(doc)
  const _imageMeta = _resolveImageMeta(_media, serverUrl)
  const title = doc?.meta?.title ? doc?.meta?.title + ' | ' + websiteTitle : websiteTitle
  const _publishedAt =
    doc && 'publishedAt' in doc && doc.publishedAt ? new Date(doc.publishedAt) : undefined
  const _ogType = args.ogType || (doc && 'content' in doc ? 'article' : undefined)

  return {
    alternates: {
      canonical,
    },
    description,
    openGraph: mergeOpenGraph({
      ...(description ? { description } : {}),
      ...(typeof _ogType === 'string' ? { type: _ogType } : {}),
      ...(typeof _publishedAt !== 'undefined' && !Number.isNaN(_publishedAt.valueOf())
        ? { publishedTime: _publishedAt.toISOString() }
        : {}),
      images: [
        {
          alt: _imageMeta.alt,
          height: _imageMeta.height,
          url: _imageMeta.url,
          width: _imageMeta.width,
        },
      ],
      title,
      url: canonical,
    }),
    title,
    twitter: {
      card: 'summary_large_image',
      ...(description ? { description } : {}),
      images: [
        {
          alt: _imageMeta.alt,
          url: _imageMeta.url,
        },
      ],
      title,
    },
  }
}
