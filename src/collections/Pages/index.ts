import type { CollectionConfig } from 'payload'

import { authenticated } from '../../access/authenticated'
import { authenticatedOrPublished } from '../../access/authenticatedOrPublished'
import { Archive } from '../../blocks/ArchiveBlock/config'
import { CallToAction } from '../../blocks/CallToAction/config'
import { Content } from '../../blocks/Content/config'
import { FormBlock } from '../../blocks/Form/config'
import { MediaBlock } from '../../blocks/MediaBlock/config'
import { HeroCarousel } from '../../blocks/HeroCarousel/config'
import { TitleBar } from '../../blocks/TitleBar/config'
import { FeaturedArchive } from '../../blocks/FeaturedArchive/config'
import { LatestCommentsRail } from '../../blocks/LatestCommentsRail/config'
import { hero } from '@/heros/config'
import { slugField } from '@/fields/slug'
import { preventStaleTitle } from '@/hooks/preventStaleTitle'
import { populatePublishedAt } from '../../hooks/populatePublishedAt'
import { generatePreviewPath } from '../../utilities/generatePreviewPath'
import { ensureUniqueLayoutBlockIDs } from '../../hooks/ensureUniqueLayoutBlockIDs'
import { revalidateDelete, revalidatePage } from './hooks/revalidatePage'

import {
  MetaDescriptionField,
  MetaImageField,
  MetaTitleField,
  OverviewField,
  PreviewField,
} from '@payloadcms/plugin-seo/fields'

import {
  lexicalEditor,
  HeadingFeature,
  FixedToolbarFeature,
  InlineToolbarFeature,
} from '@payloadcms/richtext-lexical'
import { enGroup } from '@/fields/enGroup'
import { withEnglishFallback } from '../../utilities/ai/localizationHook'
import { createTranslationHandler } from '../../utilities/ai/translationHandler'

export const Pages: CollectionConfig<'pages'> = {
  slug: 'pages',
  access: {
    create: authenticated,
    delete: authenticated,
    read: authenticatedOrPublished,
    update: authenticated,
  },
  // This config controls what's populated by default when a page is referenced
  // https://payloadcms.com/docs/queries/select#defaultpopulate-collection-config-property
  // Type safe if the collection slug generic is passed to `CollectionConfig` - `CollectionConfig<'pages'>
  defaultPopulate: {
    title: true,
    slug: true,
  },
  admin: {
    defaultColumns: ['title', 'slug', 'updatedAt'],
    livePreview: {
      url: ({ data, req }) => {
        const path = generatePreviewPath({
          slug: typeof data?.slug === 'string' ? data.slug : '',
          collection: 'pages',
          req,
        })

        return path
      },
    },
    preview: (data, { req }) =>
      generatePreviewPath({
        slug: typeof data?.slug === 'string' ? data.slug : '',
        collection: 'pages',
        req,
      }),
    useAsTitle: 'title',
  },
  fields: [
    {
      name: 'title',
      type: 'text',
      required: true,
    },
    {
      type: 'tabs',
      tabs: [
        {
          fields: [hero],
          label: 'Hero',
        },
        {
          fields: [
            {
              name: 'layout',
              type: 'blocks',
              blocks: [
                HeroCarousel,
                CallToAction,
                Content,
                MediaBlock,
                Archive,
                FeaturedArchive,
                LatestCommentsRail,
                FormBlock,
                TitleBar,
              ],
              required: true,
              admin: {
                initCollapsed: true,
              },
            },
          ],
          label: 'Content',
        },
        {
          name: 'meta',
          label: 'SEO',
          fields: [
            OverviewField({
              titlePath: 'meta.title',
              descriptionPath: 'meta.description',
              imagePath: 'meta.image',
            }),
            MetaTitleField({
              hasGenerateFn: true,
            }),
            MetaImageField({
              relationTo: 'media',
            }),

            MetaDescriptionField({}),
            PreviewField({
              // if the `generateUrl` function is configured
              hasGenerateFn: true,

              // field paths to match the target field for data
              titlePath: 'meta.title',
              descriptionPath: 'meta.description',
            }),
          ],
        },
      ],
    },
    {
      name: 'publishedAt',
      type: 'date',
      admin: {
        position: 'sidebar',
      },
    },
    ...slugField(),
    {
      name: 'aiTranslate',
      type: 'ui',
      admin: {
        position: 'sidebar',
        components: { Field: '@/components/AITranslate#AITranslate' },
      },
    },
    enGroup([
      {
        name: 'title',
        type: 'text',
        admin: { description: 'Leave empty to fall back to Romanian' },
      },
      {
        name: 'hero',
        type: 'group',
        fields: [
          {
            name: 'richText',
            type: 'richText',
            editor: lexicalEditor({
              features: ({ rootFeatures }) => [
                ...rootFeatures,
                HeadingFeature({ enabledHeadingSizes: ['h1', 'h2', 'h3', 'h4'] }),
                FixedToolbarFeature(),
                InlineToolbarFeature(),
              ],
            }),
            label: 'Hero Rich Text (EN)',
          },
        ],
      },
      {
        name: 'meta',
        type: 'group',
        fields: [
          { name: 'title', type: 'text', label: 'SEO Meta Title (EN)' },
          { name: 'description', type: 'textarea', label: 'SEO Meta Description (EN)' },
        ],
      },
    ]),
  ],
  endpoints: [
    {
      path: '/:id/translate',
      method: 'post',
      handler: createTranslationHandler('pages', {
        title: 'text',
        'hero.richText': 'lexical',
        'meta.title': 'text',
        'meta.description': 'text',
      }),
    },
  ],
  hooks: {
    beforeValidate: [ensureUniqueLayoutBlockIDs],
    afterChange: [revalidatePage],
    beforeChange: [preventStaleTitle, populatePublishedAt],
    afterRead: [withEnglishFallback(['title', 'hero.richText', 'meta.title', 'meta.description'])],
    afterDelete: [revalidateDelete],
  },
  versions: {
    drafts: {
      autosave: {
        interval: 100, // We set this interval for optimal live preview
      },
      schedulePublish: true,
    },
    maxPerDoc: 50,
  },
}
