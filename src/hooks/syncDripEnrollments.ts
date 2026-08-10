import type { CollectionAfterChangeHook } from 'payload'
import { enrollContact } from '../lib/automationSend'

function toIds(value: unknown): string[] {
  if (!Array.isArray(value)) return []
  return value.map((v) => String(typeof v === 'object' && v ? (v as { id: string | number }).id : v))
}

// Keeps drip campaigns in sync with a contact's live group membership:
// joining a group the moment an active drip campaign targets it enrolls the
// contact at Step 1 (independent of how far along other contacts already
// are); leaving a group stops any further steps for that campaign
// immediately (per explicit product decision — no "let them finish").
export const syncDripEnrollments: CollectionAfterChangeHook = async ({ doc, previousDoc, operation, req }) => {
  const payload = req.payload
  const beforeIds = operation === 'create' ? [] : toIds(previousDoc?.groups)
  const afterIds = toIds(doc.groups)

  const addedGroupIds = afterIds.filter((id) => !beforeIds.includes(id))
  const removedGroupIds = beforeIds.filter((id) => !afterIds.includes(id))

  if (addedGroupIds.length > 0) {
    try {
      const campaigns = await payload.find({
        collection: 'campaigns',
        where: { and: [{ campaignType: { equals: 'drip' } }, { status: { equals: 'running' } }, { triggerGroup: { in: addedGroupIds } }] },
        limit: 200,
        depth: 0,
      })
      for (const campaign of campaigns.docs) {
        await enrollContact(payload, campaign.id, doc.id)
      }
    } catch (err) {
      payload.logger.error(`syncDripEnrollments: failed to enroll contact ${doc.id}: ${err instanceof Error ? err.message : err}`)
    }
  }

  if (removedGroupIds.length > 0) {
    try {
      const campaigns = await payload.find({
        collection: 'campaigns',
        where: { and: [{ campaignType: { equals: 'drip' } }, { triggerGroup: { in: removedGroupIds } }] },
        limit: 200,
        depth: 0,
      })
      const campaignIds = campaigns.docs.map((c) => c.id)
      if (campaignIds.length > 0) {
        const enrollments = await payload.find({
          collection: 'campaign-enrollments',
          where: { and: [{ campaign: { in: campaignIds } }, { contact: { equals: doc.id } }, { status: { equals: 'active' } }] },
          limit: 200,
          depth: 0,
        })
        for (const enrollment of enrollments.docs) {
          await payload.update({ collection: 'campaign-enrollments', id: enrollment.id, data: { status: 'removed' } })
        }
      }
    } catch (err) {
      payload.logger.error(`syncDripEnrollments: failed to remove enrollments for contact ${doc.id}: ${err instanceof Error ? err.message : err}`)
    }
  }

  return doc
}
