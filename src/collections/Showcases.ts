import type { CollectionConfig } from 'payload'
import { seoTab } from '../fields/seo'
import { formatSlug } from '../fields/formatSlug'

const bulletList = (name: string) => ({
  name,
  type: 'array' as const,
  fields: [
    { name: 'label', type: 'text' as const, required: true },
    { name: 'text', type: 'textarea' as const, required: true },
  ],
})

const imageArray = (name: string) => ({
  name,
  type: 'array' as const,
  fields: [{ name: 'image', type: 'upload' as const, relationTo: 'media' as const, required: true }],
})

// One template (CaseStudyDetailPage.tsx on the frontend), many entries — field
// names mirror caseStudyDetail.ts's object shape exactly, so the existing
// template renders this with zero design changes. List-card fields (category,
// listImage, excerpt, featured) power the /case-studies grid.
export const Showcases: CollectionConfig = {
  slug: 'showcases',
  labels: { singular: 'Case Study', plural: 'Case Studies' },
  admin: { useAsTitle: 'title', defaultColumns: ['title', 'slug', 'status', 'updatedAt'] },
  access: { read: () => true },
  versions: { drafts: true },
  fields: [
    { name: 'title', type: 'text', required: true },
    { name: 'slug', type: 'text', required: true, unique: true, index: true, hooks: { beforeValidate: [formatSlug] } },
    { name: 'status', type: 'select', defaultValue: 'draft', options: ['draft', 'published'] },
    {
      type: 'tabs',
      tabs: [
        {
          label: 'List Card',
          fields: [
            { name: 'excerpt', type: 'textarea' },
            { name: 'listImage', type: 'upload', relationTo: 'media' },
            {
              name: 'categories',
              type: 'relationship',
              relationTo: 'categories',
              hasMany: true,
              admin: { description: 'Pick one or more categories. Manage the category list itself under the "Categories" menu.' },
            },
            { name: 'featured', type: 'checkbox', defaultValue: false },
            {
              name: 'detailSlug',
              type: 'text',
              admin: { description: 'If set, the card links to /case-studies/:detailSlug instead of its own slug (matches a separate showcase doc with the full write-up).' },
            },
          ],
        },
        {
          label: 'Detail Page',
          fields: [
            { name: 'eyebrow', type: 'text' },
            { name: 'subtitle', type: 'textarea' },
            {
              name: 'tags',
              type: 'array',
              fields: [{ name: 'tag', type: 'text', required: true }],
            },
            { name: 'heroImage', type: 'upload', relationTo: 'media' },
            {
              name: 'meta',
              type: 'array',
              fields: [
                { name: 'label', type: 'text', required: true },
                { name: 'value', type: 'text', required: true },
              ],
            },
            { name: 'aboutHeading', type: 'text' },
            { name: 'aboutParagraph', type: 'textarea' },
            { name: 'processHeading', type: 'text' },
            { name: 'processParagraph', type: 'textarea' },
            { name: 'engineeringHeading', type: 'text' },
            { name: 'engineeringIntro', type: 'textarea' },
            bulletList('engineeringBullets'),
            { name: 'webhookHeading', type: 'text' },
            { name: 'webhookIntro', type: 'textarea' },
            bulletList('webhookBullets'),
            { name: 'bannerImage', type: 'upload', relationTo: 'media' },
            imageArray('twoUpImagesA'),
            { name: 'lifestyleImage', type: 'upload', relationTo: 'media' },
            { name: 'quote', type: 'textarea' },
            { name: 'ctaLabel', type: 'text' },
            { name: 'ctaHref', type: 'text' },
            { name: 'appScreenshotImage', type: 'upload', relationTo: 'media' },
            imageArray('twoUpImagesB'),
            {
              name: 'designSystem',
              type: 'group',
              fields: [
                { name: 'heading', type: 'text' },
                { name: 'fontLabel', type: 'text' },
                {
                  name: 'swatches',
                  type: 'array',
                  fields: [{ name: 'color', type: 'text', required: true }],
                },
              ],
            },
            imageArray('twoUpImagesC'),
            { name: 'resultsHeading', type: 'text' },
            {
              name: 'resultsParagraphs',
              type: 'array',
              fields: [{ name: 'text', type: 'textarea', required: true }],
            },
            {
              name: 'attribution',
              type: 'group',
              fields: [
                { name: 'name', type: 'text' },
                { name: 'role', type: 'text' },
              ],
            },
          ],
        },
        seoTab,
      ],
    },
  ],
}
