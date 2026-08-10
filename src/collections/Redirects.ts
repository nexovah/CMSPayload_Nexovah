import type { CollectionConfig } from 'payload'

// Simple 301/302 redirect map, consumed by the frontend router for any path
// that doesn't match a real route (old URLs, renamed slugs, etc).
export const Redirects: CollectionConfig = {
  slug: 'redirects',
  admin: {
    useAsTitle: 'fromPath',
    defaultColumns: ['fromPath', 'toPath', 'type'],
    description: 'Old URL → new URL mappings. Whenever a visitor hits a path that no longer exists, the frontend checks this list before showing a 404.',
  },
  access: { read: () => true },
  fields: [
    {
      name: 'fromPath',
      type: 'text',
      required: true,
      unique: true,
      index: true,
      admin: { description: 'The old path to redirect from, e.g. /old-page (must start with a slash, no domain).' },
    },
    {
      name: 'toPath',
      type: 'text',
      required: true,
      admin: { description: 'The new path to send visitors to, e.g. /new-page.' },
    },
    {
      name: 'type',
      type: 'select',
      defaultValue: 'permanent',
      options: [
        { label: 'Permanent (301)', value: 'permanent' },
        { label: 'Temporary (302)', value: 'temporary' },
      ],
    },
  ],
}
