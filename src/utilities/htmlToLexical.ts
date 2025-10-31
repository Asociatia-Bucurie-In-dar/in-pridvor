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

    // Handle links: unwrap into plain text to avoid validation issues
    if (tagName === 'a') {
      const children: LexicalTextNode[] = []
      node.childNodes.forEach((child) => {
        const parsed = parseHtmlNode(child, newFormat)
        parsed.forEach((item) => {
          if (item.type === 'text') {
            children.push(item as LexicalTextNode)
          }
        })
      })
      if (children.length === 0) {
        children.push({
          type: 'text',
          detail: 0,
          format: newFormat,
          mode: 'normal',
          style: '',
          text: '',
          version: 1,
        })
      }
      results.push(...children)
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

export function htmlToLexical(html: string): LexicalRootNode {
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

    // Find YouTube URLs in the HTML (also match URLs missing 'h' from https)
    const youtubePatterns = [
      /https?:\/\/(?:www\.)?youtube\.com\/watch\?.*?[&?]v=([a-zA-Z0-9_-]{11})/gi,
      /https?:\/\/(?:www\.)?youtube\.com\/watch\?v=([a-zA-Z0-9_-]{11})/gi,
      /https?:\/\/youtu\.be\/([a-zA-Z0-9_-]{11})/gi,
      /https?:\/\/(?:www\.)?youtube\.com\/embed\/([a-zA-Z0-9_-]{11})/gi,
      /ttps?:\/\/(?:www\.)?youtube\.com\/watch\?.*?[&?]v=([a-zA-Z0-9_-]{11})/gi,
      /ttps?:\/\/(?:www\.)?youtube\.com\/watch\?v=([a-zA-Z0-9_-]{11})/gi,
    ]

    for (const pattern of youtubePatterns) {
      pattern.lastIndex = 0
      let match
      while ((match = pattern.exec(html)) !== null) {
        let url = match[0]
        if (url.startsWith('ttps://')) {
          url = 'h' + url
        }

        const videoId = match[1]
        if (videoId) {
          const normalizedUrl = `https://www.youtube.com/watch?v=${videoId}`
          
          // Check if this URL is already in our list at this position
          const existingMatch = videoMatches.find(
            (m) => m.position === match.index && m.normalizedUrl === normalizedUrl,
          )
          
          if (!existingMatch) {
            videoMatches.push({
              url: match[0],
              normalizedUrl,
              position: match.index || 0,
            })
          }
        }
      }
    }

    // Find Vimeo URLs
    const vimeoPattern = /https?:\/\/(?:www\.)?vimeo\.com\/(\d+)/gi
    let vimeoMatch
    vimeoPattern.lastIndex = 0
    while ((vimeoMatch = vimeoPattern.exec(html)) !== null) {
      const url = vimeoMatch[0]
      const existingMatch = videoMatches.find(
        (m) => m.position === vimeoMatch.index && m.normalizedUrl === url,
      )
      
      if (!existingMatch) {
        videoMatches.push({
          url: vimeoMatch[0],
          normalizedUrl: url,
          position: vimeoMatch.index || 0,
        })
      }
    }

    // Sort video matches by position (order they appear in HTML)
    videoMatches.sort((a, b) => a.position - b.position)

    // Get unique normalized URLs (in case same video appears multiple times, we'll insert once)
    const uniqueNormalizedUrls = [...new Set(videoMatches.map((m) => m.normalizedUrl))]

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

    // Remove video URLs from content
    uniqueNormalizedUrls.forEach((videoUrl) => {
      const escapedUrl = videoUrl.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
      const escapedUrlAlt = videoUrl.replace(/^h/, '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

      cleanHtml = cleanHtml.replace(new RegExp(`<a[^>]*>${escapedUrl}<\/a>`, 'gi'), '')
      cleanHtml = cleanHtml.replace(new RegExp(`<a[^>]*>${escapedUrlAlt}<\/a>`, 'gi'), '')
      cleanHtml = cleanHtml.replace(new RegExp(escapedUrl, 'gi'), '')
      cleanHtml = cleanHtml.replace(new RegExp(escapedUrlAlt, 'gi'), '')
    })

    cleanHtml = cleanHtml.trim()

    // Parse HTML
    const dom = new JSDOM(cleanHtml)
    const body = dom.window.document.body

    const children: LexicalElementNode[] = []
    let currentTextPosition = 0
    let videoInsertIndex = 0

    // Create a map of positions in the cleaned HTML to track where videos should go
    // We'll approximate positions by tracking text length as we parse
    
    // First, let's parse the content and build a mapping of approximate positions
    const parseAndInsertVideos = (node: Node, textOffset: number = 0): number => {
      let textLength = 0

      if (node.nodeType === 3) {
        // Text node
        const textContent = node.textContent || ''
        textLength = textContent.length
        return textLength
      }

      if (node.nodeType === 1) {
        // Element node
        let nodeTextLength = 0
        
        // Check if we should insert a video block before this node
        // Approximate position in original HTML based on accumulated text
        const approximatePosition = currentTextPosition + textOffset

        // Check if we have a video that should be inserted around here
        // We'll check if we're near a video position (within reasonable distance)
        if (videoInsertIndex < videoMatches.length) {
          const nextVideo = videoMatches[videoInsertIndex]
          // If we've parsed enough text to be near where the video was in original HTML
          // Note: This is approximate since we're comparing original HTML position with parsed text position
          const isNearVideo = Math.abs(approximatePosition - nextVideo.position) < 100

          if (isNearVideo) {
            // Insert video block
            children.push({
              type: 'block',
              fields: {
                blockType: 'videoEmbed',
                url: nextVideo.normalizedUrl,
              },
              format: '',
              version: 2,
            } as any)
            videoInsertIndex++
          }
        }

        // Parse child nodes
        for (let i = 0; i < node.childNodes.length; i++) {
          const child = node.childNodes[i]
          const childTextLength = parseAndInsertVideos(child, nodeTextLength)
          nodeTextLength += childTextLength
        }

        // Try to parse this node using parseHtmlNode
        try {
          const parsed = parseHtmlNode(node as Element)
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
            } else if (item) {
              children.push(item as LexicalElementNode)
            }
          })
        } catch (parseError) {
          // If parseHtmlNode doesn't handle this node type, just count text
          const textContent = node.textContent || ''
          nodeTextLength = textContent.length
        }

        return nodeTextLength
      }

      return 0
    }

    // Simpler approach: Insert videos at the beginning if they were at the beginning
    // Otherwise, try to maintain relative order
    
    // Check if first video is near the beginning (< 500 chars)
    const firstVideoIsEarly = videoMatches.length > 0 && videoMatches[0].position < 500

    if (firstVideoIsEarly && videoInsertIndex < videoMatches.length) {
      children.push({
        type: 'block',
        fields: {
          blockType: 'videoEmbed',
          url: videoMatches[videoInsertIndex].normalizedUrl,
        },
        format: '',
        version: 2,
      } as any)
      videoInsertIndex++
    }

    // Process each child node
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
          } else if (item) {
            children.push(item as LexicalElementNode)
          }
        })
      } catch (nodeError) {
        console.warn('Failed to parse HTML node:', nodeError)
      }
    })

    // Add remaining video blocks at the end (if we haven't inserted them yet)
    // But only if they weren't early videos
    while (videoInsertIndex < videoMatches.length) {
      const video = videoMatches[videoInsertIndex]
      // Skip if this was the early video we already inserted
      if (!(firstVideoIsEarly && videoInsertIndex === 0 && video.position < 500)) {
        children.push({
          type: 'block',
          fields: {
            blockType: 'videoEmbed',
            url: video.normalizedUrl,
          },
          format: '',
          version: 2,
        } as any)
      }
      videoInsertIndex++
    }

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
