import type { CollectionConfig } from 'payload'

// Shared taxonomy for Case Studies (Showcases). Create/edit/delete categories
// here in one place; each Case Study picks from this list under its List Card
// tab. The /case-studies front-end filter row is generated from this list too,
// so a new category here becomes filterable on the site with no code change.
export const Categories: CollectionConfig = {
  slug: 'categories',
  labels: { singular: 'Category', plural: 'Categories' },
  defaultSort: 'order',
  admin: {
    useAsTitle: 'name',
    defaultColumns: ['order', 'name', 'updatedAt'],
  },
  access: {
    read: () => true,
    create: ({ req }) => Boolean(req.user),
    update: ({ req }) => Boolean(req.user),
    delete: ({ req }) => Boolean(req.user),
  },
  fields: [
    { name: 'name', type: 'text', required: true, unique: true },
    {
      name: 'order',
      type: 'number',
      required: true,
      defaultValue: 0,
      admin: { description: 'Lower numbers appear first in the /case-studies filter tabs. Edit this to reorder — not alphabetical.' },
    },
  ],
}
