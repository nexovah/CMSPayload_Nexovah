'use client'

type GroupRef = { id: string | number; name?: string } | string | number

function label(g: GroupRef): string {
  return typeof g === 'object' && g ? g.name || String(g.id) : String(g)
}

// The list column is bound to `contactGroups` (one-shot campaigns), but a
// drip campaign targets contacts via `triggerGroup` instead — a different
// field. Without this, the column always reads `contactGroups`, which is
// empty for every drip row, showing "<No Contact Group>" even when a
// Trigger Group is set. `rowData` (the full doc) lets this pick the right
// field per row.
export function ContactGroupCell({ rowData }: { rowData?: { campaignType?: string; contactGroups?: GroupRef[]; triggerGroup?: GroupRef } }) {
  if (rowData?.campaignType === 'drip') {
    return <span>{rowData.triggerGroup ? label(rowData.triggerGroup) : '<No Trigger Group>'}</span>
  }
  const groups = rowData?.contactGroups ?? []
  return <span>{groups.length > 0 ? groups.map(label).join(', ') : '<No Contact Group>'}</span>
}

export default ContactGroupCell
