'use client'

import React, { useEffect, useState } from 'react'
import { useForm, useFormFields, Button } from '@payloadcms/ui'

type DelayUnit = 'minutes' | 'hours' | 'days' | 'weeks' | 'months'
type Step = { id: string; order: number; delayValue: number; delayUnit: DelayUnit; templateId: string | number | ''; subject?: string }
type TemplateOption = { id: string | number; name: string }

const UNIT_LABEL: Record<DelayUnit, string> = { minutes: 'minutes', hours: 'hours', days: 'days', weeks: 'weeks', months: 'months' }

function newStep(order: number): Step {
  return { id: `step-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`, order, delayValue: 1, delayUnit: 'weeks', templateId: '', subject: '' }
}

// Ground truth lives in the hidden `steps` json field — a plain array of
// step objects, not Payload's `array` field type (see `attachments` on
// Campaigns.ts for why: array fields track rows via a row-indexed
// form-state shape, not a flat array a custom component can read/write
// directly). Every write pairs dispatchFields with setModified(true),
// since dispatchFields alone doesn't flip the Save button's dirty flag.
export function AutomationStepsField() {
  const { dispatchFields, setModified } = useForm()
  const steps = useFormFields(([fields]) => {
    const value = fields.steps?.value
    return Array.isArray(value) ? (value as Step[]) : []
  })

  const [templates, setTemplates] = useState<TemplateOption[]>([])

  useEffect(() => {
    fetch('/api/campaign-templates?where[status][equals]=active&limit=200&depth=0', { credentials: 'include', cache: 'no-store' })
      .then((res) => (res.ok ? res.json() : { docs: [] }))
      .then((json) => setTemplates((json.docs ?? []).map((t: { id: string | number; name: string }) => ({ id: t.id, name: t.name }))))
      .catch(() => setTemplates([]))
  }, [])

  const setSteps = (next: Step[]) => {
    dispatchFields({ type: 'UPDATE', path: 'steps', value: next.map((s, i) => ({ ...s, order: i })) })
    setModified(true)
  }

  const updateStep = (id: string, patch: Partial<Step>) => {
    setSteps(steps.map((s) => (s.id === id ? { ...s, ...patch } : s)))
  }

  const removeStep = (id: string) => setSteps(steps.filter((s) => s.id !== id))

  const moveStep = (index: number, dir: -1 | 1) => {
    const target = index + dir
    if (target < 0 || target >= steps.length) return
    const next = [...steps]
    ;[next[index], next[target]] = [next[target], next[index]]
    setSteps(next)
  }

  const addStep = () => setSteps([...steps, newStep(steps.length)])

  const rowStyle: React.CSSProperties = {
    border: '1px solid var(--theme-elevation-150)',
    borderRadius: 'var(--style-radius-m)',
    padding: 'var(--base)',
    marginBottom: 'calc(var(--base) * 0.75)',
  }
  const labelStyle: React.CSSProperties = { fontSize: 12, color: 'var(--theme-elevation-450)', display: 'block', marginBottom: 4 }
  const inputStyle: React.CSSProperties = {
    padding: '6px 8px',
    fontSize: 13,
    border: '1px solid var(--theme-elevation-150, #444)',
    borderRadius: 5,
    background: 'var(--theme-input-bg, transparent)',
    color: 'inherit',
  }

  return (
    <div style={{ marginBottom: 'var(--base)' }}>
      <p style={{ margin: '0 0 calc(var(--base) * 0.5)', fontWeight: 600 }}>Steps</p>
      {steps.length === 0 && (
        <p style={{ fontSize: 13, color: 'var(--theme-elevation-450)', marginBottom: 'calc(var(--base) * 0.75)' }}>
          No steps yet. Step 1 always sends immediately when a contact is enrolled — add more steps for follow-ups (e.g. +1 week, +2 weeks, +1 month).
        </p>
      )}

      {steps.map((step, i) => (
        <div key={step.id} style={rowStyle}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'calc(var(--base) * 0.5)' }}>
            <strong style={{ fontSize: 13 }}>Step {i + 1}</strong>
            <div style={{ display: 'flex', gap: 4 }}>
              <button type="button" onClick={() => moveStep(i, -1)} disabled={i === 0} style={{ ...inputStyle, cursor: i === 0 ? 'not-allowed' : 'pointer' }}>
                ↑
              </button>
              <button type="button" onClick={() => moveStep(i, 1)} disabled={i === steps.length - 1} style={{ ...inputStyle, cursor: i === steps.length - 1 ? 'not-allowed' : 'pointer' }}>
                ↓
              </button>
              <button type="button" onClick={() => removeStep(step.id)} style={{ ...inputStyle, cursor: 'pointer', color: 'var(--theme-error-500, #dc2626)' }}>
                Remove
              </button>
            </div>
          </div>

          {i > 0 && (
            <div style={{ display: 'flex', gap: 8, marginBottom: 'calc(var(--base) * 0.5)' }}>
              <div style={{ flex: '0 0 90px' }}>
                <label style={labelStyle}>Wait</label>
                <input
                  type="number"
                  min={1}
                  value={step.delayValue}
                  onChange={(e) => updateStep(step.id, { delayValue: Math.max(1, Number(e.target.value) || 1) })}
                  style={{ ...inputStyle, width: '100%', boxSizing: 'border-box' }}
                />
              </div>
              <div style={{ flex: 1 }}>
                <label style={labelStyle}>&nbsp;</label>
                <select
                  value={step.delayUnit}
                  onChange={(e) => updateStep(step.id, { delayUnit: e.target.value as DelayUnit })}
                  style={{ ...inputStyle, width: '100%', boxSizing: 'border-box' }}
                >
                  {(Object.keys(UNIT_LABEL) as DelayUnit[]).map((u) => (
                    <option key={u} value={u}>
                      {UNIT_LABEL[u]} after previous step
                    </option>
                  ))}
                </select>
              </div>
            </div>
          )}
          {i === 0 && <p style={{ fontSize: 12, color: 'var(--theme-elevation-450)', margin: '0 0 calc(var(--base) * 0.5)' }}>Sends immediately when a contact is enrolled.</p>}

          <div style={{ display: 'flex', gap: 8 }}>
            <div style={{ flex: 1 }}>
              <label style={labelStyle}>Template</label>
              <select
                value={step.templateId}
                onChange={(e) => updateStep(step.id, { templateId: e.target.value })}
                style={{ ...inputStyle, width: '100%', boxSizing: 'border-box' }}
              >
                <option value="">Select a template…</option>
                {templates.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
              </select>
            </div>
            <div style={{ flex: 1 }}>
              <label style={labelStyle}>Subject (optional)</label>
              <input
                type="text"
                value={step.subject || ''}
                onChange={(e) => updateStep(step.id, { subject: e.target.value })}
                placeholder="Falls back to the campaign name"
                style={{ ...inputStyle, width: '100%', boxSizing: 'border-box' }}
              />
            </div>
          </div>
        </div>
      ))}

      <Button buttonStyle="secondary" onClick={addStep} size="small">
        + Add step
      </Button>
    </div>
  )
}

export default AutomationStepsField
