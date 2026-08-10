import type { CollectionAfterChangeHook } from 'payload'

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

  let contactId: string | number

  if (existing.docs.length > 0) {
    const contact = existing.docs[0]
    contactId = contact.id
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

  await payload.update({
    collection: 'leads',
    id: doc.id,
    data: { contact: contactId },
    depth: 0,
  })

  return doc
}
