// Placeholder shown for Settings sections not built yet (no fields, no data).
export function UnderConstruction() {
  return (
    <div
      style={{
        padding: 'calc(var(--base) * 1.5)',
        border: '1px dashed var(--theme-elevation-200)',
        borderRadius: 'var(--style-radius-m)',
        color: 'var(--theme-elevation-450)',
      }}
    >
      🚧 Under construction — this section will be built in the next phase.
    </div>
  )
}

export default UnderConstruction
