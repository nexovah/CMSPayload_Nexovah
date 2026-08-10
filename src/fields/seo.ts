import type { Tab } from 'payload'

export const seoTab: Tab = {
  label: 'SEO',
  fields: [
    { name: 'metaTitle', type: 'text', admin: { description: '50-60 characters' } },
    { name: 'metaDescription', type: 'textarea', admin: { description: '150-160 characters' } },
    {
      name: 'ogTitle',
      type: 'text',
      admin: { description: 'Optional — overrides the title used for social share cards (Open Graph + Twitter). Leave blank to reuse Meta Title.' },
    },
    {
      name: 'ogDescription',
      type: 'textarea',
      admin: { description: 'Optional — overrides the description used for social share cards. Leave blank to reuse Meta Description.' },
    },
    { name: 'ogImage', type: 'upload', relationTo: 'media' },
    { name: 'canonicalOverride', type: 'text' },
    {
      name: 'noindex',
      type: 'checkbox',
      defaultValue: false,
      label: 'Hide from search results (noindex)',
    },
    {
      name: 'nofollow',
      type: 'checkbox',
      defaultValue: false,
      label: "Don't let search engines follow links on this page (nofollow)",
      admin: { description: 'Independent of the setting above — you can hide a page from results but still let its links pass value, or vice versa.' },
    },
  ],
}
