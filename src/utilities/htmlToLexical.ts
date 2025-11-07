import { JSDOM } from 'jsdom'

interface LexicalTextNode {
  type: 'text'
  detail: number
  format: number
  mode: string
  style: string
  text: string
  version: number
}

interface LexicalElementNode {
  type: string
  children: (LexicalTextNode | LexicalElementNode)[]
  direction?: 'ltr' | 'rtl' | null
  format?: '' | 'left' | 'start' | 'center' | 'right' | 'end' | 'justify' | number
  indent?: number
  version: number
  tag?: string
  [key: string]: any
}

interface LexicalRootNode {
  [key: string]: unknown
  root: {
    type: 'root'
    children: LexicalElementNode[]
    direction: 'ltr' | 'rtl' | null
    format: '' | 'left' | 'start' | 'center' | 'right' | 'end' | 'justify'
    indent: number
    version: number
  }
}

const FORMAT_BOLD = 1
const FORMAT_ITALIC = 2
const FORMAT_UNDERLINE = 8

function parseHtmlNode(node: Node, format = 0): (LexicalTextNode | LexicalElementNode)[] {
  const results: (LexicalTextNode | LexicalElementNode)[] = []

  if (node.nodeType === 3) {
    // Text node
    const text = node.textContent || ''
    if (text.trim()) {
      results.push({
        type: 'text',
        detail: 0,
        format,
        mode: 'normal',
        style: '',
        text,
        version: 1,
      })
    }
    return results
  }

  if (node.nodeType === 1) {
    // Element node
    const element = node as Element
    const tagName = element.tagName.toLowerCase()

    let newFormat = format

    // Handle formatting tags
    if (tagName === 'strong' || tagName === 'b') {
      newFormat |= FORMAT_BOLD
    }
    if (tagName === 'em' || tagName === 'i') {
      newFormat |= FORMAT_ITALIC
    }
    if (tagName === 'u') {
      newFormat |= FORMAT_UNDERLINE
    }

    // Handle block-level elements
    if (tagName === 'p') {
      const children: (LexicalTextNode | LexicalElementNode)[] = []
      node.childNodes.forEach((child) => {
        children.push(...parseHtmlNode(child, newFormat))
      })

      if (children.length === 0) {
        children.push({
          type: 'text',
          detail: 0,
          format: 0,
          mode: 'normal',
          style: '',
          text: '',
          version: 1,
        })
      }

      results.push({
        type: 'paragraph',
        children,
        direction: 'ltr',
        format: '',
        indent: 0,
        textFormat: 0,
        version: 1,
      })
      return results
    }

    // Handle headings
    if (['h1', 'h2', 'h3', 'h4', 'h5', 'h6'].includes(tagName)) {
      const children: (LexicalTextNode | LexicalElementNode)[] = []
      node.childNodes.forEach((child) => {
        children.push(...parseHtmlNode(child, newFormat))
      })

      results.push({
        type: 'heading',
        children,
        direction: 'ltr',
        format: '',
        indent: 0,
        tag: tagName,
        version: 1,
      })
      return results
    }

    // Handle line breaks: ignore and let surrounding paragraphs handle flow
    if (tagName === 'br') {
      return results
    }

    // Handle images (skip them - they should be handled separately via media uploads)
    if (tagName === 'img') {
      // Optionally, we could add the alt text as a text node
      // For now, just skip images
      return results
    }

    // Handle horizontal rules: skip for minimal compatibility
    if (tagName === 'hr') {
      return results
    }

    // Handle other self-closing or void elements
    if (['input', 'meta'].includes(tagName)) {
      return results
    }

    // Handle lists
    if (tagName === 'ul' || tagName === 'ol') {
      const listItems: LexicalElementNode[] = []
      element.querySelectorAll(':scope > li').forEach((li) => {
        const children: (LexicalTextNode | LexicalElementNode)[] = []
        li.childNodes.forEach((child) => {
          children.push(...parseHtmlNode(child, newFormat))
        })

        if (children.length === 0) {
          children.push({
            type: 'text',
            detail: 0,
            format: 0,
            mode: 'normal',
            style: '',
            text: '',
            version: 1,
          })
        }

        listItems.push({
          type: 'listitem',
          children,
          direction: 'ltr',
          format: '',
          indent: 0,
          version: 1,
          value: 1,
        })
      })

      results.push({
        type: 'list',
        children: listItems,
        direction: 'ltr',
        format: '',
        indent: 0,
        listType: tagName === 'ul' ? 'bullet' : 'number',
        start: 1,
        tag: tagName,
        version: 1,
      })
      return results
    }

    // Handle links: convert to Lexical link nodes
    if (tagName === 'a') {
      const href = element.getAttribute('href') || ''
      const target = element.getAttribute('target')
      const newTab = target === '_blank'
      
      const linkChildren: LexicalTextNode[] = []
      node.childNodes.forEach((child) => {
        const parsed = parseHtmlNode(child, newFormat)
        parsed.forEach((item) => {
          if (item.type === 'text') {
            linkChildren.push(item as LexicalTextNode)
          }
        })
      })
      
      if (linkChildren.length === 0) {
        linkChildren.push({
          type: 'text',
          detail: 0,
          format: newFormat,
          mode: 'normal',
          style: '',
          text: href,
          version: 1,
        })
      }
      
      if (href) {
        results.push({
          type: 'link',
          children: linkChildren,
          direction: 'ltr',
          fields: {
            linkType: 'custom',
            url: href,
            newTab: newTab || undefined,
          },
          format: '',
          indent: 0,
          version: 3,
        } as any)
      } else {
        results.push(...linkChildren)
      }
      return results
    }

    // Handle divs and other containers
    if (['div', 'span', 'article', 'section'].includes(tagName)) {
      node.childNodes.forEach((child) => {
        results.push(...parseHtmlNode(child, newFormat))
      })
      return results
    }

    // Default: process children with current format
    node.childNodes.forEach((child) => {
      results.push(...parseHtmlNode(child, newFormat))
    })
  }

  return results
}

export function htmlToLexical(
  html: string,
  imageMediaMap?: Map<string, number>,
): LexicalRootNode {
  // Validate input
  if (!html || typeof html !== 'string') {
    return {
      root: {
        type: 'root',
        children: [
          {
            type: 'paragraph',
            children: [
              {
                type: 'text',
                detail: 0,
                format: 0,
                mode: 'normal',
                style: '',
                text: '',
                version: 1,
              },
            ],
            direction: 'ltr',
            format: '',
            indent: 0,
            version: 1,
          },
        ],
        direction: 'ltr',
        format: '',
        indent: 0,
        version: 1,
      },
    }
  }

  try {
    // Extract video URLs with their positions before cleaning
    interface VideoMatch {
      url: string
      normalizedUrl: string
      position: number
    }

    const videoMatches: VideoMatch[] = []

    // Find YouTube URLs in the HTML (including Shorts)
    const youtubePatterns = [
      /https?:\/\/(?:www\.)?youtube\.com\/watch\?.*?[&?]v=([a-zA-Z0-9_-]{11})/gi,
      /https?:\/\/(?:www\.)?youtube\.com\/watch\?v=([a-zA-Z0-9_-]{11})/gi,
      /https?:\/\/youtu\.be\/([a-zA-Z0-9_-]{11})/gi,
      /https?:\/\/(?:www\.)?youtube\.com\/embed\/([a-zA-Z0-9_-]{11})/gi,
      /https?:\/\/(?:www\.)?youtube\.com\/shorts\/([a-zA-Z0-9_-]{11})/gi,
      /ttps?:\/\/(?:www\.)?youtube\.com\/watch\?.*?[&?]v=([a-zA-Z0-9_-]{11})/gi,
      /ttps?:\/\/(?:www\.)?youtube\.com\/watch\?v=([a-zA-Z0-9_-]{11})/gi,
    ]

    for (const pattern of youtubePatterns) {
      pattern.lastIndex = 0
      let match: RegExpExecArray | null
      while ((match = pattern.exec(html)) !== null) {
        // Extract the full URL including any parameters (like &t=6s)
        // We need to capture the URL up to the next space or HTML tag
        const matchStart = match.index || 0
        const urlMatch = html.substring(matchStart)

        // Find where the URL ends (space, newline, quote, bracket, or HTML tag)
        const urlEndMatch = urlMatch.match(/[\s<>"']/)
        const fullUrl =
          urlEndMatch && urlEndMatch.index !== undefined
            ? urlMatch.substring(0, urlEndMatch.index)
            : urlMatch.split(/[\s<>"']/)[0] || match[0]

        if (!fullUrl) continue

        let url = fullUrl
        if (url.startsWith('ttps://')) {
          url = 'h' + url
        }

        const videoId = match[1]
        const isShorts = url.includes('/shorts/')
        if (videoId && match.index !== undefined) {
          try {
            // Normalize to standard watch URL format (preserve Shorts as shorts URL)
            const urlObj = new URL(url.startsWith('http') ? url : `https://${url}`)
            const normalizedUrl = isShorts
              ? `https://www.youtube.com/shorts/${videoId}`
              : `https://www.youtube.com/watch?v=${videoId}${urlObj.search.replace(/^\?/, '&').replace(/^&/, '?')}`

            // Check if this URL is already in our list at this position
            const existingMatch = videoMatches.find(
              (m) => m.position === match!.index && m.normalizedUrl === normalizedUrl,
            )

            if (!existingMatch) {
              videoMatches.push({
                url: fullUrl, // Store full URL for removal
                normalizedUrl,
                position: match.index,
              })
            }
          } catch (urlError) {
            // If URL parsing fails, use basic normalized URL
            const isShorts = url.includes('/shorts/')
            const normalizedUrl = isShorts
              ? `https://www.youtube.com/shorts/${videoId}`
              : `https://www.youtube.com/watch?v=${videoId}`
            const existingMatch = videoMatches.find(
              (m) => m.position === match!.index && m.normalizedUrl === normalizedUrl,
            )

            if (!existingMatch) {
              videoMatches.push({
                url: fullUrl,
                normalizedUrl,
                position: match.index,
              })
            }
          }
        }
      }
    }

    // Find Vimeo URLs
    const vimeoPattern = /https?:\/\/(?:www\.)?vimeo\.com\/(\d+)/gi
    vimeoPattern.lastIndex = 0
    let vimeoMatch: RegExpExecArray | null
    while ((vimeoMatch = vimeoPattern.exec(html)) !== null) {
      // Extract the full URL including any parameters
      const matchStart = vimeoMatch.index || 0
      const urlMatch = html.substring(matchStart)

      // Find where the URL ends
      const urlEndMatch = urlMatch.match(/[\s<>"']/)
      const fullUrl =
        urlEndMatch && urlEndMatch.index !== undefined
          ? urlMatch.substring(0, urlEndMatch.index)
          : urlMatch.split(/[\s<>"']/)[0] || vimeoMatch[0]

      if (!fullUrl || vimeoMatch.index === undefined) continue

      const existingMatch = videoMatches.find(
        (m) => m.position === vimeoMatch!.index && m.normalizedUrl === fullUrl,
      )

      if (!existingMatch) {
        videoMatches.push({
          url: fullUrl, // Store full URL for removal
          normalizedUrl: fullUrl,
          position: vimeoMatch.index,
        })
      }
    }

    // Sort video matches by position (order they appear in HTML)
    videoMatches.sort((a, b) => a.position - b.position)

    // Track which videos we've already processed to avoid duplicates
    const processedVideoUrls = new Set<string>()
    const earlyVideos: string[] = []
    const laterVideos: string[] = []

    videoMatches.forEach((match) => {
      // Skip if we've already processed this video URL
      if (processedVideoUrls.has(match.normalizedUrl)) {
        return
      }
      
      processedVideoUrls.add(match.normalizedUrl)
      
      // If video is found within first 500 characters, treat it as "early"
      if (match.position < 500) {
        earlyVideos.push(match.normalizedUrl)
      } else {
        laterVideos.push(match.normalizedUrl)
      }
    })

    // Extract images before cleaning HTML
    const imageMatches: Array<{ src: string; alt: string; position: number }> = []
    const imgRegex = /<img[^>]+src=["']([^"']+)["'][^>]*(?:alt=["']([^"']*)["'])?[^>]*>/gi
    let imgMatch: RegExpExecArray | null
    while ((imgMatch = imgRegex.exec(html)) !== null) {
      const src = imgMatch[1]
      const alt = imgMatch[2] || ''
      if (src && imgMatch.index !== undefined) {
        imageMatches.push({ src, alt, position: imgMatch.index })
      }
    }

    // Clean up the HTML and remove video URLs from text
    let cleanHtml = html
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
      .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '')
      .replace(/<!--\s*wp:[^>]*-->/gi, '')
      .replace(/<!--\s*\/wp:[^>]*-->/gi, '')
      .replace(/<iframe[^>]*>.*?<\/iframe>/gi, '')
      .replace(/<figure[^>]*>/gi, '<div>')
      .replace(/<\/figure>/gi, '</div>')
      .replace(/<figcaption[^>]*>.*?<\/figcaption>/gi, '')
      .replace(/<p>\s*<\/p>/gi, '')

    // Remove img tags (they'll be converted to Media blocks)
    cleanHtml = cleanHtml.replace(/<img[^>]*>/gi, '')

    // Remove video URLs from content - use the original full URLs including parameters
    videoMatches.forEach((videoMatch) => {
      // Escape special regex characters in the original URL (including parameters like &t=6s)
      const escapedUrl = videoMatch.url.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
      const escapedUrlAlt = videoMatch.url.replace(/^h/, '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

      // Also escape the normalized URL (without params) for removal
      const escapedNormalized = videoMatch.normalizedUrl.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
      const escapedNormalizedAlt = videoMatch.normalizedUrl
        .replace(/^h/, '')
        .replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

      // Remove from links
      cleanHtml = cleanHtml.replace(new RegExp(`<a[^>]*>${escapedUrl}<\/a>`, 'gi'), '')
      cleanHtml = cleanHtml.replace(new RegExp(`<a[^>]*>${escapedUrlAlt}<\/a>`, 'gi'), '')
      cleanHtml = cleanHtml.replace(new RegExp(`<a[^>]*>${escapedNormalized}<\/a>`, 'gi'), '')
      cleanHtml = cleanHtml.replace(new RegExp(`<a[^>]*>${escapedNormalizedAlt}<\/a>`, 'gi'), '')

      // Remove from plain text (full URL with params)
      cleanHtml = cleanHtml.replace(new RegExp(escapedUrl, 'gi'), '')
      cleanHtml = cleanHtml.replace(new RegExp(escapedUrlAlt, 'gi'), '')

      // Also remove normalized URL (in case params were stripped elsewhere)
      cleanHtml = cleanHtml.replace(new RegExp(escapedNormalized, 'gi'), '')
      cleanHtml = cleanHtml.replace(new RegExp(escapedNormalizedAlt, 'gi'), '')

      // Remove common YouTube URL parameters that might be left behind
      cleanHtml = cleanHtml.replace(/&t=\d+[smh]?/gi, '')
      cleanHtml = cleanHtml.replace(/&amp;t=\d+[smh]?/gi, '')
      cleanHtml = cleanHtml.replace(/&start=\d+/gi, '')
      cleanHtml = cleanHtml.replace(/&amp;start=\d+/gi, '')
    })

    cleanHtml = cleanHtml.trim()

    // Parse HTML
    const dom = new JSDOM(cleanHtml)
    const body = dom.window.document.body

    const children: LexicalElementNode[] = []

    // Track all inserted videos to prevent duplicates
    const insertedVideoUrls = new Set<string>()

    // Insert early videos at the beginning
    earlyVideos.forEach((videoUrl) => {
      if (!insertedVideoUrls.has(videoUrl)) {
        const isShorts = videoUrl.includes('/shorts/')
        children.push({
          type: 'block',
          fields: {
            blockType: 'videoEmbed',
            url: videoUrl,
            isShorts: isShorts || undefined,
          },
          format: '',
          version: 2,
        } as any)
        insertedVideoUrls.add(videoUrl)
      }
    })

    // Sort images by position to maintain order
    imageMatches.sort((a, b) => a.position - b.position)
    
    // Process images - insert them as blocks between content blocks
    const imageBlocks: LexicalElementNode[] = []
    for (const imageMatch of imageMatches) {
      const mediaId = imageMediaMap?.get(imageMatch.src)
      if (mediaId) {
        imageBlocks.push({
          type: 'block',
          fields: {
            blockType: 'mediaBlock',
            media: mediaId,
          },
          format: '',
          version: 2,
        } as any)
      }
    }

    // Process each child node (content) and insert images between paragraphs
    let imageBlockIndex = 0
    
    body.childNodes.forEach((node) => {
      try {
        const parsed = parseHtmlNode(node)
        parsed.forEach((item) => {
          if (item && item.type === 'text') {
            children.push({
              type: 'paragraph',
              children: [item as LexicalTextNode],
              direction: 'ltr',
              format: '',
              indent: 0,
              textFormat: 0,
              version: 1,
            })
            
            // Insert image after paragraph if available
            if (imageBlockIndex < imageBlocks.length) {
              const nextImageBlock = imageBlocks[imageBlockIndex]
              if (nextImageBlock) {
                children.push(nextImageBlock)
                imageBlockIndex++
              }
            }
          } else if (item) {
            children.push(item as LexicalElementNode)
            
            // Insert image after block elements (paragraphs, headings) if available
            if (imageBlockIndex < imageBlocks.length && (item.type === 'paragraph' || item.type === 'heading')) {
              const nextImageBlock = imageBlocks[imageBlockIndex]
              if (nextImageBlock) {
                children.push(nextImageBlock)
                imageBlockIndex++
              }
            }
          }
        })
      } catch (nodeError) {
        console.warn('Failed to parse HTML node:', nodeError)
      }
    })

    // Insert remaining images at the end
    while (imageBlockIndex < imageBlocks.length) {
      const nextImageBlock = imageBlocks[imageBlockIndex]
      if (!nextImageBlock) break
      children.push(nextImageBlock)
      imageBlockIndex++
    }

    // Add remaining video blocks at the end (videos that were not early)
    // Only add videos that haven't been inserted yet
    laterVideos.forEach((videoUrl) => {
      if (!insertedVideoUrls.has(videoUrl)) {
        const isShorts = videoUrl.includes('/shorts/')
        children.push({
          type: 'block',
          fields: {
            blockType: 'videoEmbed',
            url: videoUrl,
            isShorts: isShorts || undefined,
          },
          format: '',
          version: 2,
        } as any)
        insertedVideoUrls.add(videoUrl)
      }
    })

    // If no children, add an empty paragraph
    if (children.length === 0) {
      children.push({
        type: 'paragraph',
        children: [
          {
            type: 'text',
            detail: 0,
            format: 0,
            mode: 'normal',
            style: '',
            text: '',
            version: 1,
          },
        ],
        direction: 'ltr',
        format: '',
        indent: 0,
        textFormat: 0,
        version: 1,
      })
    }

    return {
      root: {
        type: 'root',
        children,
        direction: 'ltr',
        format: '',
        indent: 0,
        version: 1,
      },
    }
  } catch (error) {
    // Fallback to empty paragraph on any error
    console.error('HTML to Lexical conversion failed:', error)
    return {
      root: {
        type: 'root',
        children: [
          {
            type: 'paragraph',
            children: [
              {
                type: 'text',
                detail: 0,
                format: 0,
                mode: 'normal',
                style: '',
                text: '',
                version: 1,
              },
            ],
            direction: 'ltr',
            format: '',
            indent: 0,
            textFormat: 0,
            version: 1,
          },
        ],
        direction: 'ltr',
        format: '',
        indent: 0,
        version: 1,
      },
    }
  }
}
