import type { TitleBarBlock as TitleBarBlockProps } from '@/payload-types'

import React from 'react'

import { TitleBar } from '@/components/TitleBar'

export const TitleBarBlock: React.FC<TitleBarBlockProps> = ({ prefix, title }) => {
  return <TitleBar prefix={prefix || undefined} title={title} />
}
