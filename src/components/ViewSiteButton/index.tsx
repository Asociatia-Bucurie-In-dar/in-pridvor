'use client'

import React, { useEffect } from 'react'
import { getClientSideURL } from '@/utilities/getURL'
import './index.scss'

const VIEW_SITE_BUTTON_ID = 'payload-view-site-button'

const injectButton = () => {
  if (document.getElementById(VIEW_SITE_BUTTON_ID)) {
    return
  }

  const siteURL = getClientSideURL()
  
  const headerSelectors = [
    'header[class*="template"]',
    'header',
    '[class*="header"]',
    '[data-payload-header]',
  ]

  let header: Element | null = null
  for (const selector of headerSelectors) {
    header = document.querySelector(selector)
    if (header) break
  }

  if (!header) {
    return false
  }

  const nav = header.querySelector('nav') || 
              header.querySelector('[class*="nav"]') ||
              header.querySelector('[class*="controls"]')

  const targetContainer = nav || header

  const button = document.createElement('a')
  button.id = VIEW_SITE_BUTTON_ID
  button.href = siteURL
  button.target = '_blank'
  button.rel = 'noopener noreferrer'
  button.className = 'view-site-button'
  button.innerHTML = `
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M8 1L1 4V7C1 10.55 3.36 13.74 6.5 14.5C7.38 14.19 8.18 13.72 8.88 13.13L7.5 11.75C7.09 12.08 6.55 12.25 6 12.25C4.48 12.25 3.25 11.02 3.25 9.5C3.25 7.98 4.48 6.75 6 6.75C7.52 6.75 8.75 7.98 8.75 9.5C8.75 10.05 8.58 10.59 8.25 11H9.63C10.22 10.3 10.69 9.5 11 8.62C12.26 7.74 13 6.42 13 5V4L8 1ZM6 8.25C5.59 8.25 5.25 8.59 5.25 9C5.25 9.41 5.59 9.75 6 9.75C6.41 9.75 6.75 9.41 6.75 9C6.75 8.59 6.41 8.25 6 8.25ZM14.5 8.5L11.5 11.5L10 10L9 11L11.5 13.5L15.5 9.5L14.5 8.5Z" fill="currentColor"/>
    </svg>
    <span>View Site</span>
  `

  const userMenu = targetContainer.querySelector('[class*="user"]') || 
                  targetContainer.querySelector('[class*="account"]') ||
                  targetContainer.querySelector('button[class*="user"]')
  
  if (userMenu && userMenu.parentElement) {
    userMenu.parentElement.insertBefore(button, userMenu)
  } else {
    targetContainer.appendChild(button)
  }

  return true
}

export const ViewSiteButton: React.FC = () => {
  useEffect(() => {
    if (typeof window === 'undefined') return

    const tryInject = () => {
      if (injectButton()) {
        return true
      }
      return false
    }

    if (tryInject()) {
      return
    }

    const observer = new MutationObserver(() => {
      tryInject()
    })

    observer.observe(document.body, {
      childList: true,
      subtree: true,
    })

    const checkInterval = setInterval(() => {
      if (tryInject()) {
        clearInterval(checkInterval)
      }
    }, 100)

    const timeout = setTimeout(() => {
      clearInterval(checkInterval)
      observer.disconnect()
    }, 10000)

    return () => {
      clearInterval(checkInterval)
      clearTimeout(timeout)
      observer.disconnect()
    }
  }, [])

  return null
}

export default ViewSiteButton

