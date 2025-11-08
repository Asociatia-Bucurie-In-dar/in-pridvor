import type { Metadata } from 'next'

import type { Media, Page, Post, Config } from '../payload-types'

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

const getImageURL = (image?: Media | Config['db']['defaultIDType'] | null, serverUrl?: string) => {
  const base = serverUrl || getServerSideURL()
  const fallback = _resolveUrl('/website-template-OG.webp', base)

  if (!image || typeof image !== 'object' || !('url' in image)) return fallback

  const _ogUrl = image.sizes?.og?.url
  const _url = _ogUrl || image.url

  if (typeof _url !== 'string' || _url.length === 0) return fallback

  return _resolveUrl(_url, base)
}

export const generateMeta = async (args: {
  doc: Partial<Page> | Partial<Post> | null
  path?: string
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

  const ogImage = getImageURL(doc?.meta?.image, serverUrl)

  const title = doc?.meta?.title ? doc?.meta?.title + ' | ' + websiteTitle : websiteTitle

  return {
    alternates: {
      canonical,
    },
    description,
    openGraph: mergeOpenGraph({
      ...(description ? { description } : {}),
      images: ogImage
        ? [
            {
              url: ogImage,
            },
          ]
        : undefined,
      title,
      url: canonical,
    }),
    title,
    twitter: {
      card: 'summary_large_image',
      ...(description ? { description } : {}),
      images: ogImage ? [ogImage] : undefined,
      title,
    },
  }
}
