import type { Payload } from 'payload'
import { sendEmail, SendEmailError, DailyLimitReachedError } from './sendEmail'

export function mergeContentIntoTemplate(templateHtml: string, content: string): string {
  return templateHtml.replace(/\{\{\s*template\s+"content"\s+\.\s*\}\}/g, content)
}

type Contact = { name?: string | null; email: string; phone?: string | null }

/**
 * Splits a stored phone value into a leading country code (e.g. "+91") and
 * the rest, best-effort — Contacts/Leads only ever stored one combined
 * `phone` field, there's no separate country-code field anywhere in the
 * schema, so this is a guess, not authoritative data.
 */
function splitPhone(phone: string | null | undefined): { countryCode: string; number: string } {
  if (!phone) return { countryCode: '', number: '' }
  const match = phone.trim().match(/^(\+\d{1,3})[\s-]?(.*)$/)
  return match ? { countryCode: match[1], number: match[2] } : { countryCode: '', number: phone.trim() }
}

/**
 * Substitutes every merge-tag style this app's templates use with a specific
 * contact's real data: both the `{{ .Subscriber.X }}` Go-template style used
 * by templates built in the visual editor, and the plain `{{first_name}}`
 * style used by templates pasted in from elsewhere (e.g. the site's own
 * enquiry-receipt email). Anything with no backing data (there's no
 * `country_code` field anywhere in the schema, and `message` only exists on
 * a linked Lead, not the Contact itself) is substituted with an empty string
 * rather than left as a literal unfilled `{{tag}}` in the sent email.
 */
export function substituteMergeTags(html: string, contact: Contact, subject: string, message = '', serverUrl = ''): string {
  const fullName = contact.name || ''
  const [firstName, ...rest] = fullName.split(' ')
  const lastName = rest.join(' ')
  const { countryCode, number: phoneNumber } = splitPhone(contact.phone)

  return html
    // Go-template style (visual/HTML editor templates)
    .replace(/\{\{\s*\.Campaign\.Subject\s*\}\}/g, subject)
    .replace(/\{\{\s*\.Subscriber\.Name\s*\}\}/g, fullName)
    .replace(/\{\{\s*\.Subscriber\.FirstName\s*\}\}/g, firstName || fullName)
    .replace(/\{\{\s*\.Subscriber\.LastName\s*\}\}/g, lastName)
    .replace(/\{\{\s*\.Subscriber\.Email\s*\}\}/g, contact.email)
    // Plain mustache style (pasted-in templates like the enquiry receipt)
    .replace(/\{\{\s*first_name\s*\}\}/gi, firstName || fullName)
    .replace(/\{\{\s*full_name\s*\}\}/gi, fullName)
    .replace(/\{\{\s*email\s*\}\}/gi, contact.email)
    .replace(/\{\{\s*country_code\s*\}\}/gi, countryCode)
    .replace(/\{\{\s*phone_number\s*\}\}/gi, phoneNumber)
    .replace(/\{\{\s*message\s*\}\}/gi, message)
    // Server domain — resolved dynamically at send time so image/asset URLs
    // never need to be hardcoded in a template (works on localhost today,
    // auto-updates once deployed to a real domain).
    .replace(/\{\{\s*server_url\s*\}\}/gi, serverUrl)
}

/**
 * Rewrites a per-contact copy of the HTML with real tracking wired in: every
 * link routed through a click-logging redirect, a 1x1 open-tracking pixel,
 * and (unless the content already has its own) an unsubscribe footer link.
 * This is what actually populates the Views/Clicks/Unsubscribes numbers the
 * analytics dashboard reads — nothing is hardcoded, it only ever shows real
 * events these links produce when a recipient opens the mail or clicks in it.
 */
export function injectTracking(
  html: string,
  campaignId: string | number,
  contactId: string | number,
  serverUrl: string,
): string {
  let out = html.replace(/href="(https?:\/\/[^"]+)"/gi, (match, url: string) => {
    if (url.includes('/api/campaigns/')) return match // already a tracking link
    const redirect = `${serverUrl}/api/campaigns/${campaignId}/click?c=${encodeURIComponent(String(contactId))}&u=${encodeURIComponent(url)}`
    return `href="${redirect}"`
  })

  if (!/unsubscribe/i.test(out)) {
    const unsubUrl = `${serverUrl}/api/campaigns/${campaignId}/unsubscribe?c=${encodeURIComponent(String(contactId))}`
    const footer = `<p style="text-align:center;font-size:12px;color:#999;margin-top:24px;">Don't want these emails? <a href="${unsubUrl}" style="color:#999;">Unsubscribe</a></p>`
    out = /<\/body>/i.test(out) ? out.replace(/<\/body>/i, `${footer}</body>`) : `${out}${footer}`
  }

  const pixel = `<img src="${serverUrl}/api/campaigns/${campaignId}/open?c=${encodeURIComponent(String(contactId))}" width="1" height="1" alt="" style="display:none" />`
  out = /<\/body>/i.test(out) ? out.replace(/<\/body>/i, `${pixel}</body>`) : `${out}${pixel}`

  return out
}

type SendableContact = { id: string | number; name?: string | null; email: string; phone?: string | null }

/**
 * Sends one email to one contact: resolves their most recent Lead message
 * (best-effort), substitutes merge tags, injects tracking, and sends via the
 * shared SMTP transport. Shared by one-shot campaign sends and drip-step
 * sends so the two never drift apart in behavior.
 */
export async function sendToContact(
  payload: Payload,
  args: {
    baseHtml: string
    contact: SendableContact
    subject: string
    fromAddress?: string | null
    campaignId: string | number
    serverUrl: string
  },
): Promise<void> {
  let message = ''
  try {
    const leads = await payload.find({
      collection: 'leads',
      where: { contact: { equals: args.contact.id } },
      sort: '-updatedAt',
      limit: 1,
      depth: 0,
    })
    message = leads.docs[0]?.message || ''
  } catch {
    // no linked lead / lookup failed — leave message blank, not fatal
  }

  const merged = substituteMergeTags(args.baseHtml, args.contact, args.subject, message, args.serverUrl)
  const html = injectTracking(merged, args.campaignId, args.contact.id, args.serverUrl)
  await sendEmail(payload, { to: args.contact.email, subject: args.subject, html, from: args.fromAddress || undefined })
}

async function buildBaseHtml(payload: Payload, campaign: { content?: string | null; template?: unknown }): Promise<string> {
  let html = campaign.content || ''
  if (campaign.template) {
    const templateId = typeof campaign.template === 'object' && campaign.template ? (campaign.template as { id: string | number }).id : campaign.template
    const template = await payload.findByID({ collection: 'campaign-templates', id: templateId as string | number, depth: 0 })
    if (template?.rawHtml) html = mergeContentIntoTemplate(template.rawHtml, html)
  }
  return html
}

/**
 * Sends a campaign to every contact across its selected Contact Groups.
 * Runs synchronously (used both for an immediate "Send Now" request and for
 * the background scheduler firing a due scheduled campaign) — the caller is
 * responsible for not awaiting this in a way that blocks an HTTP response for
 * a very large list; for the batch sizes this app deals with today, a direct
 * await is simple and predictable.
 */
export async function executeCampaignSend(payload: Payload, campaignId: string | number): Promise<void> {
  const campaign = await payload.findByID({ collection: 'campaigns', id: campaignId, depth: 0 })
  if (!campaign) throw new Error('Campaign not found.')

  const groupIds = (campaign.contactGroups ?? []).map((g) => (typeof g === 'object' && g ? g.id : g))
  if (groupIds.length === 0) throw new Error('This campaign has no Contact Group selected.')

  const baseHtml = await buildBaseHtml(payload, campaign)
  if (!baseHtml) throw new Error('This campaign has no content to send.')

  // Resuming after a daily-limit pause: pick up only contacts not already
  // sent to in a prior run of this same campaign.
  const isResume = campaign.pausedReason === 'daily_limit'
  const alreadySentIds = isResume && Array.isArray(campaign.sentContactIds) ? (campaign.sentContactIds as (string | number)[]) : []

  const contactsRes = await payload.find({
    collection: 'contacts',
    where: {
      and: [
        { groups: { in: groupIds } },
        { unsubscribed: { not_equals: true } },
        ...(alreadySentIds.length > 0 ? [{ id: { not_in: alreadySentIds } }] : []),
      ],
    },
    limit: 10000,
    depth: 0,
  })
  const contacts = contactsRes.docs
  if (contacts.length === 0) {
    if (isResume) {
      // Nothing left to send — the prior run already covered everyone.
      await payload.update({
        collection: 'campaigns',
        id: campaignId,
        data: { status: 'finished', endedAt: new Date().toISOString(), pausedReason: null },
      })
      return
    }
    throw new Error('The selected Contact Group(s) have no (subscribed) contacts in them.')
  }

  const settings = await payload.findGlobal({ slug: 'app-settings' })
  const messageRate = settings.messageRate && settings.messageRate > 0 ? settings.messageRate : 5
  const delayMs = Math.max(50, Math.round(1000 / messageRate))
  const serverUrl = settings.rootUrl || process.env.NEXT_PUBLIC_SERVER_URL || 'http://localhost:3456'

  if (!isResume) {
    await payload.update({
      collection: 'campaigns',
      id: campaignId,
      data: { status: 'running', startedAt: new Date().toISOString(), totalRecipients: contacts.length, sentCount: 0, bounces: 0 },
    })
  }

  let sent = isResume ? (campaign.sentCount ?? 0) : 0
  let bounced = isResume ? (campaign.bounces ?? 0) : 0
  const sentIds: (string | number)[] = [...alreadySentIds]
  const subject = campaign.subject || campaign.name

  for (const contact of contacts) {
    try {
      await sendToContact(payload, {
        baseHtml,
        contact,
        subject,
        fromAddress: campaign.fromAddress,
        campaignId,
        serverUrl,
      })
      sent += 1
      sentIds.push(contact.id)
    } catch (err) {
      if (err instanceof DailyLimitReachedError) {
        // Stop here, not an error — the daily quota just needs to clear.
        // resumeDailyLimitPausedCampaigns picks this back up tomorrow,
        // skipping everyone already in sentIds.
        await payload.update({
          collection: 'campaigns',
          id: campaignId,
          data: { status: 'paused', pausedReason: 'daily_limit', sentContactIds: sentIds, sentCount: sent, bounces: bounced },
        })
        payload.logger.info(`Campaign ${campaignId} paused: ${err.message}`)
        return
      }
      bounced += 1
      // A single bad address/provider hiccup shouldn't abort the whole send —
      // log and keep going. Real bounce tracking (inbound webhook, DSN
      // parsing) isn't built; this counts hard SMTP-time send failures only.
      payload.logger.error(`Campaign ${campaignId} failed to send to ${contact.email}: ${err instanceof SendEmailError ? err.message : err}`)
    }
    await new Promise((resolve) => setTimeout(resolve, delayMs))
  }

  await payload.update({
    collection: 'campaigns',
    id: campaignId,
    data: { status: 'finished', endedAt: new Date().toISOString(), sentCount: sent, bounces: bounced, pausedReason: null, sentContactIds: sentIds },
  })
}

/**
 * Resumes one-shot campaigns paused mid-send by the active provider's daily
 * limit, once a new day has begun since they were paused (so the limit has
 * had a chance to reset). Registered on the same interval pattern as
 * runDueScheduledCampaigns / runDueAutomationSteps.
 */
export async function resumeDailyLimitPausedCampaigns(payload: Payload): Promise<void> {
  const paused = await payload.find({
    collection: 'campaigns',
    where: { and: [{ status: { equals: 'paused' } }, { pausedReason: { equals: 'daily_limit' } }] },
    limit: 50,
    depth: 0,
  })
  const today = new Date().toISOString().slice(0, 10)
  for (const campaign of paused.docs) {
    const pausedDate = (campaign.updatedAt || '').slice(0, 10)
    if (pausedDate === today) continue // same day it was paused — quota hasn't had a chance to reset yet
    try {
      await executeCampaignSend(payload, campaign.id)
    } catch (err) {
      payload.logger.error(`Failed to resume daily-limit-paused campaign ${campaign.id}: ${err instanceof Error ? err.message : err}`)
    }
  }
}

/** Called on an interval by the scheduler in payload.config.ts. */
export async function runDueScheduledCampaigns(payload: Payload): Promise<void> {
  const due = await payload.find({
    collection: 'campaigns',
    where: { and: [{ status: { equals: 'scheduled' } }, { sendAt: { less_than_equal: new Date().toISOString() } }] },
    limit: 50,
    depth: 0,
  })
  for (const campaign of due.docs) {
    try {
      await executeCampaignSend(payload, campaign.id)
    } catch (err) {
      payload.logger.error(`Scheduled campaign ${campaign.id} failed to send: ${err instanceof Error ? err.message : err}`)
    }
  }
}
