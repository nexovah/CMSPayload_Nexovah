import type { CollectionConfig } from 'payload'

// HubSpot-style contact lists — group contacts for targeted email campaigns.
// A contact can belong to multiple groups (Contacts.groups is hasMany), and
// each group here shows its members via a join, so admins can see list size
// at a glance before launching a campaign to it.
export const ContactGroups: CollectionConfig = {
  slug: 'contact-groups',
  labels: { singular: 'Contact Group', plural: 'Contact Groups' },
  admin: {
    useAsTitle: 'name',
    defaultColumns: ['name', 'type', 'contacts', 'createdAt', 'updatedAt'],
    group: 'CRM',
    description: 'Lists/segments of Contacts — used to target specific groups for email campaigns.',
  },
  access: {
    read: ({ req }) => Boolean(req.user),
    create: ({ req }) => Boolean(req.user),
    update: ({ req }) => Boolean(req.user),
    delete: ({ req }) => Boolean(req.user),
  },
  fields: [
    { name: 'name', type: 'text', required: true, unique: true, maxLength: 200 },
    {
      name: 'type',
      type: 'select',
      required: true,
      defaultValue: 'public',
      options: [
        { label: 'Public', value: 'public' },
        { label: 'Private', value: 'private' },
      ],
      admin: {
        description: 'Public lists are open to the world to subscribe and their names may appear on public pages such as the subscription management page.',
      },
    },
    {
      name: 'tags',
      type: 'array',
      admin: { description: 'Add any tags you need to organize this group.' },
      fields: [{ name: 'tag', type: 'text', required: true }],
    },
    { name: 'description', type: 'textarea' },
    {
      name: 'archived',
      type: 'checkbox',
      defaultValue: false,
      admin: {
        description: 'Archiving hides the list from lists page, campaigns, and public forms. It can be unarchived anytime. It is useful for hiding old and rarely used lists.',
      },
    },
    {
      name: 'contacts',
      type: 'join',
      collection: 'contacts',
      on: 'groups',
    },
  ],
}
