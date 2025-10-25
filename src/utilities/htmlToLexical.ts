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
    // Extract video URLs before cleaning
    const videoUrls: string[] = []

    // Find YouTube URLs in the HTML
    const youtubePatterns = [
      /https?:\/\/(?:www\.)?youtube\.com\/watch\?v=([a-zA-Z0-9_-]{11})/g,
      /https?:\/\/youtu\.be\/([a-zA-Z0-9_-]{11})/g,
      /https?:\/\/(?:www\.)?youtube\.com\/embed\/([a-zA-Z0-9_-]{11})/g,
    ]

    for (const pattern of youtubePatterns) {
      const matches = html.matchAll(pattern)
      for (const match of matches) {
        videoUrls.push(match[0])
      }
    }

    // Find Vimeo URLs
    const vimeoPattern = /https?:\/\/(?:www\.)?vimeo\.com\/(\d+)/g
    const vimeoMatches = html.matchAll(vimeoPattern)
    for (const match of vimeoMatches) {
      videoUrls.push(match[0])
    }

    // Clean up the HTML
    const cleanHtml = html
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
      .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '')
      // Remove WordPress block comments (including embeds)
      .replace(/<!--\s*wp:[^>]*-->/gi, '')
      .replace(/<!--\s*\/wp:[^>]*-->/gi, '')
      // Remove iframe embeds (we'll add them back as blocks)
      .replace(/<iframe[^>]*>.*?<\/iframe>/gi, '')
      // Remove figure captions and convert figures to divs
      .replace(/<figure[^>]*>/gi, '<div>')
      .replace(/<\/figure>/gi, '</div>')
      .replace(/<figcaption[^>]*>.*?<\/figcaption>/gi, '')
      // Remove empty paragraphs
      .replace(/<p>\s*<\/p>/gi, '')
      .trim()

    // Parse HTML
    const dom = new JSDOM(cleanHtml)
    const body = dom.window.document.body

    const children: LexicalElementNode[] = []

    // Process each child node
    body.childNodes.forEach((node) => {
      try {
        const parsed = parseHtmlNode(node)
        parsed.forEach((item) => {
          if (item && item.type === 'text') {
            // Wrap orphan text nodes in paragraphs
            children.push({
              type: 'paragraph',
              children: [item as LexicalTextNode],
              direction: 'ltr',
              format: '',
              indent: 0,
              version: 1,
            })
          } else if (item) {
            children.push(item as LexicalElementNode)
          }
        })
      } catch (nodeError) {
        // Skip problematic nodes
        console.warn('Failed to parse HTML node:', nodeError)
      }
    })

    // TODO: Add video embed blocks properly
    // For now, add video URLs as paragraphs with links
    videoUrls.forEach((videoUrl) => {
      children.push({
        type: 'paragraph',
        children: [
          {
            type: 'text',
            detail: 0,
            format: 0,
            mode: 'normal',
            style: '',
            text: `🎬 Video: ${videoUrl}`,
            version: 1,
          },
        ],
        direction: 'ltr',
        format: '',
        indent: 0,
        version: 1,
      })
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
