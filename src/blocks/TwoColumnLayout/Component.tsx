import React from 'react'

import type { TwoColumnLayoutBlock as TwoColumnLayoutBlockProps } from '@/payload-types'

import { cn } from '@/utilities/ui'

export const TwoColumnLayoutBlock: React.FC<
  TwoColumnLayoutBlockProps & {
    disableInnerContainer?: boolean
  }
> = async (props) => {
  const { main, sidebar, disableInnerContainer } = props

  const { RenderBlocks } = await import('@/blocks/RenderBlocks')

  const hasSidebar = Array.isArray(sidebar) && sidebar.length > 0

  return (
    <section className={cn('my-16', disableInnerContainer ? undefined : 'container')}>
      <div className="grid gap-12 lg:grid-cols-[minmax(0,1fr)_340px] xl:grid-cols-[minmax(0,1fr)_360px]">
        <div className="min-w-0 space-y-16">
          <RenderBlocks blocks={(main as any[]) || []} disableInnerContainer />
        </div>
        {hasSidebar && (
          <aside className="min-w-0">
            <div className="flex flex-col gap-8 lg:sticky lg:top-24">
              <RenderBlocks blocks={(sidebar as any[]) || []} disableInnerContainer />
            </div>
          </aside>
        )}
      </div>
    </section>
  )
}

