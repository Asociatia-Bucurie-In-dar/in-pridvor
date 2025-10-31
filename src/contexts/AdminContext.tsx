'use client'

import React, { createContext, useContext, useState, ReactNode } from 'react'
import type { PayloadMeUser } from 'payload-admin-bar'

interface AdminContextType {
  isAdmin: boolean
  setUser: (user: PayloadMeUser | null) => void
}

const AdminContext = createContext<AdminContextType>({
  isAdmin: false,
  setUser: () => {},
})

export const useAdmin = () => useContext(AdminContext)

export const AdminProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [isAdmin, setIsAdmin] = useState(false)

  const setUser = (user: PayloadMeUser | null) => {
    setIsAdmin(Boolean(user?.id))
  }

  return <AdminContext.Provider value={{ isAdmin, setUser }}>{children}</AdminContext.Provider>
}

