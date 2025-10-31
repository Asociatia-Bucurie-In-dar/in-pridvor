'use client'

import { useEffect, useState } from 'react'
import type { User } from '@/payload-types'
import { getClientSideURL } from '@/utilities/getURL'

export const useIsAdmin = (): boolean | null => {
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null)

  useEffect(() => {
    const checkAdmin = async () => {
      try {
        const token = document.cookie
          .split('; ')
          .find((row) => row.startsWith('payload-token='))
          ?.split('=')[1]

        if (!token) {
          setIsAdmin(false)
          return
        }

        const response = await fetch(`${getClientSideURL()}/api/users/me`, {
          headers: {
            Authorization: `JWT ${token}`,
          },
        })

        if (response.ok) {
          const { user } = await response.json()
          setIsAdmin(Boolean(user?.id))
        } else {
          setIsAdmin(false)
        }
      } catch {
        setIsAdmin(false)
      }
    }

    checkAdmin()
  }, [])

  return isAdmin
}

