'use client'

import React, { useState } from 'react'
import { useField, useFormFields } from '@payloadcms/ui'

const OPTIONS: { label: string; value: string }[] = [
  { label: 'Created (awaiting payment)', value: 'created' },
  { label: 'Paid', value: 'paid' },
  { label: 'Failed', value: 'failed' },
  { label: 'Cancelled', value: 'cancelled' },
  { label: 'Refunded', value: 'refunded' },
]

const CODE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789' // no 0/O/1/l/i — avoids ambiguous characters in a code someone has to type back
function generateCode(): string {
  let code = ''
  for (let i = 0; i < 9; i++) code += CODE_CHARS[Math.floor(Math.random() * CODE_CHARS.length)]
  return code
}

// Changing an Order's status is high-stakes (Refunded actually calls
// Razorpay — see Orders.ts's beforeChange hook, which is the real
// enforcement). This is a UI-level friction gate on top of that: picking a
// new status doesn't apply it immediately — a modal shows a fresh random
// 9-character code (case-sensitive) that must be typed back exactly before
// the change is accepted. Cancelling the modal reverts the dropdown.
export function StatusConfirmField() {
  const { value, setValue } = useField<string>({ path: 'status' })
  // Read-only lookups into sibling fields — just for the modal's own
  // "confirm you mean this" copy, not written to.
  const orderNumber = useFormFields(([fields]) => fields?.orderNumber?.value as string | undefined)

  const [pendingStatus, setPendingStatus] = useState<string | null>(null)
  const [challengeCode, setChallengeCode] = useState('')
  const [typedCode, setTypedCode] = useState('')
  const [error, setError] = useState<string | null>(null)

  const openChallenge = (newStatus: string) => {
    setPendingStatus(newStatus)
    setChallengeCode(generateCode())
    setTypedCode('')
    setError(null)
  }

  const cancel = () => {
    setPendingStatus(null)
    setTypedCode('')
    setError(null)
  }

  const confirm = () => {
    if (typedCode !== challengeCode) {
      setError('Code does not match — check upper/lowercase and try again.')
      return
    }
    if (pendingStatus) setValue(pendingStatus)
    setPendingStatus(null)
    setTypedCode('')
    setError(null)
  }

  return (
    <div style={{ marginBottom: 'var(--base)' }}>
      <label style={{ display: 'block', fontSize: 13, fontWeight: 600, marginBottom: 6 }}>
        Status <span style={{ color: '#E5484D' }}>*</span>
      </label>
      <select
        value={value || 'created'}
        onChange={(e) => openChallenge(e.target.value)}
        style={{
          width: '100%',
          maxWidth: 400,
          boxSizing: 'border-box',
          padding: '7px 9px',
          fontSize: 13,
          border: '1px solid var(--theme-elevation-150, #444)',
          borderRadius: 5,
          background: 'var(--theme-input-bg, transparent)',
          color: 'inherit',
        }}
      >
        {OPTIONS.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
      <p style={{ fontSize: 12, color: 'var(--theme-elevation-450)', margin: '6px 0 0' }}>
        To cancel an unpaid order, or refund a paid one: change this and save. Refunding calls Razorpay automatically. Changing status requires typing back a one-time confirmation code.
      </p>

      {pendingStatus && (
        <div
          role="dialog"
          aria-modal="true"
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 9999,
            background: 'rgba(0,0,0,0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <div
            style={{
              background: 'var(--theme-elevation-0, #fff)',
              color: 'inherit',
              borderRadius: 8,
              padding: 24,
              width: 420,
              maxWidth: '90vw',
              boxShadow: '0 8px 32px rgba(0,0,0,0.25)',
            }}
          >
            <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700 }}>Confirm status change</h3>
            <p style={{ fontSize: 13, marginTop: 8, color: 'var(--theme-elevation-600)' }}>
              {orderNumber ? `Order ${orderNumber}: ` : ''}
              change status to <strong>{OPTIONS.find((o) => o.value === pendingStatus)?.label}</strong>. This is
              case-sensitive — type the code exactly as shown.
            </p>
            <div
              style={{
                marginTop: 14,
                padding: '10px 14px',
                background: 'var(--theme-elevation-100, #f5f5f5)',
                borderRadius: 6,
                textAlign: 'center',
                fontFamily: 'monospace',
                fontSize: 20,
                fontWeight: 700,
                letterSpacing: 2,
                userSelect: 'all',
              }}
            >
              {challengeCode}
            </div>
            <input
              type="text"
              autoFocus
              value={typedCode}
              onChange={(e) => {
                setTypedCode(e.target.value)
                setError(null)
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter') confirm()
                if (e.key === 'Escape') cancel()
              }}
              placeholder="Type the code above"
              style={{
                marginTop: 12,
                width: '100%',
                boxSizing: 'border-box',
                padding: '9px 10px',
                fontSize: 14,
                fontFamily: 'monospace',
                border: `1px solid ${error ? '#E5484D' : 'var(--theme-elevation-150, #444)'}`,
                borderRadius: 5,
                background: 'var(--theme-input-bg, transparent)',
                color: 'inherit',
              }}
            />
            {error && <p style={{ color: '#E5484D', fontSize: 12, marginTop: 6 }}>{error}</p>}
            <div style={{ marginTop: 18, display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
              <button
                type="button"
                onClick={cancel}
                style={{
                  padding: '8px 16px',
                  fontSize: 13,
                  borderRadius: 5,
                  border: '1px solid var(--theme-elevation-150, #444)',
                  background: 'transparent',
                  color: 'inherit',
                  cursor: 'pointer',
                }}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirm}
                disabled={typedCode.length === 0}
                style={{
                  padding: '8px 16px',
                  fontSize: 13,
                  borderRadius: 5,
                  border: 'none',
                  background: typedCode.length === 0 ? '#9ca3af' : '#00d45f',
                  color: '#101010',
                  fontWeight: 600,
                  cursor: typedCode.length === 0 ? 'not-allowed' : 'pointer',
                }}
              >
                Confirm Change
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default StatusConfirmField
