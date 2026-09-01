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
              admin: {
                description:
                  'The hero image strip, left to right. Each row is one 320×440px placeholder showing exactly one image — add as many rows as you like (12-15 is typical); order here is the display order.',
              },
              fields: [{ name: 'image', type: 'upload', relationTo: 'media', required: true }],
            },
            // Drag to reorder every section below the Hero (which always stays
            // first). Remove a row to hide that section entirely.
            {
              name: 'homeSectionOrder',
              type: 'array',
              label: 'Section Order (below Hero)',
              defaultValue: [
                { section: 'clientLogos' },
                { section: 'workShowcase' },
                { section: 'ctaBanner' },
                { section: 'servicesScroll' },
                { section: 'whyChooseUs' },
                { section: 'caseStudies' },
                { section: 'toolsAndTech' },
                { section: 'reviews' },
                { section: 'blog' },
                { section: 'faq' },
                { section: 'trustAndTools' },
              ],
              fields: [
                {
                  name: 'section',
                  type: 'select',
                  required: true,
                  options: [
                    { label: 'Client Logos', value: 'clientLogos' },
                    { label: 'Work Showcase (3-Step Process)', value: 'workShowcase' },
                    { label: 'CTA Banner', value: 'ctaBanner' },
                    { label: 'Services Horizontal Scroll', value: 'servicesScroll' },
                    { label: 'Why Choose Us', value: 'whyChooseUs' },
                    { label: 'Case Studies', value: 'caseStudies' },
                    { label: 'Tools & Technologies', value: 'toolsAndTech' },
                    { label: 'Reviews', value: 'reviews' },
                    { label: 'Blog', value: 'blog' },
                    { label: 'FAQs', value: 'faq' },
                    { label: 'Trust And Tools', value: 'trustAndTools' },
                  ],
                },
              ],
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
          label: 'Design My Website Content',
          description: 'Only used by the /design-my-website standalone microsite (no shared header/footer — everything on the page lives here).',
          admin: { condition: (data) => data?.slug === 'design-my-website' },
          fields: [
            // Hero
            { name: 'dmwHeroHeadingLine1', type: 'text', defaultValue: 'Complete Website' },
            { name: 'dmwHeroHeadingLine2', type: 'text', defaultValue: '+ Google Business Listing' },
            {
              name: 'dmwPillTags',
              type: 'array',
              label: 'Hero Pill — Tag List',
              fields: [{ name: 'text', type: 'text', required: true }],
            },
            { name: 'dmwPillLabel', type: 'text', defaultValue: 'FREE TOOLS' },
            { name: 'dmwPriceAmount', type: 'text', defaultValue: '₹299' },
            { name: 'dmwPricePeriod', type: 'text', defaultValue: '/month' },
            { name: 'dmwSaveAmount', type: 'text', defaultValue: '₹20,000', admin: { description: 'Shown in the hero savings badge and again above the pricing table.' } },
            { name: 'dmwOnlineStoreLabel', type: 'text', defaultValue: 'Online Store' },
            { name: 'dmwOnlineStorePrice', type: 'text', defaultValue: '+ ₹999 Only' },
            { name: 'dmwTrustText', type: 'text', defaultValue: '350+ Businesses trust Nexovah' },
            { name: 'dmwAnnualPlanText', type: 'text', defaultValue: 'Annual Plan ₹3,999/yr. Save 15% + FREE Domain' },

            // Quick-form card — Step 1
            { name: 'dmwFormHeading', type: 'text', defaultValue: 'Your Website in 30 Seconds' },
            { name: 'dmwFormSubheading', type: 'text', defaultValue: 'Enter Business Details, See Your Website FREE' },
            { name: 'dmwFormBusinessPlaceholder', type: 'text', defaultValue: 'Enter business name' },
            { name: 'dmwFormDescPlaceholder', type: 'text', defaultValue: 'Describe your business, enter products, services, specialty to get best website' },
            { name: 'dmwFormButtonLabel', type: 'text', defaultValue: 'Get My Website' },
            {
              name: 'dmwFormButtonIcon',
              type: 'upload',
              relationTo: 'media',
              admin: { description: 'Icon shown on the left of the "Get My Website" button — used on both Step 1 and Step 2.' },
            },

            // Step 2 — "Continue to Chat with Us"
            { name: 'dmwStep2Heading', type: 'text', defaultValue: 'Continue to Chat with Us' },
            { name: 'dmwStep2Subheading', type: 'text', defaultValue: "Let's Build your custom designed website in Minutes" },
            { name: 'dmwStep2PhonePlaceholder', type: 'text', defaultValue: 'WhatsApp Number' },
            { name: 'dmwStep2NamePlaceholder', type: 'text', defaultValue: 'Enter Your Name' },
            { name: 'dmwStep2EmailPlaceholder', type: 'text', defaultValue: 'Your Email Address' },
            { name: 'dmwStep2ButtonLabel', type: 'text', defaultValue: 'Get My Website' },

            // Pricing comparison table
            { name: 'dmwPricingHeading', type: 'text', defaultValue: 'Build your Business, not just a Website' },
            {
              name: 'dmwPricingSections',
              type: 'array',
              labels: { singular: 'Pricing Section', plural: 'Pricing Sections' },
              fields: [
                { name: 'heading', type: 'text', required: true },
                {
                  name: 'rows',
                  type: 'array',
                  fields: [
                    { name: 'label', type: 'text', required: true },
                    { name: 'other', type: 'text', required: true },
                    { name: 'nexovah', type: 'text', required: true },
                  ],
                },
              ],
            },
            { name: 'dmwPricingTotalLabel', type: 'text', defaultValue: 'Total / Year' },
            { name: 'dmwPricingTotalOther', type: 'text', defaultValue: '₹25,999' },
            { name: 'dmwPricingTotalNexovah', type: 'text', defaultValue: '₹ 3,999 ONLY!' },

            // Client stories
            { name: 'dmwClientsHeadingLine1', type: 'text', defaultValue: '350+ Businesses' },
            { name: 'dmwClientsHeadingLine2', type: 'text', defaultValue: 'trust Nexovah Technology' },
            {
              name: 'dmwClientStories',
              type: 'array',
              labels: { singular: 'Client Story', plural: 'Client Stories' },
              fields: [
                { name: 'image', type: 'upload', relationTo: 'media' },
                { name: 'quote', type: 'text', required: true },
                { name: 'name', type: 'text' },
                { name: 'company', type: 'text' },
              ],
            },

            // How It Works — two full-width steps, right after the client-logo scroll
            { name: 'dmwHowItWorksHeading', type: 'text', defaultValue: 'How it Works' },
            {
              name: 'dmwHowItWorksSteps',
              type: 'array',
              label: 'How It Works — Steps',
              labels: { singular: 'Step', plural: 'Steps' },
              minRows: 0,
              maxRows: 2,
              admin: { description: 'Exactly 2 rows — each becomes one full-width card. Row order = display order (01, 02...).' },
              fields: [
                { name: 'heading', type: 'text', required: true },
                { name: 'description', type: 'textarea', required: true },
                { name: 'image', type: 'upload', relationTo: 'media', required: true, admin: { description: 'The device/screen mockup shown on the right side of this card.' } },
                { name: 'backgroundImage', type: 'upload', relationTo: 'media', admin: { description: 'The decorative mint-green card background with swirl lines. Leave empty to use the site default.' } },
              ],
            },

            // The Nexovah Advantage
            { name: 'dmwAdvantageHeading', type: 'text', defaultValue: 'The Nexovah Advantage' },
            {
              name: 'dmwAdvantageCards',
              type: 'array',
              labels: { singular: 'Advantage Card', plural: 'Advantage Cards' },
              fields: [
                { name: 'icon', type: 'upload', relationTo: 'media' },
                { name: 'title', type: 'text', required: true },
                {
                  name: 'items',
                  type: 'array',
                  fields: [{ name: 'text', type: 'text', required: true }],
                },
                { name: 'footer', type: 'textarea' },
              ],
            },
            { name: 'dmwAlwaysOnHeading', type: 'text', defaultValue: 'Always On, 100% Safe' },
            {
              name: 'dmwAlwaysOnItems',
              type: 'array',
              fields: [{ name: 'text', type: 'text', required: true }],
            },

            // See Before You Pay
            { name: 'dmwZeroRiskHeading', type: 'text', defaultValue: 'See Before You Pay' },
            { name: 'dmwZeroRiskBadgeText', type: 'text', defaultValue: 'Try with zero risk' },
            { name: 'dmwZeroRiskButtonLabel', type: 'text', defaultValue: 'Try for FREE' },
            {
              name: 'dmwZeroRiskItems',
              type: 'array',
              fields: [{ name: 'text', type: 'text', required: true }],
            },

            // Case Studies — static, non-clickable showcase cards (no links, no
            // "Explore More" button) so this landing page never routes a
            // visitor away mid-form. Same card design as the service pages'
            // Case Studies section.
            { name: 'dmwCaseStudiesHeading', type: 'text', defaultValue: 'Case Studies for Business Success' },
            {
              name: 'dmwCaseStudies',
              type: 'relationship',
              relationTo: 'showcases',
              hasMany: true,
              label: 'Case Studies to Feature',
              maxRows: 3,
              admin: { description: 'Pick up to 3 case studies. Leave empty to hide this section.' },
            },

            // Agency Partnerships
            { name: 'dmwAgencyHeadingPrefix', type: 'text', defaultValue: 'Agency', admin: { description: 'Rendered in dark text.' } },
            { name: 'dmwAgencyHeadingHighlight', type: 'text', defaultValue: 'Partnerships', admin: { description: 'Rendered in brand green.' } },
            { name: 'dmwAgencyDescription', type: 'textarea', defaultValue: 'If you are a freelancer, IT services firm or an agency, become an AI Agency with Open Weaver.' },
            {
              name: 'dmwAgencyItems',
              type: 'array',
              fields: [{ name: 'text', type: 'text', required: true }],
            },
            { name: 'dmwAgencyImage', type: 'upload', relationTo: 'media' },
            { name: 'dmwAgencyButtonLabel', type: 'text', defaultValue: 'Start your first Website Now' },
            { name: 'dmwAgencyContactLabel', type: 'text', defaultValue: 'Contact us' },
            { name: 'dmwAgencyContactEmail', type: 'text', defaultValue: 'hello@nexovah.com' },

            // FAQ
            { name: 'dmwFaqHeading', type: 'text', defaultValue: 'Frequently Asked Questions' },
            {
              name: 'dmwFaqs',
              type: 'array',
              fields: [
                { name: 'question', type: 'text', required: true },
                { name: 'answer', type: 'textarea', required: true },
              ],
            },

            // Sticky bottom bar
            { name: 'dmwStickyBarLabel', type: 'text', defaultValue: 'Try for FREE' },

            // Post-submit WhatsApp handoff — deliberately a separate raw number
            // from the sitewide footer WhatsApp button, which is a wa.link
            // shortener that ignores a ?text= override and always opens with
            // its own baked-in message. This page needs its own pre-filled
            // text, so it builds a direct wa.me link instead.
            {
              name: 'dmwWhatsappNumber',
              type: 'text',
              defaultValue: '918100388080',
              admin: { description: 'Raw WhatsApp number with country code, digits only (no +, spaces, or dashes) — e.g. 918100388080. Used to build the post-submit WhatsApp redirect link with a pre-filled message.' },
            },
            {
              name: 'dmwWhatsappMessage',
              type: 'textarea',
              defaultValue: 'Hi, I saw your Meta Ad and I’m interested in getting a website built for my business.',
              admin: { description: 'Pre-filled message that appears in the WhatsApp chat box after a lead submits the form.' },
            },
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
          label: 'We Are Hiring Content',
          description: 'Only used by the /we-are-hiring page.',
          admin: { condition: (data) => data?.slug === 'we-are-hiring' },
          fields: [
            { name: 'hiringEyebrow', type: 'text', defaultValue: 'WE ARE HIRING' },
            { name: 'hiringHeading', type: 'text', defaultValue: 'Top Job Openings' },
            { name: 'hiringDescription', type: 'textarea' },
            {
              name: 'hiringApplyEmail',
              type: 'email',
              admin: { description: 'Every "Apply Now" button opens the visitor\'s email client addressed here, subject pre-filled with the job title.' },
            },
            { name: 'hiringApplyButtonLabel', type: 'text', defaultValue: 'Apply Now' },
            {
              name: 'hiringJobs',
              type: 'array',
              labels: { singular: 'Job Opening', plural: 'Job Openings' },
              fields: [
                { name: 'title', type: 'text', required: true },
                { name: 'description', type: 'textarea', required: true },
              ],
            },
            { name: 'hiringCareerHeading', type: 'text', defaultValue: 'Your gateway to a shining career awaits' },
            { name: 'hiringCareerDescription', type: 'textarea' },
            {
              name: 'hiringCareerPoints',
              type: 'array',
              fields: [
                { name: 'heading', type: 'text', required: true },
                { name: 'desc', type: 'textarea', required: true },
              ],
            },
            {
              name: 'hiringPerks',
              type: 'array',
              labels: { singular: 'Perk', plural: 'Perks' },
              fields: [
                { name: 'title', type: 'text', required: true },
                { name: 'desc', type: 'textarea', required: true },
              ],
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
                {
                  name: 'image',
                  type: 'upload',
                  relationTo: 'media',
                  admin: { description: 'Shown in the sticky right-hand card as this industry scrolls into view — same crossfade treatment as the About page journey timeline.' },
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
