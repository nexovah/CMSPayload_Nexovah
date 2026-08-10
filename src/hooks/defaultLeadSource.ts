import type { CollectionBeforeChangeHook } from 'payload'

// Every lead submitted through our own site forms (Contact page, Get a Quote
// popup) has no way to pick a source — default it to "Website" so admins
// don't have to hand-tag the common case. Manual/API-created leads that
// already specify a source are left untouched.
export const defaultLeadSourceToWebsite: CollectionBeforeChangeHook = async ({ data, operation, req }) => {
  // Only auto-default public, unauthenticated form submissions (the actual Contact
  // page / Get a Quote popup). An admin manually creating or editing a Lead in the
  // CMS has already made a deliberate source choice — never override it here.
  if (operation !== 'create' || data.source || req.user) return data

  const existing = await req.payload.find({
    collection: 'lead-sources',
    where: { name: { equals: 'Website' } },
    limit: 1,
    overrideAccess: true,
  })

  const websiteSource =
    existing.docs[0] ??
    (await req.payload.create({
      collection: 'lead-sources',
      data: { name: 'Website' },
      overrideAccess: true,
    }))

  return { ...data, source: websiteSource.id }
}
