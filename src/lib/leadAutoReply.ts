import type { Payload } from 'payload'
import { substituteMergeTags } from './campaignSend'
import { sendEmail } from './sendEmail'

// Which template each form's auto-reply uses — matched by NAME, not a
// hardcoded id. Ids differ between environments (a template created on live
// after a DB sync won't exist locally with the same id, and vice versa), so
// a name lookup is the only thing that survives that.
const TEMPLATE_NAME_BY_FORM_TYPE: Record<string, string> = {
  quote: 'Get a Quote Response Template',
  contact: 'Contact Form Response Template',
}

const SERVICE_CATEGORY_LABELS: Record<string, string> = {
  'ui-ux-design': 'UI/UX Design',
  'web-design': 'Web Design',
  'application-development': 'Application Development',
  'ai-powered-website': 'AI Powered Website',
  'ai-powered-social-media-design': 'AI Powered Social Media Design',
  'mobile-app-development': 'Mobile App Development',
  'automation-service-integration': 'Automation Service Integration',
  'branding-design': 'Branding Design',
  'custom-services': 'Custom Services',
  other: 'Other',
}

const BUDGET_LABELS: Record<string, string> = {
  'inr-under-5k': 'Under 5K INR',
  'inr-5k-30k': '5K-30K INR',
  'inr-30k-100k': '30K-100K INR',
  'inr-1l-plus': '1L+ INR',
  'inr-5l-plus': '5L+ INR',
  'inr-10l-plus': '10L+ INR',
  'usd-under-100': 'Below $100',
  'usd-100-500': '$100 - $500',
  'usd-500-1000': '$500 - $1000',
  'usd-1000-2000': '$1000 - $2000',
  'usd-2000-5000': '$2000 - $5000',
  'usd-5000-10000': '$5000 - $10000',
  'usd-10000-above': '$10000 Above',
}

type LeadLike = {
  id: string | number
  name: string
  email: string
  phone?: string | null
  message?: string | null
  formType?: string | null
  companyName?: string | null
  website?: string | null
  serviceCategory?: string | null
  timelineDays?: number | null
  budget?: string | null
  createdAt?: string
}

async function findTemplateByName(payload: Payload, name: string) {
  const res = await payload.find({ collection: 'campaign-templates', where: { name: { equals: name } }, limit: 1 })
  return res.docs[0]
}

// e.g. "24 Aug 2026, 4:32 PM IST" — the actual send-time timestamp, per the
// template's own comment: "{{submission_date}} must be populated ... with
// the actual enquiry date & time at send time."
function formatSubmissionDate(iso?: string): string {
  const date = iso ? new Date(iso) : new Date()
  const formatted = new Intl.DateTimeFormat('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
    timeZone: 'Asia/Kolkata',
  }).format(date)
  return `${formatted} IST`
}

// Fills the tags substituteMergeTags (the shared campaign engine) doesn't
// know about — these are specific to the lead-reply templates (Get a Quote's
// step-2 "Project details" fields, plus the date/recipient/unsubscribe tags
// every lead-reply template shares).
function fillLeadOnlyTags(
  html: string,
  lead: LeadLike,
  recipientEmail: string,
  headlineLink: string,
  unsubscribeUrl: string,
): string {
  return html
    .replace(/\{\{\s*submission_date\s*\}\}/gi, formatSubmissionDate(lead.createdAt))
    .replace(/\{\{\s*recipient_email\s*\}\}/gi, recipientEmail)
    .replace(/\{\{\s*company_name\s*\}\}/gi, lead.companyName || '—')
    .replace(/\{\{\s*website\s*\}\}/gi, lead.website || '—')
    .replace(/\{\{\s*service_category\s*\}\}/gi, (lead.serviceCategory && SERVICE_CATEGORY_LABELS[lead.serviceCategory]) || '—')
    .replace(/\{\{\s*timeline_days\s*\}\}/gi, lead.timelineDays != null ? String(lead.timelineDays) : '—')
    .replace(/\{\{\s*budget_range\s*\}\}/gi, (lead.budget && BUDGET_LABELS[lead.budget]) || '—')
    .replace(/\{\{\s*headline_link\s*\}\}/gi, headlineLink)
    .replace(/\{\{\s*unsubscribe_url\s*\}\}/gi, unsubscribeUrl)
}

export async function sendLeadAutoReplyEmail(payload: Payload, lead: LeadLike): Promise<void> {
  const templateName = TEMPLATE_NAME_BY_FORM_TYPE[lead.formType || '']
  if (!templateName) return // formType not covered by a lead-reply template (e.g. 'crm') — nothing to send

  const template = await findTemplateByName(payload, templateName)
  if (!template?.rawHtml) {
    throw new Error(`Campaign template "${templateName}" not found — cannot send lead auto-reply.`)
  }

  const appSettings = await payload.findGlobal({ slug: 'app-settings' })
  const siteSettings = await payload.findGlobal({ slug: 'site-settings' })
  // rootUrl is the public marketing site (nexovah.com), used for the
  // template's own asset/link tags — server_url stays the CMS's own URL,
  // used internally for any {{server_url}}-tagged asset paths.
  const headlineLink = siteSettings.baseUrl || appSettings.rootUrl || 'https://nexovah.com'
  const serverUrl = appSettings.rootUrl || process.env.NEXT_PUBLIC_SERVER_URL || 'http://localhost:3456'

  const subject =
    lead.formType === 'quote'
      ? "We've received your quote request — Nexovah Technology"
      : "We've received your message — Nexovah Technology"

  // Synced Contact record for the unsubscribe link — looked up independently
  // rather than relying on doc.contact from an earlier afterChange hook in
  // the same chain, since syncContactAfterLeadChange updates the DB directly
  // without mutating the doc object passed on to later hooks.
  let unsubscribeUrl = `${headlineLink}/contact`
  try {
    const found = await payload.find({ collection: 'contacts', where: { email: { equals: lead.email } }, limit: 1 })
    const contactId = found.docs[0]?.id
    if (contactId) unsubscribeUrl = `${serverUrl}/api/contacts/${contactId}/unsubscribe`
  } catch {
    // keep the /contact fallback
  }

  // Shared merge tags (name/email/phone/message) filled once — the
  // per-recipient tags (recipient_email, etc) are filled separately below
  // for each send, since {{recipient_email}} must differ per recipient.
  const baseHtml = substituteMergeTags(
    template.rawHtml,
    { name: lead.name, email: lead.email, phone: lead.phone },
    subject,
    lead.message || '',
    serverUrl,
  )

  // 1. To the person who submitted the form.
  const submitterHtml = fillLeadOnlyTags(baseHtml, lead, lead.email, headlineLink, unsubscribeUrl)
  await sendEmail(payload, { to: lead.email, subject, html: submitterHtml })

  // 2. To the configured admin notification address(es) — falls back to the
  // public site's contact email if none are set in Email Settings.
  const adminEmails = (appSettings.adminNotificationEmails || siteSettings.contactEmail || '')
    .split(',')
    .map((s: string) => s.trim())
    .filter(Boolean)

  for (const adminEmail of adminEmails) {
    const adminHtml = fillLeadOnlyTags(baseHtml, lead, adminEmail, headlineLink, unsubscribeUrl)
    await sendEmail(payload, { to: adminEmail, subject: `[New Lead] ${subject}`, html: adminHtml })
  }
}
