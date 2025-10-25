'use client'

import React, { createContext, useContext, useEffect } from 'react'

import type { Theme, ThemeContextType } from './types'

const initialContext: ThemeContextType = {
  setTheme: () => null,
  theme: 'light', // Default to light
}

const ThemeContext = createContext(initialContext)

export const ThemeProvider = ({ children }: { children: React.ReactNode }) => {
  // Initialize with light theme
  const theme: Theme = 'light'

  useEffect(() => {
    // Set theme on client-side mount to ensure consistency
    document.documentElement.setAttribute('data-theme', theme)
  }, [])

  // Provide a no-op setTheme to maintain context compatibility
  const setTheme = () => null

  return <ThemeContext.Provider value={{ setTheme, theme }}>{children}</ThemeContext.Provider>
}

export const useTheme = (): ThemeContextType => useContext(ThemeContext)
