import type { CollectionConfig } from 'payload'
import { seoTab } from '../fields/seo'
import { formatSlug } from '../fields/formatSlug'

export const Pages: CollectionConfig = {
  slug: 'pages',
  admin: { useAsTitle: 'title', defaultColumns: ['title', 'slug', 'status', 'updatedAt'] },
  access: { read: () => true },
  versions: { drafts: true },
  fields: [
    { name: 'title', type: 'text', required: true },
    { name: 'slug', type: 'text', required: true, unique: true, index: true, hooks: { beforeValidate: [formatSlug] } },
    {
      name: 'status',
      type: 'select',
      defaultValue: 'draft',
      options: ['draft', 'published'],
    },
    {
      type: 'tabs',
      tabs: [
        {
          label: 'Home Content',
          description: 'Only used by the / (Home) page — every section, top to bottom.',
          admin: { condition: (data) => data?.slug === 'home' },
          fields: [
            // Hero
            { name: 'heroHeading', type: 'text' },
            { name: 'heroSubheading', type: 'text' },
            { name: 'heroDescriptionLine1', type: 'text' },
            { name: 'heroDescriptionLine2', type: 'text' },
            { name: 'heroCtaLabel', type: 'text' },
            { name: 'heroCtaUrl', type: 'text' },
            {
              name: 'heroImages',
              type: 'array',
              admin: { description: 'The crossfading collage images in the hero image strip.' },
              fields: [{ name: 'image', type: 'upload', relationTo: 'media', required: true }],
            },
            // Website Building 3-Step Process (field names kept as workShowcase* internally
            // to avoid a schema migration — only the admin-facing labels changed here)
            { name: 'workShowcaseHeading', type: 'text', label: 'Website Building 3-Step Process Heading' },
            { name: 'workShowcaseImage', type: 'upload', relationTo: 'media', label: 'Website Building 3-Step Process Image' },
            {
              name: 'workShowcaseCards',
              type: 'array',
              label: 'Website Building 3-Step Process Cards',
              labels: { singular: 'Step Card', plural: 'Step Cards' },
              fields: [
                { name: 'title', type: 'text' },
                { name: 'desc', type: 'textarea' },
              ],
            },
            // Services horizontal scroll
            { name: 'servicesHeading', type: 'text' },
            { name: 'servicesDescription', type: 'textarea' },
            {
              name: 'servicesSteps',
              type: 'array',
              fields: [
                { name: 'title', type: 'text' },
                { name: 'desc', type: 'textarea' },
                {
                  name: 'bullets',
                  type: 'array',
                  fields: [{ name: 'text', type: 'text', required: true }],
                },
                { name: 'image', type: 'upload', relationTo: 'media' },
                { name: 'buttonLabel', type: 'text', defaultValue: 'Learn More' },
                { name: 'buttonUrl', type: 'text' },
              ],
            },
            // Tools & Technologies we use
            {
              name: 'toolsSectionGroups',
              type: 'array',
              admin: { description: 'The "Tools and technologies we use" badge groups (Design tools, Backend tools, etc).' },
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
            // Why Choose Us
            { name: 'whyChooseHeading', type: 'text' },
            { name: 'whyChooseBoldIntro', type: 'textarea' },
            { name: 'whyChooseLightIntro', type: 'textarea' },
            { name: 'whyChooseButtonLabel', type: 'text' },
            { name: 'whyChooseButtonUrl', type: 'text' },
            {
              name: 'whyChooseReasons',
              type: 'array',
              fields: [
                { name: 'title', type: 'text' },
                { name: 'desc', type: 'textarea' },
              ],
            },
            // "Accelerate your Business Success" case studies row — references
            // existing Showcases docs, never duplicates their content. Admin
            // just picks which showcases feature here; each card links through
            // to that showcase's real detail page.
            {
              name: 'homeCaseStudiesSelected',
              type: 'relationship',
              relationTo: 'showcases',
              hasMany: true,
              label: 'Case Studies to Feature (Accelerate your Business Success section)',
              admin: {
                description: 'Pick showcases from the Showcases collection to feature here. Leave empty to auto-show the 3 most recent published showcases.',
              },
            },
            // Reviews
            { name: 'reviewsHeading', type: 'text' },
            { name: 'reviewsSubheading', type: 'text' },
            { name: 'reviewsDescription', type: 'textarea' },
            { name: 'reviewsBackgroundImage', type: 'upload', relationTo: 'media' },
            { name: 'reviewsStarIcon', type: 'upload', relationTo: 'media' },
            { name: 'reviewsStatSinceText', type: 'text', defaultValue: 'Since 2015' },
            { name: 'reviewsStatProjectsText', type: 'text', defaultValue: '600+ Projects' },
            { name: 'reviewsStatExperienceText', type: 'text', defaultValue: '10+ Years Experiance' },
            { name: 'reviewsScheduleButtonLabel', type: 'text', defaultValue: 'Schedule a Call' },
            { name: 'reviewsScheduleButtonUrl', type: 'text' },
            { name: 'reviewsRatingText', type: 'text', defaultValue: 'Rating Avg. 4.6/5' },
            {
              name: 'reviews',
              type: 'array',
              admin: {
                description: 'Up to 12 reviews are shown on the front end, newest first (top of this list = shown first). Extra reviews beyond 12 are hidden but kept here.',
              },
              fields: [
                { name: 'rating', type: 'text' },
                { name: 'text', type: 'textarea' },
                { name: 'name', type: 'text' },
                { name: 'company', type: 'text' },
              ],
            },
            // Blog preview section
            { name: 'blogSectionHeading', type: 'text' },
            { name: 'blogSectionButtonLabel', type: 'text' },
            { name: 'blogSectionButtonUrl', type: 'text' },
            // FAQ section
            { name: 'faqHeading', type: 'text' },
            {
              name: 'homeFaqs',
              type: 'array',
              fields: [
                { name: 'question', type: 'text' },
                { name: 'answer', type: 'textarea' },
              ],
            },
          ],
        },
        {
          label: 'Contact Content',
          description: 'Only used by the /contact page.',
          admin: { condition: (data) => data?.slug === 'contact' },
          fields: [
            { name: 'contactHeading', type: 'text' },
            { name: 'contactSubheading', type: 'textarea' },
            { name: 'contactDescription', type: 'textarea' },
            { name: 'contactFormHeading', type: 'text' },
            { name: 'contactCardBackgroundImage', type: 'upload', relationTo: 'media' },
          ],
        },
        {
          label: 'Contact Card',
          description: 'The dark "Get in touch" / "Locations" card at the bottom of the /contact page.',
          admin: { condition: (data) => data?.slug === 'contact' },
          fields: [
            { name: 'getInTouchHeading', type: 'text', defaultValue: 'Get in touch' },
            {
              name: 'getInTouchDescription',
              type: 'textarea',
              defaultValue: 'To explore other business opportunities or career options, reach out to us at:',
            },
            { name: 'getInTouchEmailLabel', type: 'text', defaultValue: 'eMail' },
            { name: 'getInTouchEmailValue', type: 'text', defaultValue: 'hello@nexovah.com, support@nexovah.com' },
            { name: 'getInTouchDialLabel', type: 'text', defaultValue: 'Dial' },
            { name: 'getInTouchDialValue', type: 'text', defaultValue: '(+91) 8777 8200 47, 8100 3880 80' },
            { name: 'getInTouchWhatsappLabel', type: 'text', defaultValue: 'WhatsApp' },
            { name: 'getInTouchWhatsappValue', type: 'text', defaultValue: '(+91) 8100 3880 80' },
            { name: 'locationsHeading', type: 'text', defaultValue: 'Locations' },
            {
              name: 'locations',
              type: 'array',
              fields: [
                { name: 'country', type: 'text', required: true },
                {
                  name: 'addressLines',
                  type: 'array',
                  fields: [{ name: 'text', type: 'text', required: true }],
                },
              ],
            },
          ],
        },
        {
          label: 'Get a Quote Content',
          description: 'Only used by the /get-a-quote page.',
          admin: { condition: (data) => data?.slug === 'get-a-quote' },
          fields: [
            { name: 'quoteHeroHeading', type: 'text' },
            { name: 'quoteHeroSubheading', type: 'text' },
            { name: 'quoteHeroDescription', type: 'textarea' },
            { name: 'quoteAfterSubmitHeading', type: 'text', defaultValue: 'After you submit the form' },
            {
              name: 'quoteAfterSubmitSteps',
              type: 'array',
              label: 'After Submit Steps',
              labels: { singular: 'Step', plural: 'Steps' },
              minRows: 1,
              maxRows: 3,
              fields: [
                { name: 'icon', type: 'upload', relationTo: 'media', required: true },
                { name: 'title', type: 'text', required: true },
                { name: 'desc', type: 'text', required: true },
              ],
            },
            { name: 'quoteWhyHeading', type: 'text', defaultValue: 'Why request a quote from Nexovah?' },
            {
              name: 'quoteWhyItems',
              type: 'array',
              label: 'Why Request a Quote — Bullets',
              fields: [{ name: 'text', type: 'text', required: true }],
            },
          ],
        },
        {
          label: 'Blog Page Content',
          description: 'Only used by the /blog list page header — individual posts come from the Blogs collection.',
          admin: { condition: (data) => data?.slug === 'blog' },
          fields: [
            { name: 'blogPageTitle', type: 'text' },
            { name: 'blogPageSubtitle', type: 'text' },
            {
              name: 'blogDefaultCoverImage',
              type: 'upload',
              relationTo: 'media',
              admin: { description: 'Used whenever a blog post has no cover image set.' },
            },
          ],
        },
        {
          label: 'Case Studies Page Content',
          description: 'Only used by the /case-studies list page header — individual showcases come from the Showcases collection.',
          admin: { condition: (data) => data?.slug === 'case-studies' },
          fields: [
            { name: 'caseStudiesHeading', type: 'text' },
            { name: 'caseStudiesDescription', type: 'textarea' },
          ],
        },
        {
          label: 'Company Content',
          description: 'Only used by the /company page.',
          admin: { condition: (data) => data?.slug === 'company' },
          fields: [
            { name: 'companyEyebrow', type: 'text' },
            { name: 'companyHeroHeading', type: 'text' },
            { name: 'companyHeroDescription', type: 'textarea' },
            { name: 'companyAboutImage', type: 'upload', relationTo: 'media' },
            {
              name: 'companyStats',
              type: 'array',
              fields: [
                { name: 'value', type: 'text' },
                { name: 'label', type: 'text' },
                { name: 'desc', type: 'textarea' },
              ],
            },
            { name: 'companyInnovationHeading', type: 'text' },
            { name: 'companyInnovationDescription', type: 'textarea' },
            {
              name: 'companyInnovationPoints',
              type: 'array',
              fields: [
                { name: 'heading', type: 'text' },
                { name: 'desc', type: 'textarea' },
              ],
            },
            { name: 'companyDifferentHeading', type: 'text' },
            {
              name: 'companyDifferentParagraphs',
              type: 'array',
              fields: [{ name: 'text', type: 'textarea', required: true }],
            },
            {
              name: 'companyDifferentiators',
              type: 'array',
              fields: [
                { name: 'heading', type: 'text' },
                { name: 'desc', type: 'textarea' },
              ],
            },
            { name: 'companyJourneyHeading', type: 'text' },
            {
              name: 'companyJourney',
              type: 'array',
              fields: [
                { name: 'year', type: 'text' },
                { name: 'title', type: 'text' },
                { name: 'desc', type: 'textarea' },
                { name: 'image', type: 'upload', relationTo: 'media' },
              ],
            },
          ],
        },
        {
          label: 'Industries Content',
          description: 'Only used by the /industries page.',
          admin: { condition: (data) => data?.slug === 'industries' },
          fields: [
            { name: 'industriesHeroHeading', type: 'text' },
            {
              name: 'industriesHeroParagraphs',
              type: 'array',
              fields: [{ name: 'text', type: 'textarea', required: true }],
            },
            { name: 'industriesHeroCtaLabel', type: 'text' },
            { name: 'industriesHeroCtaUrl', type: 'text' },
            { name: 'industriesEyebrow', type: 'text' },
            { name: 'industriesSectionHeading', type: 'text' },
            { name: 'industriesSectionDescription', type: 'textarea' },
            {
              name: 'industries',
              type: 'array',
              fields: [
                { name: 'heading', type: 'text' },
                { name: 'tagline', type: 'text' },
                {
                  name: 'bullets',
                  type: 'array',
                  fields: [{ name: 'text', type: 'text', required: true }],
                },
              ],
            },
          ],
        },
        {
          label: 'Technology Content',
          description: 'Only used by the /technology page. Icon logos stay static in the component — only headings/descriptions are editable here.',
          admin: { condition: (data) => data?.slug === 'technology' },
          fields: [
            { name: 'techEyebrow', type: 'text' },
            { name: 'techHeroHeading', type: 'text' },
            {
              name: 'techHeroParagraphs',
              type: 'array',
              fields: [{ name: 'text', type: 'textarea', required: true }],
            },
            { name: 'techHeroCtaLabel', type: 'text' },
            { name: 'techHeroCtaUrl', type: 'text' },
            { name: 'techPlatformsHeading', type: 'text' },
            { name: 'techPlatformsDescription', type: 'textarea' },
            { name: 'techPrototypesHeading', type: 'text' },
            { name: 'techPrototypesDescription', type: 'textarea' },
            {
              name: 'techGroups',
              type: 'array',
              fields: [
                { name: 'heading', type: 'text' },
                { name: 'desc', type: 'textarea' },
                {
                  name: 'icons',
                  type: 'array',
                  fields: [
                    { name: 'icon', type: 'upload', relationTo: 'media', required: true },
                    { name: 'label', type: 'text', required: true },
                  ],
                },
              ],
            },
          ],
        },
        {
          label: 'Legal Content',
          description: 'Only used by policy/legal pages (Privacy, Refund, Terms) — rendered through LegalPageTemplate.',
          admin: { condition: (data) => ['privacy-policy', 'refund-policies', 'terms-conditions'].includes(data?.slug) },
          fields: [
            { name: 'legalDescription', type: 'textarea' },
            { name: 'lastUpdated', type: 'text' },
            {
              name: 'legalSections',
              type: 'array',
              fields: [
                { name: 'sectionId', type: 'text', required: true },
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
              ],
            },
          ],
        },
        seoTab,
      ],
    },
  ],
}
