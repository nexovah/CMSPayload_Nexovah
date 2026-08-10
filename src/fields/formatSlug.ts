import type { FieldHook } from 'payload'

// Normalizes whatever is typed into a slug field into a clean, lowercase,
// hyphenated path segment on save. Only touches the value being written —
// existing stored slugs are left untouched until the doc is next saved.
export const formatSlug: FieldHook = ({ value }) => {
  if (typeof value !== 'string' || value.length === 0) return value
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}
