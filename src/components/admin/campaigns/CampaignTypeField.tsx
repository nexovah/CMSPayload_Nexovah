'use client'

import React, { useEffect } from 'react'
import { useField, useDocumentInfo } from '@payloadcms/ui'
import { useSearchParams } from 'next/navigation'

type CampaignType = 'single' | 'drip'

// Backs the hidden-ish `campaignType` field. On a brand-new doc, reads
// `?campaignType=drip` from the URL (set by the "Drip Campaign" list action
// button) to pre-select the type before the user sees anything — after
// that it's just a normal select. `useField()` (not raw `dispatchFields`)
// is used deliberately: its own `setValue` already flips the form's
// `modified` flag, unlike bare `dispatchFields` (see AttachmentsField.tsx
// for the gotcha this avoids).
export function CampaignTypeField() {
  const { value, setValue } = useField<CampaignType>({ path: 'campaignType' })
  const { id } = useDocumentInfo()
  const searchParams = useSearchParams()

  useEffect(() => {
    if (id) return // only auto-set on a brand-new, unsaved doc
    const requested = searchParams?.get('campaignType')
    if (requested === 'drip' && value !== 'drip') setValue('drip')
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id])

  return (
    <div style={{ marginBottom: 'var(--base)' }}>
      <label style={{ display: 'block', fontSize: 13, fontWeight: 600, marginBottom: 6 }}>Type</label>
      <select
        value={value || 'single'}
        onChange={(e) => setValue(e.target.value as CampaignType)}
        style={{
          width: '100%',
          boxSizing: 'border-box',
          padding: '7px 9px',
          fontSize: 13,
          border: '1px solid var(--theme-elevation-150, #444)',
          borderRadius: 5,
          background: 'var(--theme-input-bg, transparent)',
          color: 'inherit',
        }}
      >
        <option value="single">Campaign</option>
        <option value="drip">Drip Campaign</option>
      </select>
      {value === 'drip' && (
        <p style={{ fontSize: 12, color: 'var(--theme-elevation-450)', margin: '6px 0 0' }}>
          Sends a timed sequence of steps to everyone in a Contact Group — including contacts added later.
        </p>
      )}
    </div>
  )
}

export default CampaignTypeField
