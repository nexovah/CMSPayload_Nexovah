import type { CollectionConfig } from 'payload'
import { seoTab } from '../fields/seo'
import { formatSlug } from '../fields/formatSlug'

// One template (ServicePageTemplate.tsx on the frontend), many entries — field
// names mirror UIUXDesignPage.tsx's section data exactly, so the existing
// template renders this with zero design changes.
export const Services: CollectionConfig = {
  slug: 'services',
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
          label: 'Hero',
          fields: [
            { name: 'heroHeading', type: 'text' },
            { name: 'heroSubheading', type: 'text' },
            { name: 'heroDescription', type: 'textarea' },
            {
              name: 'features',
              type: 'array',
              fields: [
                { name: 'icon', type: 'upload', relationTo: 'media' },
                { name: 'title', type: 'text' },
                { name: 'desc', type: 'textarea' },
              ],
            },
          ],
        },
        {
          label: 'What Is / Process',
          fields: [
            { name: 'whatIsHeading', type: 'text' },
            { name: 'whatIsIntro', type: 'textarea' },
            { name: 'processButtonLabel', type: 'text' },
            { name: 'processButtonUrl', type: 'text' },
            {
              name: 'processItems',
              type: 'array',
              fields: [
                { name: 'title', type: 'text' },
                { name: 'desc', type: 'textarea' },
              ],
            },
          ],
        },
        {
          label: 'Horizontal Process Scroll',
          description: 'The scrolling step-card section further down the page. Leave every field empty to keep the shared default (UI/UX Design and Development Process).',
          fields: [
            { name: 'horizontalProcessHeading', type: 'text' },
            {
              name: 'horizontalProcessParagraphs',
              type: 'array',
              fields: [{ name: 'text', type: 'textarea' }],
            },
            {
              name: 'horizontalProcessSteps',
              type: 'array',
              admin: { description: 'Recommend 5-6 steps to match the section\'s intended rhythm.' },
              fields: [
                { name: 'title', type: 'text' },
                { name: 'desc', type: 'textarea' },
                {
                  name: 'image',
                  type: 'upload',
                  relationTo: 'media',
                  admin: { description: 'Shown in the rectangular box at the top of this card. Leave empty to show a plain brand-green placeholder until an image is uploaded.' },
                },
                {
                  name: 'bullets',
                  type: 'array',
                  fields: [{ name: 'text', type: 'text' }],
                },
              ],
            },
          ],
        },
        {
          label: 'Tech Stack',
          fields: [
            { name: 'stackHeading', type: 'text' },
            { name: 'stackDescription', type: 'textarea' },
            { name: 'stackButtonLabel', type: 'text' },
            { name: 'stackButtonUrl', type: 'text' },
            {
              name: 'techStack',
              type: 'array',
              fields: [
                { name: 'heading', type: 'text' },
                { name: 'desc', type: 'textarea' },
              ],
            },
            {
              name: 'toolsSectionGroups',
              type: 'array',
              admin: { description: 'The tool-badge groups rendered by <ToolsAndTechnologies> under this service (Design tools, Development tools, etc).' },
              fields: [
                { name: 'title', type: 'text', required: true },
                {
                  name: 'tools',
                  type: 'array',
                  fields: [
                    { name: 'icon', type: 'upload', relationTo: 'media', required: true },
                    { name: 'label', type: 'text', required: true },
                  ],
                },
              ],
            },
            { name: 'whyItMattersHeading', type: 'text' },
            { name: 'whyItMattersIcon', type: 'upload', relationTo: 'media' },
            { name: 'whyItMattersParagraph', type: 'textarea' },
          ],
        },
        {
          label: 'Expertise',
          fields: [
            { name: 'expertiseHeading', type: 'text' },
            { name: 'expertiseDescription', type: 'textarea' },
            {
              name: 'expertiseItems',
              type: 'array',
              fields: [
                { name: 'title', type: 'text' },
                { name: 'desc', type: 'textarea' },
              ],
            },
          ],
        },
        {
          label: 'Why Nexovah',
          fields: [
            { name: 'whyNexovahHeading', type: 'text' },
            { name: 'whyNexovahDescription', type: 'textarea' },
            {
              name: 'whyNexovahCards',
              type: 'array',
              fields: [
                { name: 'title', type: 'text' },
                { name: 'desc', type: 'textarea' },
              ],
            },
          ],
        },
        {
          label: 'Related Services',
          description: 'Cross-links to other service pages — shown as a row of cards near the bottom of this page. Set this on both services to link them to each other (e.g. CMS Development ↔ WordPress Development).',
          fields: [
            {
              name: 'relatedServices',
              type: 'relationship',
              relationTo: 'services',
              hasMany: true,
              admin: { description: 'Pick the other service pages to cross-link from here.' },
            },
          ],
        },
        {
          label: 'Case Studies',
          description: 'The "Accelerate your Business Success" case studies row on this service page — references existing Showcases docs, never duplicates their content.',
          fields: [
            {
              name: 'relatedCaseStudies',
              type: 'relationship',
              relationTo: 'showcases',
              hasMany: true,
              label: 'Case Studies to Feature',
              admin: {
                description: 'Pick showcases from the Showcases collection to feature here. Leave empty to auto-show the 3 most recent published showcases.',
              },
            },
          ],
        },
        {
          label: 'Page Layout',
          description: 'Drag to reorder the sections on this page (below the Hero, which always stays first). Remove a row to hide that section entirely.',
          fields: [
            {
              name: 'sectionOrder',
              type: 'array',
              label: 'Section Order',
              defaultValue: [
                { section: 'whatIs' },
                { section: 'stack' },
                { section: 'caseStudies' },
                { section: 'horizontalProcess' },
                { section: 'expertise' },
                { section: 'whyNexovah' },
                { section: 'toolsAndTech' },
                { section: 'clientLogos' },
                { section: 'trustAndTools' },
                { section: 'relatedServices' },
                { section: 'faq' },
              ],
              fields: [
                {
                  name: 'section',
                  type: 'select',
                  required: true,
                  options: [
                    { label: 'What Is / Process', value: 'whatIs' },
                    { label: 'Tech Stack', value: 'stack' },
                    { label: 'Case Studies', value: 'caseStudies' },
                    { label: 'Horizontal Process Scroll', value: 'horizontalProcess' },
                    { label: 'Expertise', value: 'expertise' },
                    { label: 'Why Nexovah', value: 'whyNexovah' },
                    { label: 'Tools & Technologies', value: 'toolsAndTech' },
                    { label: 'Client Logos', value: 'clientLogos' },
                    { label: 'Trust And Tools', value: 'trustAndTools' },
                    { label: 'Related Services', value: 'relatedServices' },
                    { label: 'FAQs', value: 'faq' },
                  ],
                },
              ],
            },
          ],
        },
        {
          label: 'FAQs',
          fields: [
            { name: 'faqTitle', type: 'text' },
            {
              name: 'faqs',
              type: 'array',
              fields: [
                { name: 'question', type: 'text' },
                { name: 'answer', type: 'textarea' },
              ],
            },
          ],
        },
        seoTab,
      ],
    },
  ],
}
