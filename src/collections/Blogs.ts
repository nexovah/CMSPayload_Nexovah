import type { CollectionConfig } from 'payload'
import { seoTab } from '../fields/seo'
import { formatSlug } from '../fields/formatSlug'

// One template (BlogDetailPage.tsx on the frontend), many entries — mirrors
// blogPosts.ts + blogContent.ts's combined shape.
export const Blogs: CollectionConfig = {
  slug: 'blogs',
  admin: {
    useAsTitle: 'title',
    defaultColumns: ['title', 'status', 'blogSection', 'author', 'publishedAt'],
    description: 'Select multiple rows (checkboxes on the left) to bulk-edit Status or Blog Section across many posts at once — no need to open each one individually.',
  },
  access: { read: () => true },
  fields: [
    { name: 'title', type: 'text', required: true },
    { name: 'slug', type: 'text', required: true, unique: true, index: true, hooks: { beforeValidate: [formatSlug] } },
    { name: 'status', type: 'select', defaultValue: 'draft', options: ['draft', 'published'] },
    { name: 'publishedAt', type: 'date' },
    {
      type: 'tabs',
      tabs: [
        {
          label: 'Content',
          fields: [
            { name: 'excerpt', type: 'textarea' },
            { name: 'coverImage', type: 'upload', relationTo: 'media' },
            { name: 'authorName', type: 'text', defaultValue: 'Nexovah Staff' },
            { name: 'readTime', type: 'text' },
            { name: 'subtitle', type: 'text' },
            {
              name: 'keyTakeaways',
              type: 'array',
              admin: { description: 'Shown as a highlighted "Key Takeaways" card near the top of the post, above the body sections.' },
              fields: [{ name: 'text', type: 'text', required: true }],
            },
            // Structured body — mirrors BlogDetailPage.tsx's ContentSection shape
            // exactly (heading/paragraphs/bullets/image/quote), so the existing
            // template renders this with zero design changes.
            {
              name: 'sections',
              type: 'array',
              fields: [
                { name: 'sectionId', type: 'text', required: true, admin: { description: 'Used as the #anchor for the table of contents' } },
                { name: 'heading', type: 'text', required: true },
                {
                  name: 'paragraphs',
                  type: 'array',
                  fields: [{ name: 'text', type: 'textarea', required: true }],
                },
                {
                  name: 'bullets',
                  type: 'array',
                  fields: [{ name: 'text', type: 'text', required: true }],
                },
                { name: 'image', type: 'upload', relationTo: 'media' },
                { name: 'imageCaption', type: 'text' },
                { name: 'quote', type: 'text' },
                {
                  name: 'contentBlocks',
                  type: 'blocks',
                  admin: {
                    description:
                      'Build this section as a free ordered mix of any block type below, inserted in any order/position via "Add Content Block". If any blocks are added here, they replace the plain Paragraphs/Image/Bullets/Quote fields above for this section.',
                  },
                  blocks: [
                    {
                      slug: 'paragraph',
                      labels: { singular: 'Paragraph', plural: 'Paragraphs' },
                      fields: [{ name: 'text', type: 'textarea', required: true }],
                    },
                    {
                      slug: 'heading',
                      labels: { singular: 'Subheading', plural: 'Subheadings' },
                      fields: [{ name: 'text', type: 'text', required: true }],
                    },
                    {
                      slug: 'image',
                      labels: { singular: 'Image', plural: 'Images' },
                      fields: [
                        { name: 'image', type: 'upload', relationTo: 'media', required: true },
                        { name: 'caption', type: 'text' },
                      ],
                    },
                    {
                      slug: 'video',
                      labels: { singular: 'Video Embed', plural: 'Video Embeds' },
                      fields: [
                        { name: 'url', type: 'text', required: true },
                        { name: 'caption', type: 'text' },
                      ],
                    },
                    {
                      slug: 'bulletList',
                      labels: { singular: 'Bullet List', plural: 'Bullet Lists' },
                      fields: [
                        {
                          name: 'items',
                          type: 'array',
                          fields: [{ name: 'text', type: 'text', required: true }],
                        },
                      ],
                    },
                    {
                      slug: 'numberedList',
                      labels: { singular: 'Numbered List', plural: 'Numbered Lists' },
                      fields: [
                        {
                          name: 'items',
                          type: 'array',
                          fields: [{ name: 'text', type: 'text', required: true }],
                        },
                      ],
                    },
                    {
                      slug: 'table',
                      labels: { singular: 'Table', plural: 'Tables' },
                      fields: [
                        {
                          name: 'headers',
                          type: 'array',
                          fields: [{ name: 'text', type: 'text', required: true }],
                        },
                        {
                          name: 'rows',
                          type: 'array',
                          fields: [
                            {
                              name: 'cells',
                              type: 'array',
                              fields: [{ name: 'text', type: 'text', required: true }],
                            },
                          ],
                        },
                      ],
                    },
                    {
                      slug: 'quote',
                      labels: { singular: 'Quote', plural: 'Quotes' },
                      fields: [{ name: 'text', type: 'text', required: true }],
                    },
                    {
                      slug: 'callout',
                      labels: { singular: 'Callout / Note', plural: 'Callouts' },
                      fields: [
                        { name: 'text', type: 'textarea', required: true },
                        {
                          name: 'style',
                          type: 'select',
                          defaultValue: 'info',
                          options: [
                            { label: 'Info (green)', value: 'info' },
                            { label: 'Warning (amber)', value: 'warning' },
                          ],
                        },
                      ],
                    },
                    {
                      slug: 'code',
                      labels: { singular: 'Code Block', plural: 'Code Blocks' },
                      fields: [
                        { name: 'code', type: 'textarea', required: true },
                        { name: 'language', type: 'text', admin: { description: 'Optional label shown above the block, e.g. "JavaScript", "bash".' } },
                      ],
                    },
                    {
                      slug: 'divider',
                      labels: { singular: 'Divider', plural: 'Dividers' },
                      fields: [],
                    },
                  ],
                },
                {
                  name: 'table',
                  type: 'group',
                  admin: { description: 'Renders a hoverable comparison table under this section instead of/alongside bullets.' },
                  fields: [
                    {
                      name: 'headers',
                      type: 'array',
                      fields: [{ name: 'text', type: 'text', required: true }],
                    },
                    {
                      name: 'rows',
                      type: 'array',
                      fields: [
                        {
                          name: 'cells',
                          type: 'array',
                          fields: [{ name: 'text', type: 'text', required: true }],
                        },
                      ],
                    },
                  ],
                },
              ],
            },
            {
              name: 'tags',
              type: 'array',
              fields: [{ name: 'tag', type: 'text' }],
            },
            {
              name: 'faqs',
              type: 'array',
              fields: [
                { name: 'question', type: 'text' },
                { name: 'answer', type: 'textarea' },
              ],
            },
            {
              name: 'blogSection',
              type: 'select',
              hasMany: true,
              label: 'Blog Section Tags',
              options: [
                { label: 'Top Stories — Hero', value: 'topStoryHero' },
                { label: 'Top Stories — Normal (3-card row)', value: 'topStoryNormal' },
                { label: 'Featured (3-card row)', value: 'featured' },
              ],
              admin: {
                description:
                  'Optional tags controlling placement on /blog. Top Stories needs exactly 1 Hero + 3 Normal posts. Featured needs exactly 3 posts. Untagged posts are NOT hidden — every post always appears in Latest (most recent 4) and All Blogs (paginated, everything) regardless of these tags. If more than the needed count is tagged, most-recently-updated wins.',
              },
            },
          ],
        },
        seoTab,
      ],
    },
  ],
}
