import type { Block } from 'payload'

import { Archive } from '../ArchiveBlock/config'
import { CallToAction } from '../CallToAction/config'
import { Content } from '../Content/config'
import { FormBlock } from '../Form/config'
import { MediaBlock } from '../MediaBlock/config'
import { TitleBar } from '../TitleBar/config'
import { LatestComments } from '../LatestComments/config'
import { PopularPosts } from '../PopularPosts/config'
import { FeaturedArchive } from '../FeaturedArchive/config'

export const TwoColumnLayout: Block = {
  slug: 'twoColumnLayout',
  labels: {
    singular: 'Two Column Layout',
    plural: 'Two Column Layouts',
  },
  fields: [
    {
      name: 'main',
      type: 'blocks',
      label: 'Main Column',
      blocks: [Archive, FeaturedArchive, Content, CallToAction, MediaBlock, FormBlock, TitleBar],
      required: true,
    },
    {
      name: 'sidebar',
      type: 'blocks',
      label: 'Sidebar',
      blocks: [LatestComments, PopularPosts, Content, CallToAction],
    },
  ],
}

