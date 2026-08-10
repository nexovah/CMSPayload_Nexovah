import type { CollectionConfig } from 'payload'

// Footer newsletter signups. Public create only — the frontend gates the
// actual POST behind email-format validation + a math captcha popup, so
// anything landing here has already passed both checks.
export const Newsletter: CollectionConfig = {
  slug: 'newsletter',
  admin: {
    useAsTitle: 'email',
    defaultColumns: ['email', 'sourcePage', 'createdAt'],
    group: 'CRM',
  },
  access: {
    read: ({ req }) => Boolean(req.user),
    create: () => true,
    update: ({ req }) => Boolean(req.user),
    delete: ({ req }) => Boolean(req.user),
  },
  fields: [
    { name: 'email', type: 'email', required: true, unique: true },
    { name: 'sourcePage', type: 'text' },
  ],
}
