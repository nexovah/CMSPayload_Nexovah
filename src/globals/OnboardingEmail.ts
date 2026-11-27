import type { GlobalConfig } from 'payload'

// The post-purchase onboarding email — sent once per paid Order, a fixed
// delay after the order confirmation email (see lib/onboardingEmail.ts).
// The form link and button label live here (not baked into the template's
// HTML) so they can be changed without touching the email's rich-text
// content at all.
export const OnboardingEmail: GlobalConfig = {
  slug: 'onboarding-email',
  label: 'Onboarding Email',
  admin: {
    description: 'Sent automatically a fixed delay after a paid order\'s confirmation email, asking the customer to fill the business onboarding form. Content/layout is edited on the selected Email Template below — this page only holds the form link, button text, subject and timing.',
    group: 'Sales',
  },
  access: { read: ({ req }) => Boolean(req.user) },
  fields: [
    { name: 'enabled', type: 'checkbox', defaultValue: true, label: 'Send this email' },
    {
      name: 'delaySeconds',
      type: 'number',
      defaultValue: 60,
      label: 'Delay After Order Confirmation (seconds)',
      admin: { description: 'How long after the order confirmation email this one goes out. Checked every 60 seconds, so actual timing can run up to a minute later than this value.' },
    },
    { name: 'template', type: 'relationship', relationTo: 'campaign-templates', label: 'Email Template' },
    { name: 'subject', type: 'text', defaultValue: 'Action Required: Complete Your Business Onboarding | Nexovah Technology' },
    {
      name: 'onboardingFormUrl',
      type: 'text',
      label: 'Onboarding Form URL',
      defaultValue: 'https://forms.gle/CLZKpPaNS5mLsPFc6',
      admin: { description: 'The Google Form (or any form) link the button opens. Available in the template as {{onboarding_form_url}}.' },
    },
    {
      name: 'buttonLabel',
      type: 'text',
      defaultValue: 'Submit Business Onboarding Form',
      admin: { description: 'Available in the template as {{onboarding_button}} (renders the full button, not just this text).' },
    },
  ],
}
