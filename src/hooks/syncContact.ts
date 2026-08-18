import type { CollectionAfterChangeHook } from 'payload'

// Leads submitted through specific forms auto-join their matching Contact to a
// dedicated Contact Group — the group must already exist (created manually in
// the admin); this only links to it, never creates it, so a typo here can't
// spawn a stray duplicate group.
const FORM_TYPE_TO_GROUP_NAME: Record<string, string> = {
  'design-my-website': 'Design My Website Ad Campaign',
}

// After a lead is created, find-or-create a matching Contacts record by email
// and link it — turns a flat form log into an actual deduplicated customer list.
export const syncContactAfterLeadChange: CollectionAfterChangeHook = async ({ doc, req, operation }) => {
  if (operation !== 'create') return doc
  if (!doc.email) return doc

  const { payload } = req

  const existing = await payload.find({
    collection: 'contacts',
    where: { email: { equals: doc.email } },
    limit: 1,
  })

  let contactId: number
  let currentGroups: number[] = []

  if (existing.docs.length > 0) {
    const contact = existing.docs[0]
    contactId = contact.id
    currentGroups = (contact.groups ?? []).map((g) => (typeof g === 'object' && g ? g.id : g))
    await payload.update({
      collection: 'contacts',
      id: contactId,
      data: {
        phone: doc.phone || contact.phone,
        name: doc.name || contact.name,
      },
    })
  } else {
    const created = await payload.create({
      collection: 'contacts',
      data: {
        name: doc.name || doc.email,
        email: doc.email,
        phone: doc.phone,
        source: doc.source,
      },
    })
    contactId = created.id
  }

  // Auto-join the form-specific Contact Group, if one is configured for this formType.
  const groupName = FORM_TYPE_TO_GROUP_NAME[doc.formType as string]
  if (groupName) {
    const group = await payload.find({
      collection: 'contact-groups',
      where: { name: { equals: groupName } },
      limit: 1,
      overrideAccess: true,
    })
    const groupDoc = group.docs[0]
    if (groupDoc && !currentGroups.includes(groupDoc.id)) {
      await payload.update({
        collection: 'contacts',
        id: contactId,
        data: { groups: [...currentGroups, groupDoc.id] },
      })
    }
  }

  await payload.update({
    collection: 'leads',
    id: doc.id,
    data: { contact: contactId },
    depth: 0,
  })

  return doc
}
