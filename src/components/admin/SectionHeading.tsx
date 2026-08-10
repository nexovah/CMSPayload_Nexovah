// Simple section-divider heading for grouping fields inside a tab (e.g. the
// "Subscriptions" / "Archive" groupings in Settings → General), matching the
// plain heading + divider style shown in the reference design.
export function SectionHeading({ label }: { label: string }) {
  return (
    <div style={{ marginTop: 'calc(var(--base) * 1.5)', marginBottom: 'var(--base)' }}>
      <h2 style={{ margin: 0, fontWeight: 600, fontSize: '1.4rem' }}>{label}</h2>
    </div>
  )
}

export default SectionHeading
