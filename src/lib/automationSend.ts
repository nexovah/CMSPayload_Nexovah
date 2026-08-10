import type { Payload } from 'payload'
import type { CampaignEnrollment } from '../payload-types'
import { mergeContentIntoTemplate, sendToContact } from './campaignSend'

export type DripDelayUnit = 'minutes' | 'hours' | 'days' | 'weeks' | 'months'

export type DripStep = {
  id: string
  order: number
  delayValue: number
  delayUnit: DripDelayUnit
  templateId: string | number
  subject?: string
}

function parseSteps(raw: unknown): DripStep[] {
  if (!Array.isArray(raw)) return []
  return raw
    .filter((s): s is DripStep => Boolean(s) && typeof s === 'object' && 'templateId' in s)
    .sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
}

/** Adds a step's delay to `from`, using real calendar-month math for `months`. */
export function addStepDelay(from: Date, step: DripStep): Date {
  const result = new Date(from)
  switch (step.delayUnit) {
    case 'minutes':
      result.setMinutes(result.getMinutes() + step.delayValue)
      break
    case 'hours':
      result.setHours(result.getHours() + step.delayValue)
      break
    case 'days':
      result.setDate(result.getDate() + step.delayValue)
      break
    case 'weeks':
      result.setDate(result.getDate() + step.delayValue * 7)
      break
    case 'months':
      result.setMonth(result.getMonth() + step.delayValue)
      break
  }
  return result
}

/**
 * Enrolls a single contact into a drip campaign at Step 1, unless they're
 * already enrolled (one enrollment per contact per campaign — re-adding a
 * contact to the trigger group must not double-enroll them). Step 1 always
 * fires immediately (nextSendAt = now); its own delayValue/delayUnit, if
 * any, is ignored since there's no "previous step" to wait after.
 */
export async function enrollContact(payload: Payload, campaignId: string | number, contactId: string | number): Promise<void> {
  const existing = await payload.find({
    collection: 'campaign-enrollments',
    where: { and: [{ campaign: { equals: campaignId } }, { contact: { equals: contactId } }] },
    limit: 1,
    depth: 0,
  })
  if (existing.docs.length > 0) return

  await payload.create({
    collection: 'campaign-enrollments',
    data: {
      campaign: campaignId as number,
      contact: contactId as number,
      currentStepIndex: 0,
      nextSendAt: new Date().toISOString(),
      status: 'active',
      enrolledAt: new Date().toISOString(),
      history: [],
    },
  })

  const campaign = await payload.findByID({ collection: 'campaigns', id: campaignId, depth: 0 })
  await payload.update({
    collection: 'campaigns',
    id: campaignId,
    data: { totalEnrolled: (campaign?.totalEnrolled ?? 0) + 1 },
  })
}

/** Activates a drip campaign: flips status to 'running' and enrolls every current trigger-group member not already enrolled. */
export async function activateDripCampaign(payload: Payload, campaignId: string | number): Promise<{ enrolled: number }> {
  const campaign = await payload.findByID({ collection: 'campaigns', id: campaignId, depth: 0 })
  if (!campaign) throw new Error('Campaign not found.')
  if (campaign.campaignType !== 'drip') throw new Error('This is not a drip campaign.')
  const steps = parseSteps(campaign.steps)
  if (steps.length === 0) throw new Error('Add at least one step before activating this drip campaign.')
  const groupId = typeof campaign.triggerGroup === 'object' && campaign.triggerGroup ? campaign.triggerGroup.id : campaign.triggerGroup
  if (!groupId) throw new Error('Select a Trigger Group before activating this drip campaign.')

  const contactsRes = await payload.find({
    collection: 'contacts',
    where: { and: [{ groups: { in: [groupId] } }, { unsubscribed: { not_equals: true } }] },
    limit: 10000,
    depth: 0,
  })

  for (const contact of contactsRes.docs) {
    await enrollContact(payload, campaign.id, contact.id)
  }

  await payload.update({ collection: 'campaigns', id: campaign.id, data: { status: 'running', startedAt: campaign.startedAt || new Date().toISOString() } })
  return { enrolled: contactsRes.docs.length }
}

export async function pauseDripCampaign(payload: Payload, campaignId: string | number): Promise<void> {
  const campaign = await payload.findByID({ collection: 'campaigns', id: campaignId, depth: 0 })
  if (!campaign) throw new Error('Campaign not found.')
  if (campaign.campaignType !== 'drip') throw new Error('This is not a drip campaign.')
  await payload.update({ collection: 'campaigns', id: campaign.id, data: { status: campaign.status === 'paused' ? 'running' : 'paused' } })
}

/** Sends the current step to one enrollment's contact, then advances or completes it. */
async function advanceEnrollment(payload: Payload, enrollment: CampaignEnrollment, serverUrl: string): Promise<void> {
  const currentStepIndex = enrollment.currentStepIndex ?? 0
  const campaignId = typeof enrollment.campaign === 'object' && enrollment.campaign ? enrollment.campaign.id : enrollment.campaign
  const campaign = await payload.findByID({ collection: 'campaigns', id: campaignId, depth: 0 })
  if (!campaign || campaign.status !== 'running') return // paused/deleted — leave nextSendAt as-is, pick up later

  const steps = parseSteps(campaign.steps)
  const step = steps[currentStepIndex]
  if (!step) {
    await payload.update({ collection: 'campaign-enrollments', id: enrollment.id, data: { status: 'completed' } })
    return
  }

  const contactId = typeof enrollment.contact === 'object' && enrollment.contact ? enrollment.contact.id : enrollment.contact
  const contact = await payload.findByID({ collection: 'contacts', id: contactId, depth: 0 })
  if (!contact || contact.unsubscribed) {
    await payload.update({ collection: 'campaign-enrollments', id: enrollment.id, data: { status: 'unsubscribed' } })
    return
  }

  const template = await payload.findByID({ collection: 'campaign-templates', id: step.templateId, depth: 0 })
  if (!template?.rawHtml) return // misconfigured step — skip this tick, don't lose the enrollment
  const baseHtml = mergeContentIntoTemplate(template.rawHtml, '')
  const subject = step.subject || campaign.name

  try {
    await sendToContact(payload, { baseHtml, contact, subject, fromAddress: campaign.fromAddress, campaignId, serverUrl })
  } catch (err) {
    payload.logger.error(`Drip campaign ${campaignId} step ${currentStepIndex} failed for contact ${contactId}: ${err instanceof Error ? err.message : err}`)
    return // leave nextSendAt as-is, retry on the next tick
  }

  const history = Array.isArray(enrollment.history) ? enrollment.history : []
  const nextIndex = currentStepIndex + 1
  const nextStep = steps[nextIndex]

  await payload.update({
    collection: 'campaign-enrollments',
    id: enrollment.id,
    data: {
      currentStepIndex: nextIndex,
      nextSendAt: nextStep ? addStepDelay(new Date(), nextStep).toISOString() : null,
      status: nextStep ? 'active' : 'completed',
      history: [...history, { stepIndex: currentStepIndex, sentAt: new Date().toISOString() }],
    },
  })

  await payload.update({ collection: 'campaigns', id: campaignId, data: { sentCount: (campaign.sentCount ?? 0) + 1 } })
}

/** Called on an interval by the scheduler in payload.config.ts. */
export async function runDueAutomationSteps(payload: Payload): Promise<void> {
  const settings = await payload.findGlobal({ slug: 'app-settings' })
  const serverUrl = settings.rootUrl || process.env.NEXT_PUBLIC_SERVER_URL || 'http://localhost:3456'

  const due = await payload.find({
    collection: 'campaign-enrollments',
    where: { and: [{ status: { equals: 'active' } }, { nextSendAt: { less_than_equal: new Date().toISOString() } }] },
    limit: 200,
    depth: 0,
  })

  for (const enrollment of due.docs) {
    try {
      await advanceEnrollment(payload, enrollment, serverUrl)
    } catch (err) {
      payload.logger.error(`Drip enrollment ${enrollment.id} failed to advance: ${err instanceof Error ? err.message : err}`)
    }
  }
}
