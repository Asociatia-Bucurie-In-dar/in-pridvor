import type { Block } from 'payload'

export const LatestCommentsRail: Block = {
  slug: 'latestCommentsRail',
  labels: {
    singular: 'Carusel Comentarii',
    plural: 'Carusele Comentarii',
  },
  fields: [
    {
      name: 'heading',
      type: 'text',
      label: 'Titlu',
      defaultValue: 'Vocile comunității',
    },
    {
      name: 'subheading',
      type: 'text',
      label: 'Subtitlu',
      defaultValue: 'Cele mai recente comentarii de la cititorii noștri',
    },
    {
      name: 'limit',
      type: 'number',
      label: 'Număr de comentarii',
      defaultValue: 10,
      min: 4,
      max: 24,
      admin: {
        description: 'Câte comentarii să fie afișate în carusel (4-24)',
      },
    },
  ],
}

