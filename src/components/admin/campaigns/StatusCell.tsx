'use client'

const STATUS_STYLE: Record<string, { bg: string; color: string; label: string }> = {
  draft: { bg: '#EDEDED', color: '#555', label: 'Draft' },
  scheduled: { bg: '#E0EAFF', color: '#3050B5', label: 'Scheduled' },
  running: { bg: '#FFF3CD', color: '#8A6D00', label: 'Running' },
  paused: { bg: '#FDE8D8', color: '#B85C00', label: 'Paused' },
  finished: { bg: '#D9F7E4', color: '#1A7F4E', label: 'Finished' },
  cancelled: { bg: '#FBDADA', color: '#B02A2A', label: 'Cancelled' },
}

// `useCellProps()` is meant for Payload's own internal DefaultCell rendering
// path, not custom Cell components — it returned null here, which is why
// this always silently fell back to "Draft" regardless of the real status.
// Custom Cell components receive their field's value directly as the
// `cellData` prop instead. `rowData` (the full doc) is also passed through
// by Payload's renderCell — used here to relabel 'running' as "Active" for
// drip campaigns specifically, since "Running"/"Sending" reads wrong for a
// drip that's just sitting there enrolling contacts over weeks/months.
export function StatusCell({ cellData, rowData }: { cellData?: string; rowData?: { campaignType?: string } }) {
  const isDrip = rowData?.campaignType === 'drip'
  const status =
    isDrip && cellData === 'running'
      ? { bg: '#D9F7E4', color: '#1A7F4E', label: 'Active' }
      : (STATUS_STYLE[cellData ?? 'draft'] ?? STATUS_STYLE.draft)

  return (
    <span
      style={{
        display: 'inline-block',
        padding: '3px 12px',
        borderRadius: 999,
        fontSize: 12,
        fontWeight: 600,
        background: status.bg,
        color: status.color,
      }}
    >
      {status.label}
    </span>
  )
}

export default StatusCell
