import type { CollectionConfig } from 'payload'

// Managed source list for Leads/Contacts. Admins can add new sources directly
// from the relationship field's "Add new" button on a Lead/Contact — no code
// change needed to introduce a new source.
export const LeadSources: CollectionConfig = {
  slug: 'lead-sources',
  admin: {
    useAsTitle: 'name',
    defaultColumns: ['name', 'updatedAt'],
    group: 'CRM',
  },
  access: {
    read: ({ req }) => Boolean(req.user),
    create: ({ req }) => Boolean(req.user),
    update: ({ req }) => Boolean(req.user),
    delete: ({ req }) => Boolean(req.user),
  },
  fields: [{ name: 'name', type: 'text', required: true, unique: true }],
}
