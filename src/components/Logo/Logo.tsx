import clsx from 'clsx'
import React from 'react'
import Image from 'next/image'

interface Props {
  className?: string
  loading?: 'lazy' | 'eager'
  priority?: 'auto' | 'high' | 'low'
  width?: number
  height?: number
}

export const Logo = (props: Props) => {
  const { loading: loadingFromProps, priority: priorityFromProps, className } = props
  const width = props.width || 193
  const height = props.height || 34

  const loading = loadingFromProps || 'lazy'
  const priority = priorityFromProps || 'low'

  return (
    <Image
      alt="Logo"
      width={width}
      height={height}
      loading={loading}
      fetchPriority={priority}
      decoding="async"
      src="/logo-in-pridvor-1.jpg"
    />
  )
}
