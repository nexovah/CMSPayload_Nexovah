import type { GlobalConfig, Field } from 'payload'

// Shared shape for every Trust/Tools icon slot: the image itself, plus alt text
// and an admin-facing name so each icon is identifiable and editable in Payload.
const iconGroupFields: Field[] = [
  { name: 'icon', type: 'upload', relationTo: 'media' },
  { name: 'alt', type: 'text', admin: { description: 'Alt text for this icon image.' } },
  { name: 'label', type: 'text', admin: { description: 'Admin-facing name for this icon, e.g. "Canva".' } },
]

// Kept intentionally minimal — only sitewide chrome that's identical across every
// page (Header, Footer, the Client Logos trust-bar, Marketing/SEO defaults).
// Anything specific to one page (Home, Contact, etc.) lives in the `pages` collection instead.
export const SiteSettings: GlobalConfig = {
  slug: 'site-settings',
  access: { read: () => true },
  fields: [
    {
      type: 'tabs',
      tabs: [
        {
          label: 'General',
          description: 'Core site-wide settings that differ between environments.',
          fields: [
            {
              name: 'baseUrl',
              type: 'text',
              required: true,
              defaultValue: 'https://nexovah.com',
              admin: {
                description:
                  'Full site URL with protocol, no trailing slash — e.g. https://nexovah.com in production, http://localhost:8443 in development. Used for canonical tags, Open Graph/Twitter URLs, JSON-LD structured data, and sitemap.xml. Change this one field when moving between environments; nothing else needs to change.',
              },
            },
          ],
        },
        {
          label: 'Header',
          fields: [
            {
              name: 'nav',
              type: 'array',
              fields: [
                { name: 'label', type: 'text', required: true },
                { name: 'url', type: 'text', required: true },
              ],
            },
            { name: 'ctaSupportLabel', type: 'text', defaultValue: 'Get Support' },
            { name: 'ctaSupportUrl', type: 'text', defaultValue: '/contact' },
            { name: 'ctaQuoteLabel', type: 'text', defaultValue: 'Request a Quote' },
            {
              name: 'ctaQuoteUrl',
              type: 'text',
              admin: { description: 'Leave blank to keep opening the built-in Get Quote popup. Set a URL to redirect instead.' },
            },
            {
              name: 'megaMenuGroups',
              type: 'array',
              admin: {
                description:
                  'The full-width "Services" mega menu dropdown. Each group becomes a column heading; each item is one clickable menu link. Link should be the path of any page/service/showcase/blog — e.g. "/services/ui-ux-design", "/case-studies/dropfio", "/blog/some-post", "/industries".',
              },
              fields: [
                { name: 'heading', type: 'text', required: true },
                {
                  name: 'items',
                  type: 'array',
                  fields: [
                    { name: 'name', type: 'text', required: true },
                    { name: 'slug', type: 'text' },
                    { name: 'link', type: 'text', required: true },
                  ],
                },
              ],
            },
          ],
        },
        {
          label: 'Footer',
          fields: [
            // Top CTA block
            { name: 'footerCtaHeadingLine1', type: 'text', defaultValue: 'Have a project in mind?' },
            { name: 'footerCtaHeadingLine2', type: 'text', defaultValue: 'Contact us Today' },
            { name: 'footerWhatsappButtonLabel', type: 'text', defaultValue: 'Lets Discuss on WhatsApp' },
            { name: 'footerWhatsappButtonUrl', type: 'text' },
            { name: 'footerCtaSubtextLine1', type: 'text', defaultValue: 'Take full confidence in control' },
            { name: 'footerCtaSubtextLine2', type: 'text', defaultValue: 'before you start a project with us' },

            // Contact + social block
            { name: 'dropLineLabel', type: 'text', defaultValue: 'Drop a line:' },
            { name: 'contactEmail', type: 'email' },
            { name: 'socialChannelsLabel', type: 'text', defaultValue: 'Social channels:' },
            { name: 'socialFacebookLabel', type: 'text', defaultValue: 'Facebook' },
            { name: 'socialFacebook', type: 'text' },
            { name: 'socialInstagramLabel', type: 'text', defaultValue: 'Instagram' },
            { name: 'socialInstagram', type: 'text' },
            { name: 'socialLinkedinLabel', type: 'text', defaultValue: 'LinkedIn' },
            { name: 'socialLinkedin', type: 'text' },
            { name: 'socialGoogleLabel', type: 'text', defaultValue: 'Google' },
            { name: 'socialGoogleUrl', type: 'text' },

            // Middle link columns
            {
              name: 'columns',
              type: 'array',
              fields: [
                { name: 'heading', type: 'text' },
                {
                  name: 'links',
                  type: 'array',
                  fields: [
                    { name: 'label', type: 'text' },
                    { name: 'url', type: 'text' },
                  ],
                },
              ],
            },

            // Newsletter block
            { name: 'newsletterHeading', type: 'text', defaultValue: 'Subscribe to our Newsletter' },
            { name: 'newsletterPlaceholder', type: 'text', defaultValue: 'Janecooper@gmail.com' },
            { name: 'newsletterButtonLabel', type: 'text', defaultValue: 'Submit' },

            // Quick links row under the newsletter
            {
              name: 'quickLinks',
              type: 'array',
              admin: { description: 'The small link row under the newsletter box (Case Studies, Blog, Privacy Policy, etc.)' },
              fields: [
                { name: 'label', type: 'text', required: true },
                { name: 'url', type: 'text' },
              ],
            },

            // Bottom bar
            { name: 'bottomText1', type: 'text' },
            { name: 'bottomText2', type: 'text' },
            { name: 'rightsReservedText', type: 'text', defaultValue: 'All rights reserved' },
            { name: 'copyrightText', type: 'text', defaultValue: '© 2026' },
          ],
        },
        {
          label: 'Client Logos',
          description: 'The "Trusted by 350+ businesses" marquee — identical on every page it appears on (Home, Contact, Company, Industries, Technology, Case Studies, Service pages), so it lives here rather than duplicated per page.',
          fields: [
            { name: 'clientLogosHeading', type: 'text' },
            {
              name: 'clientLogos',
              type: 'array',
              fields: [
                { name: 'logo', type: 'upload', relationTo: 'media', required: true },
                { name: 'alt', type: 'text', required: true },
                { name: 'height', type: 'number', defaultValue: 28 },
              ],
            },
          ],
        },
        {
          label: 'Trust And Tools',
          description: 'The "Don\'t take our word for it" / "The tools behind the work" banner — shared across the global footer and many pages.',
          fields: [
            { name: 'trustHeading', type: 'text', defaultValue: "Don't take our word for it" },
            {
              name: 'trustBody',
              type: 'textarea',
              defaultValue:
                'Verified Everywhere. Trusted, reviewed, and recommended across the platforms that matter. We are open for a project — lets discuss.',
            },
            { name: 'trustButtonLabel', type: 'text', defaultValue: 'Learn more' },
            { name: 'trustButtonUrl', type: 'text' },
            {
              type: 'collapsible',
              label: 'Trust Card Icons (green card badges)',
              admin: { description: 'Each icon below can be replaced, given alt text, and named — leave the icon empty to keep the original built-in icon.' },
              fields: [
                { name: 'trustIconGithubLeft', type: 'group', label: 'GoodFirms badge icon (card 1, top-left)', fields: iconGroupFields },
                { name: 'trustIconGoogleLeft', type: 'group', label: 'Google badge icon (card 2, top-middle)', fields: iconGroupFields },
                { name: 'trustIconFiverr', type: 'group', label: 'GitHub badge icon (card 3, top-right)', fields: iconGroupFields },
                { name: 'trustIconUpwork', type: 'group', label: 'Upwork badge icon (card 4, middle-left)', fields: iconGroupFields },
                { name: 'trustIconGoogleRight', type: 'group', label: 'Trustpilot badge icon (card 5, middle-middle)', fields: iconGroupFields },
                { name: 'trustIconTrustpilot', type: 'group', label: 'LinkedIn badge icon (card 7, bottom-left)', fields: iconGroupFields },
                { name: 'trustIconLinkedin', type: 'group', label: 'Freelancer badge icon (card 8, bottom-middle)', fields: iconGroupFields },
                { name: 'trustIconTwitter', type: 'group', label: 'Clutch badge icon (card 9, bottom-right)', fields: iconGroupFields },
              ],
            },
            {
              type: 'collapsible',
              label: 'Trust Card Captions',
              admin: { description: 'The small text shown inside each of the 9 white badge cards on the green card, in on-screen order (left-to-right, top-to-bottom).' },
              fields: [
                { name: 'trustCaption1', type: 'text', defaultValue: '4.6 Stars, 10 Reviews' },
                { name: 'trustCaption2', type: 'text', defaultValue: '4.6 Stars, 50+ Reviews' },
                { name: 'trustCaption3', type: 'text', defaultValue: '75+ Projects Repository' },
                { name: 'trustCaption4', type: 'text', defaultValue: '4.5 Stars, 32 Reviews' },
                { name: 'trustCaption5', type: 'text', defaultValue: '4.4 Stars, 40 Reviews' },
                { name: 'trustCaption6', type: 'text', defaultValue: '4.7 Stars, 550 Reviews' },
                { name: 'trustCaption7', type: 'text', defaultValue: '4.8 Stars, 07 Reviews' },
                { name: 'trustCaption8', type: 'text', defaultValue: '4.8 Stars, 371 Reviews' },
                { name: 'trustCaption9', type: 'text', defaultValue: '4.6 Stars, 05 Reviews' },
              ],
            },
            { name: 'toolsHeading', type: 'text', defaultValue: 'The tools behind the work' },
            {
              name: 'toolsBody',
              type: 'textarea',
              defaultValue:
                'The tools are not the advantage. The advantage is knowing which tool owns which job — and wiring them together so the output is faster, cleaner, and more consistent than any single tool could deliver alone.',
            },
            { name: 'toolsButtonLabel', type: 'text', defaultValue: 'Learn more' },
            { name: 'toolsButtonUrl', type: 'text' },
            {
              type: 'collapsible',
              label: 'Tool Icons (dark card grid)',
              admin: { description: 'Each icon below can be replaced, given alt text, and named — leave the icon empty to keep the original built-in icon.' },
              fields: [
                { name: 'toolIconCanva', type: 'group', label: 'Canva icon', fields: iconGroupFields },
                { name: 'toolIconLovable', type: 'group', label: 'Lovable icon', fields: iconGroupFields },
                { name: 'toolIconClaude', type: 'group', label: 'Claude icon', fields: iconGroupFields },
                { name: 'toolIconGemini', type: 'group', label: 'Gemini icon', fields: iconGroupFields },
                { name: 'toolIconHiggsfield', type: 'group', label: 'Higgsfield icon', fields: iconGroupFields },
                { name: 'toolIconMake', type: 'group', label: 'Make icon', fields: iconGroupFields },
                { name: 'toolIconChatgpt', type: 'group', label: 'ChatGPT icon', fields: iconGroupFields },
                { name: 'toolIconPerplexity', type: 'group', label: 'Perplexity icon', fields: iconGroupFields },
                { name: 'toolIconGithubRight', type: 'group', label: 'GitHub icon (right card)', fields: iconGroupFields },
              ],
            },
          ],
        },
        {
          label: 'CTA Banner',
          description: 'The dark "Ready to get personalised pricing?" banner — shared across Home + Blog (and its dotted background is reused by every Service page).',
          fields: [
            { name: 'ctaBannerBgImage', type: 'upload', relationTo: 'media' },
            {
              name: 'ctaBannerLogos',
              type: 'array',
              admin: { description: 'Partner logos shown in the middle of the banner (Google Cloud, Meta, AWS).' },
              fields: [
                { name: 'logo', type: 'upload', relationTo: 'media', required: true },
                { name: 'alt', type: 'text', required: true },
              ],
            },
            { name: 'ctaBannerTrustpilotIcon', type: 'upload', relationTo: 'media' },
          ],
        },
        {
          label: 'Modal Assets',
          description: 'Shared decorative graphics inside the Get a Quote / Contact success popups.',
          fields: [
            { name: 'modalSuccessCheckIcon', type: 'upload', relationTo: 'media' },
            { name: 'modalFormFooterImage', type: 'upload', relationTo: 'media' },
            { name: 'modalSuccessLineImage', type: 'upload', relationTo: 'media' },
          ],
        },
        {
          label: 'Marketing',
          fields: [
            { name: 'ga4Id', type: 'text' },
            { name: 'metaPixelId', type: 'text' },
            { name: 'robotsTxt', type: 'textarea' },
          ],
        },
        {
          label: 'Sitemap',
          description: 'Powers the visual /sitemap page (linked from the footer "Sitemap" link). Four streams branch off Home — Pages, Services, Case Studies, Blog by default — each holding its own list of links. Add, edit, reorder, or delete any stream or link here; the frontend tree updates automatically.',
          fields: [
            { name: 'sitemapHeading', type: 'text', defaultValue: 'Sitemap' },
            { name: 'sitemapIntro', type: 'textarea', admin: { description: 'Optional short line shown under the heading.' } },
            {
              name: 'sitemapStreams',
              type: 'array',
              admin: { description: 'Each row is one branch off the Home box (e.g. Pages, Services, Case Studies, Blog). Reorder by dragging.' },
              fields: [
                { name: 'title', type: 'text', required: true },
                {
                  name: 'links',
                  type: 'array',
                  fields: [
                    { name: 'label', type: 'text', required: true },
                    { name: 'url', type: 'text', required: true },
                  ],
                },
              ],
            },
          ],
        },
        {
          label: 'Cookie Consent',
          description: 'The "We value your privacy" popup shown on first visit.',
          fields: [
            { name: 'cookieConsentTitle', type: 'text', defaultValue: 'We value your privacy' },
            {
              name: 'cookieConsentBody',
              type: 'textarea',
              defaultValue:
                'We use cookies (including Google Analytics) to understand how visitors use our site and improve your experience. Read our',
              admin: { description: 'Shown before the "Privacy Policy" link, which always points to /privacy-policy.' },
            },
            { name: 'cookieConsentLinkLabel', type: 'text', defaultValue: 'Privacy Policy' },
            { name: 'cookieConsentLinkUrl', type: 'text', defaultValue: '/privacy-policy' },
            { name: 'cookieConsentAcceptLabel', type: 'text', defaultValue: 'Accept' },
            { name: 'cookieConsentDeclineLabel', type: 'text', defaultValue: 'Decline' },
          ],
        },
      ],
    },
  ],
}
