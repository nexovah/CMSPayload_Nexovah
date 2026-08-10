'use client'

import React, { useEffect, useState } from 'react'
import { Button, toast, useDocumentInfo, useForm, useFormFields } from '@payloadcms/ui'

type Status = 'draft' | 'scheduled' | 'running' | 'paused' | 'finished' | 'cancelled'
type SendMode = 'now' | 'schedule'

const STATUS_LABEL: Record<Status, string> = {
  draft: 'Draft',
  scheduled: 'Scheduled',
  running: 'Sending…',
  paused: 'Paused',
  finished: 'Sent',
  cancelled: 'Cancelled',
}

// <input type="datetime-local"> wants "YYYY-MM-DDTHH:mm" in LOCAL time, not
// the ISO/UTC string form fields store — these two convert between them.
function toDatetimeLocalValue(iso: string | undefined): string {
  if (!iso) return ''
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

export function SendCampaignPanel() {
  const { data } = useDocumentInfo()
  const { dispatchFields, setModified, submit } = useForm()
  const hasId = Boolean(data?.id)

  const status = (useFormFields(([fields]) => fields.status?.value as string | undefined) as Status | undefined) ?? 'draft'
  const sendLaterSaved = useFormFields(([fields]) => Boolean(fields.sendLater?.value))
  const sendAtSaved = useFormFields(([fields]) => fields.sendAt?.value as string | undefined)
  const contactGroups = useFormFields(([fields]) => fields.contactGroups?.value as (string | number)[] | undefined)
  const sentCount = useFormFields(([fields]) => (fields.sentCount?.value as number | undefined) ?? 0)
  const totalRecipients = useFormFields(([fields]) => (fields.totalRecipients?.value as number | undefined) ?? 0)
  const bounces = useFormFields(([fields]) => (fields.bounces?.value as number | undefined) ?? 0)

  const [recipientCount, setRecipientCount] = useState<number | null>(null)
  const [working, setWorking] = useState(false)
  const [mode, setMode] = useState<SendMode>(sendLaterSaved ? 'schedule' : 'now')
  const [scheduleAt, setScheduleAt] = useState(toDatetimeLocalValue(sendAtSaved))

  const groupIds = (contactGroups ?? []).map(String).filter(Boolean)

  useEffect(() => {
    if (groupIds.length === 0) {
      setRecipientCount(0)
      return
    }
    let cancelled = false
    const params = new URLSearchParams()
    groupIds.forEach((id, i) => params.set(`where[groups][in][${i}]`, id))
    params.set('limit', '1')
    fetch(`/api/contacts?${params.toString()}`, { credentials: 'include', cache: 'no-store' })
      .then((res) => (res.ok ? res.json() : null))
      .then((json) => {
        if (!cancelled) setRecipientCount(json?.totalDocs ?? 0)
      })
      .catch(() => {
        if (!cancelled) setRecipientCount(null)
      })
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(groupIds)])

  const canAct = hasId && groupIds.length > 0 && (status === 'draft' || status === 'scheduled')

  const doSend = async () => {
    if (!data?.id) return
    if (groupIds.length === 0) {
      toast.error('Select at least one Contact Group on the Campaign tab first.')
      return
    }
    if (mode === 'schedule') {
      if (!scheduleAt) {
        toast.error('Pick a date and time to schedule for.')
        return
      }
      if (new Date(scheduleAt) <= new Date()) {
        toast.error('Pick a date and time in the future.')
        return
      }
    }

    const confirmMsg =
      mode === 'schedule'
        ? `Schedule this campaign to send to ${recipientCount ?? '…'} contact(s) at ${new Date(scheduleAt).toLocaleString()}?`
        : `Send this campaign now to ${recipientCount ?? '…'} contact(s)? This cannot be undone.`
    if (!window.confirm(confirmMsg)) return

    setWorking(true)
    try {
      // Write the chosen mode into the real fields, then save — the /send
      // endpoint reads the campaign fresh from the DB, so whatever's picked
      // here has to be persisted first. This makes "pick a time and go" a
      // single flow instead of needing a separate trip to the Campaign tab.
      dispatchFields({ type: 'UPDATE', path: 'sendLater', value: mode === 'schedule' })
      dispatchFields({ type: 'UPDATE', path: 'sendAt', value: mode === 'schedule' ? new Date(scheduleAt).toISOString() : null })
      setModified(true)
      await submit({ skipValidation: true })

      const res = await fetch(`/api/campaigns/${data.id}/send`, { method: 'POST', credentials: 'include' })
      const result = await res.json().catch(() => ({}))
      if (!res.ok) {
        toast.error(result?.error || 'Failed to send campaign.')
        return
      }
      if (result.scheduled) {
        toast.success(`Scheduled for ${new Date(result.sendAt).toLocaleString()}.`)
      } else {
        toast.success('Campaign sent.')
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to send campaign.')
    } finally {
      setWorking(false)
    }
  }

  const doCancelSchedule = async () => {
    if (!data?.id) return
    if (!window.confirm('Cancel the scheduled send and move this campaign back to draft?')) return
    setWorking(true)
    try {
      const res = await fetch(`/api/campaigns/${data.id}/cancel-schedule`, { method: 'POST', credentials: 'include' })
      if (!res.ok) {
        const result = await res.json().catch(() => ({}))
        toast.error(result?.error || 'Failed to cancel.')
        return
      }
      toast.success('Schedule cancelled.')
      setMode('now')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to cancel.')
    } finally {
      setWorking(false)
    }
  }

  const optionStyle = (active: boolean): React.CSSProperties => ({
    flex: 1,
    padding: '8px 10px',
    fontSize: 13,
    textAlign: 'center',
    cursor: 'pointer',
    borderRadius: 5,
    border: active ? '1px solid var(--theme-success-500, #2563eb)' : '1px solid var(--theme-elevation-150)',
    background: active ? 'var(--theme-success-100, rgba(37,99,235,0.12))' : 'none',
    color: active ? 'var(--theme-success-500, #2563eb)' : 'inherit',
    fontWeight: active ? 600 : 400,
  })

  return (
    <div style={{ border: '1px solid var(--theme-elevation-150)', borderRadius: 'var(--style-radius-m)', padding: 'var(--base)', marginBottom: 'var(--base)' }}>
      <p style={{ margin: '0 0 calc(var(--base) * 0.5)', fontWeight: 600 }}>Campaign delivery</p>

      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 4 }}>
        <span style={{ color: 'var(--theme-elevation-450)' }}>Status</span>
        <span style={{ fontWeight: 600 }}>{STATUS_LABEL[status] ?? status}</span>
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 4 }}>
        <span style={{ color: 'var(--theme-elevation-450)' }}>Recipients</span>
        <span>{recipientCount === null ? '—' : recipientCount}</span>
      </div>
      {(status === 'running' || status === 'finished') && (
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 4 }}>
          <span style={{ color: 'var(--theme-elevation-450)' }}>Sent / Bounced</span>
          <span>
            {sentCount} / {bounces} <span style={{ color: 'var(--theme-elevation-450)' }}>of {totalRecipients}</span>
          </span>
        </div>
      )}
      {status === 'scheduled' && sendAtSaved && (
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 4 }}>
          <span style={{ color: 'var(--theme-elevation-450)' }}>Scheduled for</span>
          <span>{new Date(sendAtSaved).toLocaleString()}</span>
        </div>
      )}

      {status === 'scheduled' ? (
        <div style={{ marginTop: 'calc(var(--base) * 0.75)' }}>
          <Button buttonStyle="secondary" disabled={working} onClick={doCancelSchedule}>
            Cancel Schedule
          </Button>
        </div>
      ) : (
        <>
          <div style={{ display: 'flex', gap: 6, margin: 'calc(var(--base) * 0.75) 0' }}>
            <div style={optionStyle(mode === 'now')} onClick={() => setMode('now')}>
              Send immediately
            </div>
            <div style={optionStyle(mode === 'schedule')} onClick={() => setMode('schedule')}>
              Schedule for later
            </div>
          </div>

          {mode === 'schedule' && (
            <input
              type="datetime-local"
              value={scheduleAt}
              min={toDatetimeLocalValue(new Date().toISOString())}
              onChange={(e) => setScheduleAt(e.target.value)}
              style={{
                width: '100%',
                boxSizing: 'border-box',
                padding: '7px 9px',
                fontSize: 13,
                border: '1px solid var(--theme-elevation-150, #444)',
                borderRadius: 5,
                background: 'var(--theme-input-bg, transparent)',
                color: 'inherit',
                marginBottom: 'calc(var(--base) * 0.5)',
              }}
            />
          )}

          <p style={{ fontSize: 12, color: 'var(--theme-elevation-450)', margin: '0 0 calc(var(--base) * 0.75)' }}>
            {!hasId
              ? 'Save this campaign first.'
              : groupIds.length === 0
                ? 'Select a Contact Group on the Campaign tab first.'
                : mode === 'schedule'
                  ? 'Saves and schedules — sends automatically at the chosen time.'
                  : 'Saves and sends immediately to every contact in the selected group(s).'}
          </p>

          <Button buttonStyle="primary" disabled={!canAct || working} onClick={doSend}>
            {working ? 'Working…' : mode === 'schedule' ? 'Schedule Campaign' : 'Send Campaign Now'}
          </Button>
        </>
      )}
    </div>
  )
}

export default SendCampaignPanel
