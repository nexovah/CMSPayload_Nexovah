'use client'

import React, { useState } from 'react'
import { Button, TextInput, toast, useDocumentInfo, useFormModified } from '@payloadcms/ui'

export function SendTestMessagePanel() {
  const [email, setEmail] = useState('')
  const [sending, setSending] = useState(false)
  const { data } = useDocumentInfo()
  const modified = useFormModified()
  const hasId = Boolean(data?.id)
  // Sending a test always sends whatever is currently saved in the DB (the
  // endpoint re-reads the campaign fresh) — if there are unsaved edits in the
  // form, warn rather than silently send the old version.
  const disabled = !hasId || sending

  const handleSend = async () => {
    if (!hasId) return
    const emails = email
      .split(/[,\s]+/)
      .map((e) => e.trim())
      .filter(Boolean)
    if (emails.length === 0) {
      toast.error('Enter at least one e-mail address.')
      return
    }
    if (modified) {
      toast.warning('You have unsaved changes — save the campaign first so the test reflects them.')
      return
    }

    setSending(true)
    try {
      const res = await fetch(`/api/campaigns/${data!.id}/send-test`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ emails }),
      })
      const result = await res.json().catch(() => ({}))
      if (!res.ok) {
        toast.error(result?.error || 'Failed to send test e-mail.')
        return
      }
      toast.success(`Test e-mail sent to ${emails.join(', ')}.`)
      setEmail('')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to send test e-mail.')
    } finally {
      setSending(false)
    }
  }

  return (
    <div style={{ border: '1px solid var(--theme-elevation-150)', borderRadius: 'var(--style-radius-m)', padding: 'var(--base)' }}>
      <p style={{ margin: '0 0 calc(var(--base) * 0.75)', fontWeight: 600 }}>Send test message</p>
      <TextInput
        path="sendTestEmail"
        label="E-mails"
        value={email}
        onChange={(e: React.ChangeEvent<HTMLInputElement>) => setEmail(e.target.value)}
        placeholder="you@example.com"
        readOnly={!hasId}
      />
      <p style={{ fontSize: 12, color: 'var(--theme-elevation-450)', margin: 'calc(var(--base) * 0.5) 0' }}>
        {hasId ? 'Comma or space separate multiple addresses.' : 'Save this campaign first to send a test message.'}
      </p>
      <Button buttonStyle="primary" disabled={disabled} onClick={handleSend}>
        {sending ? 'Sending…' : 'Send'}
      </Button>
    </div>
  )
}

export default SendTestMessagePanel
