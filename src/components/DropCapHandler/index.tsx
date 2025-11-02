'use client'

import { useEffect } from 'react'

/**
 * Client component that handles drop cap application by counting actual paragraph elements
 * This is more reliable than CSS :nth-of-type() when content has mixed elements (headings, blocks, etc.)
 */
export const DropCapHandler: React.FC<{
  containerSelector: string
  dropCapIndex?: number
}> = ({ containerSelector, dropCapIndex }) => {
  useEffect(() => {
    if (!dropCapIndex || dropCapIndex < 1) {
      // Remove drop cap class from all paragraphs if no index specified
      const container = document.querySelector(containerSelector)
      if (container) {
        container.querySelectorAll('p.drop-cap-target').forEach((p) => {
          p.classList.remove('drop-cap-target')
        })
      }
      return
    }

    let attempts = 0
    const maxAttempts = 20 // Try for up to 2 seconds (20 * 100ms)

    const applyDropCap = () => {
      attempts++

      const container = document.querySelector(containerSelector) as HTMLElement | null
      if (!container) {
        if (attempts < maxAttempts) {
          setTimeout(applyDropCap, 100)
        }
        return
      }

      const paragraphs: HTMLParagraphElement[] = []
      const blockClassNames = [
        'block',
        'media-block',
        'banner-block',
        'code-block',
        'cta-block',
        'video-embed-block',
      ]
      const blockTags = ['blockquote', 'aside', 'header', 'footer', 'nav']

      const isBlockElement = (element: Element): boolean => {
        const classList = element.classList
        const tagName = element.tagName.toLowerCase()
        
        return (
          blockClassNames.some(className => classList.contains(className)) ||
          blockTags.includes(tagName)
        )
      }

      const isInsideBlock = (element: Element): boolean => {
        let current: Element | null = element.parentElement
        while (current && current !== container) {
          if (isBlockElement(current)) {
            return true
          }
          current = current.parentElement
        }
        return false
      }

      const allParagraphs = container.querySelectorAll('p')
      for (let i = 0; i < allParagraphs.length; i++) {
        const paragraph = allParagraphs[i] as HTMLParagraphElement
        const text = paragraph.textContent?.trim() || ''
        
        if (text.length > 0 && !isInsideBlock(paragraph)) {
          paragraphs.push(paragraph)
        }
      }

      if (paragraphs.length < dropCapIndex) {
        if (attempts < maxAttempts) {
          setTimeout(applyDropCap, 100)
        }
        return
      }

      paragraphs.forEach((p, index) => {
        p.classList.remove('drop-cap-target', 'drop-cap-reset')
        if (index === 0 && dropCapIndex !== 1) {
          p.classList.add('drop-cap-reset')
        }
      })

      const targetIndex = dropCapIndex - 1
      if (targetIndex >= 0 && targetIndex < paragraphs.length) {
        const targetParagraph = paragraphs[targetIndex]
        targetParagraph.classList.add('drop-cap-target')
      }
    }

    // Start trying
    applyDropCap()

    // Cleanup on unmount
    return () => {
      const container = document.querySelector(containerSelector)
      if (container) {
        container.querySelectorAll('p.drop-cap-target').forEach((p) => {
          p.classList.remove('drop-cap-target')
        })
      }
    }
  }, [containerSelector, dropCapIndex])

  return null
}
