import type { CollectionBeforeChangeHook } from 'payload'

// Every lead submitted through our own site forms (Contact page, Get a Quote
// popup, Design My Website form) has no way to pick a source — default it so
// admins don't have to hand-tag the common case. Manual/API-created leads
// that already specify a source are left untouched. The Design My Website
// form is always tagged with its own dedicated source so it stays reportable
// separately from generic "Website" traffic.
export const defaultLeadSourceToWebsite: CollectionBeforeChangeHook = async ({ data, operation, req }) => {
  // Only auto-default public, unauthenticated form submissions. An admin manually
  // creating or editing a Lead in the CMS has already made a deliberate source
  // choice — never override it here.
  if (operation !== 'create' || data.source || req.user) return data

  const sourceName = data.formType === 'design-my-website' ? 'Design My Website Form' : 'Website'

  const existing = await req.payload.find({
    collection: 'lead-sources',
    where: { name: { equals: sourceName } },
    limit: 1,
    overrideAccess: true,
  })

  const resolvedSource =
    existing.docs[0] ??
    (await req.payload.create({
      collection: 'lead-sources',
      data: { name: sourceName },
      overrideAccess: true,
    }))

  return { ...data, source: resolvedSource.id }
}
