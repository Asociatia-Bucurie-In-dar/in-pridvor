import React, { Fragment } from 'react'

import { ArchiveBlock } from '@/blocks/ArchiveBlock/Component'
import { CallToActionBlock } from '@/blocks/CallToAction/Component'
import { ContentBlock } from '@/blocks/Content/Component'
import { FormBlock } from '@/blocks/Form/Component'
import { MediaBlock } from '@/blocks/MediaBlock/Component'
import { HeroCarouselBlock } from '@/blocks/HeroCarousel/Component'
import { VideoEmbedBlock } from '@/blocks/VideoEmbed/Component'
import { TitleBarBlock } from '@/blocks/TitleBar/Component'
import { LatestCommentsBlock } from '@/blocks/LatestComments/Component'
import { LatestCommentsRailBlock } from '@/blocks/LatestCommentsRail/Component'
import { FeaturedArchiveBlock } from '@/blocks/FeaturedArchive/Component'

const blockComponents = {
  archive: ArchiveBlock,
  content: ContentBlock,
  cta: CallToActionBlock,
  formBlock: FormBlock,
  mediaBlock: MediaBlock,
  heroCarousel: HeroCarouselBlock,
  videoEmbed: VideoEmbedBlock,
  titleBar: TitleBarBlock,
  latestComments: LatestCommentsBlock,
  latestCommentsRail: LatestCommentsRailBlock,
  featuredArchive: FeaturedArchiveBlock,
}

type BlockType = keyof typeof blockComponents

type RenderBlocksProps = {
  blocks: Array<Record<string, any>>
  disableInnerContainer?: boolean
}

export const RenderBlocks: React.FC<RenderBlocksProps> = (props) => {
  const { blocks, disableInnerContainer = false } = props

  const hasBlocks = blocks && Array.isArray(blocks) && blocks.length > 0

  if (!hasBlocks) {
    return null
  }

  return (
    <Fragment>
      {blocks.map((block, index) => {
        const blockType = block?.blockType as BlockType | undefined

        if (!blockType || !(blockType in blockComponents)) {
          return null
        }

        const Block = blockComponents[blockType]

        if (!Block) return null

        const blockProps = disableInnerContainer ? { disableInnerContainer: true } : {}

        if (blockType === 'heroCarousel' || blockType === 'titleBar') {
          return (
            <Fragment key={index}>
              {/* @ts-expect-error there may be some mismatch between the expected types here */}
              <Block {...block} {...blockProps} />
            </Fragment>
          )
        }

        if (disableInnerContainer) {
          return (
            <Fragment key={index}>
              {/* @ts-expect-error there may be some mismatch between the expected types here */}
              <Block {...block} {...blockProps} />
            </Fragment>
          )
        }

        return (
          <div className="my-16" key={index}>
            {/* @ts-expect-error there may be some mismatch between the expected types here */}
            <Block {...block} {...blockProps} />
          </div>
        )
      })}
    </Fragment>
  )
}
