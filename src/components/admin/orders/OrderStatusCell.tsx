'use client'

const STATUS_STYLE: Record<string, { bg: string; color: string; label: string }> = {
  created: { bg: '#FFF3CD', color: '#8A6D00', label: 'Created (awaiting payment)' }, // pending — yellow
  paid: { bg: '#D9F7E4', color: '#1A7F4E', label: 'Paid' }, // green
  failed: { bg: '#FBDADA', color: '#B02A2A', label: 'Failed' }, // red
  cancelled: { bg: '#EDEDED', color: '#555', label: 'Cancelled' }, // neutral
  refunded: { bg: '#FBDADA', color: '#B02A2A', label: 'Refunded' }, // red
}

// See StatusCell.tsx in components/admin/campaigns for why `cellData` (not
// `useCellProps()`) is the correct way to read a custom Cell's own value.
export function OrderStatusCell({ cellData }: { cellData?: string }) {
  const status = STATUS_STYLE[cellData ?? 'created'] ?? STATUS_STYLE.created
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
        whiteSpace: 'nowrap',
      }}
    >
      {status.label}
    </span>
  )
}

export default OrderStatusCell
