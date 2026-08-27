import type { Block, CollectionConfig } from 'payload'
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

// ─── Body content blocks — the case study "page builder" ────────────────────
// Admin adds any of these in any order/count via "+ Add Block", and can drag
// to reorder. Image blocks render at fixed width / free height (never
// cropped) on the frontend — see ImageBlock in CaseStudyDetailPage.tsx.

const TextSectionBlock: Block = {
  slug: 'textSection',
  labels: { singular: 'Text Section', plural: 'Text Sections' },
  fields: [
    { name: 'heading', type: 'text', required: true },
    { name: 'paragraph', type: 'textarea' },
    {
      name: 'bullets',
      type: 'array',
      admin: { description: 'Optional — leave empty for a plain paragraph section.' },
      fields: [
        { name: 'label', type: 'text', required: true },
        { name: 'text', type: 'textarea', required: true },
      ],
    },
  ],
}

const FullImageBlock: Block = {
  slug: 'fullImage',
  labels: { singular: 'Full-Width Image', plural: 'Full-Width Images' },
  fields: [
    {
      name: 'image',
      type: 'upload',
      relationTo: 'media',
      required: true,
      admin: { description: 'Renders at the full 1366px content width. Height is free — the whole image always shows, never cropped.' },
    },
    { name: 'alt', type: 'text' },
  ],
}

const TwoColumnImageBlock: Block = {
  slug: 'twoColumnImage',
  labels: { singular: 'Two-Column Image', plural: 'Two-Column Images' },
  fields: [
    {
      type: 'row',
      fields: [
        { name: 'imageLeft', type: 'upload', relationTo: 'media', required: true, admin: { width: '50%' } },
        { name: 'imageRight', type: 'upload', relationTo: 'media', required: true, admin: { width: '50%' } },
      ],
    },
    {
      type: 'row',
      fields: [
        { name: 'altLeft', type: 'text', admin: { width: '50%' } },
        { name: 'altRight', type: 'text', admin: { width: '50%' } },
      ],
    },
  ],
}

const QuoteCtaBlock: Block = {
  slug: 'quoteCta',
  labels: { singular: 'Quote + CTA', plural: 'Quote + CTA Blocks' },
  fields: [
    { name: 'quote', type: 'textarea', required: true },
    { name: 'ctaLabel', type: 'text' },
    { name: 'ctaHref', type: 'text' },
  ],
}

const DesignSystemBlock: Block = {
  slug: 'designSystem',
  labels: { singular: 'Design System', plural: 'Design System Blocks' },
  fields: [
    { name: 'heading', type: 'text' },
    { name: 'fontLabel', type: 'text' },
    {
      name: 'swatches',
      type: 'array',
      fields: [{ name: 'color', type: 'text', required: true }],
    },
  ],
}

const ResultsListBlock: Block = {
  slug: 'resultsList',
  labels: { singular: 'Results List', plural: 'Results Lists' },
  fields: [
    { name: 'heading', type: 'text' },
    {
      name: 'paragraphs',
      type: 'array',
      fields: [{ name: 'text', type: 'textarea', required: true }],
    },
  ],
}

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
            {
              name: 'heroImage',
              type: 'upload',
              relationTo: 'media',
              admin: { description: 'Masthead image at the top of the page. Fixed width, free height — never cropped.' },
            },
            {
              name: 'meta',
              type: 'array',
              fields: [
                { name: 'label', type: 'text', required: true },
                { name: 'value', type: 'text', required: true },
              ],
            },
            {
              name: 'content',
              type: 'blocks',
              label: 'Page Content',
              admin: {
                description:
                  'The body of the case study — add Text, Full-Width Image, Two-Column Image, Quote + CTA, Design System, or Results blocks in any order, and drag to reorder. This is where you add images anywhere you need one.',
              },
              blocks: [TextSectionBlock, FullImageBlock, TwoColumnImageBlock, QuoteCtaBlock, DesignSystemBlock, ResultsListBlock],
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
