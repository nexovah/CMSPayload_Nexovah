'use client'

import React, { useState } from 'react'
import { Button, toast, useDocumentInfo, useForm, useFormFields } from '@payloadcms/ui'

type Status = 'draft' | 'running' | 'paused'

const STATUS_LABEL: Record<string, string> = { draft: 'Not activated', running: 'Active', paused: 'Paused' }

export function DripControlPanel() {
  const { data } = useDocumentInfo()
  const { submit } = useForm()
  const hasId = Boolean(data?.id)
  const [working, setWorking] = useState(false)

  const status = (useFormFields(([fields]) => fields.status?.value as string | undefined) as Status | undefined) ?? 'draft'
  const triggerGroup = useFormFields(([fields]) => fields.triggerGroup?.value as string | number | undefined)
  const steps = useFormFields(([fields]) => (Array.isArray(fields.steps?.value) ? (fields.steps?.value as unknown[]).length : 0))
  const totalEnrolled = useFormFields(([fields]) => (fields.totalEnrolled?.value as number | undefined) ?? 0)
  const sentCount = useFormFields(([fields]) => (fields.sentCount?.value as number | undefined) ?? 0)

  const canActivate = hasId && Boolean(triggerGroup) && steps > 0 && status !== 'running'

  const doActivate = async () => {
    if (!data?.id) return
    if (!window.confirm(status === 'paused' ? 'Resume this drip campaign?' : 'Activate this drip campaign? Every current member of the Trigger Group will be enrolled immediately.')) return
    setWorking(true)
    try {
      // Save first — /activate-drip reads the campaign fresh from the DB,
      // so unsaved trigger group / steps edits need to land first.
      await submit({ skipValidation: true })
      const res = await fetch(`/api/campaigns/${data.id}/activate-drip`, { method: 'POST', credentials: 'include' })
      const result = await res.json().catch(() => ({}))
      if (!res.ok) {
        toast.error(result?.error || 'Failed to activate.')
        return
      }
      toast.success(`Activated — ${result.enrolled ?? 0} contact(s) enrolled.`)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to activate.')
    } finally {
      setWorking(false)
    }
  }

  const doPause = async () => {
    if (!data?.id) return
    setWorking(true)
    try {
      const res = await fetch(`/api/campaigns/${data.id}/pause-drip`, { method: 'POST', credentials: 'include' })
      const result = await res.json().catch(() => ({}))
      if (!res.ok) {
        toast.error(result?.error || 'Failed to pause.')
        return
      }
      toast.success('Paused — no further steps will send until resumed.')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to pause.')
    } finally {
      setWorking(false)
    }
  }

  return (
    <div style={{ border: '1px solid var(--theme-elevation-150)', borderRadius: 'var(--style-radius-m)', padding: 'var(--base)', marginBottom: 'var(--base)' }}>
      <p style={{ margin: '0 0 calc(var(--base) * 0.5)', fontWeight: 600 }}>Drip delivery</p>

      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 4 }}>
        <span style={{ color: 'var(--theme-elevation-450)' }}>Status</span>
        <span style={{ fontWeight: 600 }}>{STATUS_LABEL[status] ?? status}</span>
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 4 }}>
        <span style={{ color: 'var(--theme-elevation-450)' }}>Steps</span>
        <span>{steps}</span>
      </div>
      {status !== 'draft' && (
        <>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 4 }}>
            <span style={{ color: 'var(--theme-elevation-450)' }}>Total enrolled</span>
            <span>{totalEnrolled}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 4 }}>
            <span style={{ color: 'var(--theme-elevation-450)' }}>Emails sent</span>
            <span>{sentCount}</span>
          </div>
        </>
      )}

      <p style={{ fontSize: 12, color: 'var(--theme-elevation-450)', margin: 'calc(var(--base) * 0.75) 0' }}>
        {!hasId
          ? 'Save this campaign first.'
          : !triggerGroup
            ? 'Select a Trigger Group on the Drip Steps tab first.'
            : steps === 0
              ? 'Add at least one step on the Drip Steps tab first.'
              : status === 'draft'
                ? 'Enrolls every current Trigger Group member, then keeps enrolling new members automatically as they join.'
                : status === 'paused'
                  ? 'Resume to continue sending scheduled steps.'
                  : 'Currently running — new group members are enrolled automatically.'}
      </p>

      {status === 'running' ? (
        <Button buttonStyle="secondary" disabled={working} onClick={doPause}>
          {working ? 'Working…' : 'Pause'}
        </Button>
      ) : (
        <Button buttonStyle="primary" disabled={!canActivate || working} onClick={doActivate}>
          {working ? 'Working…' : status === 'paused' ? 'Resume' : 'Activate Drip Campaign'}
        </Button>
      )}
    </div>
  )
}

export default DripControlPanel
