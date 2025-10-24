import type { Block } from 'payload'

export const VideoEmbed: Block = {
  slug: 'videoEmbed',
  interfaceName: 'VideoEmbedBlock',
  fields: [
    {
      name: 'url',
      type: 'text',
      required: true,
      label: 'Video URL',
      admin: {
        description: 'YouTube, Vimeo, or other video URL',
      },
    },
    {
      name: 'caption',
      type: 'text',
      label: 'Caption (optional)',
    },
  ],
}
