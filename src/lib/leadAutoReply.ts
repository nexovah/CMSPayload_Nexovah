import type { Payload } from 'payload'
import { substituteMergeTags } from './campaignSend'
import { sendEmail } from './sendEmail'

// The "Enquiry Receipt" template built for exactly this — auto-replying to
// Contact/Get-a-Quote form submissions the moment they land in Leads.
export const LEAD_AUTO_REPLY_TEMPLATE_ID = 4

type LeadLike = {
  id: string | number
  name: string
  email: string
  phone?: string | null
  message?: string | null
}

export async function sendLeadAutoReplyEmail(payload: Payload, lead: LeadLike): Promise<void> {
  const template = await payload.findByID({ collection: 'campaign-templates', id: LEAD_AUTO_REPLY_TEMPLATE_ID, depth: 0 })
  if (!template?.rawHtml) {
    throw new Error(`campaign-templates/${LEAD_AUTO_REPLY_TEMPLATE_ID} not found or has no HTML — cannot send lead auto-reply.`)
  }

  const subject = "We've received your message — Nexovah Technology"
  const settings = await payload.findGlobal({ slug: 'app-settings' })
  const serverUrl = settings.rootUrl || process.env.NEXT_PUBLIC_SERVER_URL || 'http://localhost:3456'
  // Reuses the exact same merge-tag engine campaigns use — {{first_name}},
  // {{full_name}}, {{email}}, {{country_code}} {{phone_number}}, {{message}}
  // are all filled from this lead's real submitted data.
  const html = substituteMergeTags(template.rawHtml, { name: lead.name, email: lead.email, phone: lead.phone }, subject, lead.message || '', serverUrl)

  await sendEmail(payload, { to: lead.email, subject, html })
}
