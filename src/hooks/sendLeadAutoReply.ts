import type { CollectionAfterChangeHook } from 'payload'
import { sendLeadAutoReplyEmail } from '../lib/leadAutoReply'

// Fires the moment a new Lead lands (Contact form, Get a Quote form, or the
// homepage popup — all post here). Deliberately NOT awaited: a slow or
// failing SMTP send must never delay or break the visitor's form submission
// response. Errors are logged, never thrown back into the request.
export const sendLeadAutoReply: CollectionAfterChangeHook = ({ doc, operation, req }) => {
  if (operation !== 'create') return doc

  void sendLeadAutoReplyEmail(req.payload, doc)
    .then(() => req.payload.logger.info(`Lead auto-reply sent to ${doc.email} (lead ${doc.id}).`))
    .catch((err) => req.payload.logger.error(`Lead auto-reply failed for lead ${doc.id}: ${err instanceof Error ? err.message : err}`))

  return doc
}
