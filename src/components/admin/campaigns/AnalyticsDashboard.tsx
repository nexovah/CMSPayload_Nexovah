'use client'

import React, { useEffect, useMemo, useState } from 'react'

type CampaignDoc = {
  id: string | number
  name: string
  status: string
  createdAt: string
  startedAt?: string | null
  endedAt?: string | null
  sentCount?: number | null
  bounces?: number | null
  views?: number | null
  clicks?: number | null
  unsubscribes?: number | null
  totalRecipients?: number | null
}

type Row = {
  id: string | number
  name: string
  status: string
  date: string
  sent: number
  delivered: number
  opened: number
  clicked: number
  unsubscribed: number
}

const METRICS = [
  { key: 'sent', label: 'Sent' },
  { key: 'delivered', label: 'Delivered' },
  { key: 'opened', label: 'Opened' },
  { key: 'clicked', label: 'Clicked' },
  { key: 'unsubscribed', label: 'Unsubscribed' },
] as const
type MetricKey = (typeof METRICS)[number]['key']

function toRow(c: CampaignDoc): Row {
  const sent = c.sentCount ?? 0
  const bounced = c.bounces ?? 0
  return {
    id: c.id,
    name: c.name,
    status: c.status,
    date: c.endedAt || c.startedAt || c.createdAt,
    sent,
    delivered: Math.max(0, sent - bounced),
    opened: c.views ?? 0,
    clicked: c.clicks ?? 0,
    unsubscribed: c.unsubscribes ?? 0,
  }
}

const cardStyle: React.CSSProperties = {
  background: 'var(--theme-elevation-0, #fff)',
  border: '1px solid var(--theme-elevation-150)',
  borderRadius: 8,
  padding: 16,
}

function TabButton({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        padding: '10px 4px',
        marginRight: 24,
        background: 'none',
        border: 'none',
        borderBottom: active ? '2px solid var(--theme-success-500, #2563eb)' : '2px solid transparent',
        color: active ? 'inherit' : 'var(--theme-elevation-450)',
        fontWeight: active ? 600 : 400,
        fontSize: 14,
        cursor: 'pointer',
      }}
    >
      {children}
    </button>
  )
}

// ─── Tracker tab ────────────────────────────────────────────────────────────

function TrackerTab({ rows }: { rows: Row[] }) {
  const [sortKey, setSortKey] = useState<MetricKey>('sent')
  const maxByMetric = useMemo(() => {
    const out: Record<MetricKey, number> = { sent: 0, delivered: 0, opened: 0, clicked: 0, unsubscribed: 0 }
    for (const r of rows) {
      for (const m of METRICS) out[m.key] = Math.max(out[m.key], r[m.key])
    }
    return out
  }, [rows])

  const sorted = useMemo(() => [...rows].sort((a, b) => b[sortKey] - a[sortKey]), [rows, sortKey])

  if (rows.length === 0) {
    return <div style={{ ...cardStyle, textAlign: 'center', color: 'var(--theme-elevation-450)', padding: 40 }}>No campaigns yet.</div>
  }

  return (
    <div style={{ ...cardStyle, padding: 0, overflowX: 'auto' }}>
      <div style={{ display: 'grid', gridTemplateColumns: '220px repeat(5, 1fr)', borderBottom: '1px solid var(--theme-elevation-150)' }}>
        <div style={{ padding: '10px 16px', fontSize: 12, color: 'var(--theme-elevation-450)' }}>Campaign</div>
        {METRICS.map((m) => (
          <button
            key={m.key}
            type="button"
            onClick={() => setSortKey(m.key)}
            style={{
              padding: '10px 12px',
              fontSize: 12,
              textAlign: 'left',
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              color: sortKey === m.key ? 'var(--theme-success-500, #2563eb)' : 'var(--theme-elevation-450)',
              fontWeight: sortKey === m.key ? 600 : 400,
            }}
          >
            {m.label} {sortKey === m.key ? '▾' : ''}
          </button>
        ))}
      </div>
      {sorted.map((r) => (
        <div key={r.id} style={{ display: 'grid', gridTemplateColumns: '220px repeat(5, 1fr)', borderBottom: '1px solid var(--theme-elevation-100)', alignItems: 'center' }}>
          <div style={{ padding: '12px 16px' }}>
            <div style={{ fontSize: 14 }}>{r.name}</div>
            <div style={{ fontSize: 11, color: 'var(--theme-elevation-450)' }}>
              ID: #{r.id} {r.date && `| ${new Date(r.date).toLocaleDateString()}`}
            </div>
          </div>
          {METRICS.map((m) => {
            const value = r[m.key]
            const max = maxByMetric[m.key] || 1
            const pct = Math.max(2, Math.round((value / max) * 100))
            return (
              <div key={m.key} style={{ padding: '0 12px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <div style={{ flex: 1, height: 16, background: 'var(--theme-elevation-100)', borderRadius: 3, overflow: 'hidden' }}>
                    <div style={{ width: `${value === 0 ? 0 : pct}%`, height: '100%', background: m.key === 'sent' ? '#d99730' : 'var(--theme-elevation-300)' }} />
                  </div>
                  <span style={{ fontSize: 12, minWidth: 40, textAlign: 'right' }}>{value.toLocaleString()}</span>
                </div>
              </div>
            )
          })}
        </div>
      ))}
    </div>
  )
}

// ─── Performance tab ────────────────────────────────────────────────────────

function PerformanceTab({ rows }: { rows: Row[] }) {
  const [selectedId, setSelectedId] = useState<string | number | null>(rows[0]?.id ?? null)
  const [xKey, setXKey] = useState<MetricKey>('sent')
  const [yKey, setYKey] = useState<MetricKey>('clicked')

  const selected = rows.find((r) => r.id === selectedId) ?? rows[0]

  const maxX = Math.max(1, ...rows.map((r) => r[xKey]))
  const maxY = Math.max(1, ...rows.map((r) => r[yKey]))
  const width = 640
  const height = 380
  const pad = 40

  if (rows.length === 0) {
    return <div style={{ ...cardStyle, textAlign: 'center', color: 'var(--theme-elevation-450)', padding: 40 }}>No campaigns yet.</div>
  }

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '260px 1fr', gap: 16 }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <div style={cardStyle}>
          <p style={{ fontWeight: 600, marginBottom: 8 }}>{selected?.name}</p>
          <p style={{ fontSize: 11, color: 'var(--theme-elevation-450)', marginTop: -4, marginBottom: 12 }}>Campaign ID: #{selected?.id}</p>
          {METRICS.map((m) => (
            <div key={m.key} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, padding: '5px 0', borderBottom: '1px solid var(--theme-elevation-100)' }}>
              <span style={{ color: 'var(--theme-elevation-450)' }}>{m.label}</span>
              <span>{selected ? selected[m.key].toLocaleString() : 0}</span>
            </div>
          ))}
        </div>

        <div style={cardStyle}>
          <p style={{ fontWeight: 600, marginBottom: 8, fontSize: 13 }}>X-Axis</p>
          {METRICS.map((m) => (
            <label key={m.key} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, padding: '4px 0', cursor: 'pointer' }}>
              <input type="radio" name="xaxis" checked={xKey === m.key} onChange={() => setXKey(m.key)} /> {m.label}
            </label>
          ))}
        </div>
        <div style={cardStyle}>
          <p style={{ fontWeight: 600, marginBottom: 8, fontSize: 13 }}>Y-Axis</p>
          {METRICS.map((m) => (
            <label key={m.key} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, padding: '4px 0', cursor: 'pointer' }}>
              <input type="radio" name="yaxis" checked={yKey === m.key} onChange={() => setYKey(m.key)} /> {m.label}
            </label>
          ))}
        </div>
      </div>

      <div style={cardStyle}>
        <p style={{ fontWeight: 600, marginBottom: 4 }}>
          {METRICS.find((m) => m.key === yKey)?.label} &amp; {METRICS.find((m) => m.key === xKey)?.label} by Campaign
        </p>
        <p style={{ fontSize: 12, color: 'var(--theme-elevation-450)', marginBottom: 8, fontStyle: 'italic' }}>select a point to highlight</p>
        <svg width="100%" viewBox={`0 0 ${width} ${height}`} style={{ overflow: 'visible' }}>
          <line x1={pad} y1={height - pad} x2={width - 10} y2={height - pad} stroke="var(--theme-elevation-200)" />
          <line x1={pad} y1={10} x2={pad} y2={height - pad} stroke="var(--theme-elevation-200)" />
          {rows.map((r) => {
            const cx = pad + (r[xKey] / maxX) * (width - pad - 20)
            const cy = height - pad - (r[yKey] / maxY) * (height - pad - 20)
            const isSelected = r.id === selected?.id
            return (
              <circle
                key={r.id}
                cx={cx}
                cy={cy}
                r={isSelected ? 8 : 6}
                fill={isSelected ? '#d99730' : 'var(--theme-elevation-200)'}
                stroke={isSelected ? '#a06e1f' : 'none'}
                strokeWidth={2}
                style={{ cursor: 'pointer' }}
                onClick={() => setSelectedId(r.id)}
              >
                <title>{r.name}</title>
              </circle>
            )
          })}
        </svg>
      </div>
    </div>
  )
}

// ─── Cockpit tab ────────────────────────────────────────────────────────────

function Sparkline({ points, color }: { points: number[]; color: string }) {
  const width = 300
  const height = 60
  const max = Math.max(1, ...points)
  const step = points.length > 1 ? width / (points.length - 1) : width
  const d = points.map((v, i) => `${i === 0 ? 'M' : 'L'} ${i * step} ${height - (v / max) * height}`).join(' ')
  return (
    <svg width="100%" viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none">
      <path d={d} fill="none" stroke={color} strokeWidth={2} />
      <path d={`${d} L ${width} ${height} L 0 ${height} Z`} fill={color} opacity={0.15} />
    </svg>
  )
}

function CockpitTab({ rows }: { rows: Row[] }) {
  const [range, setRange] = useState<'mtd' | 'qtd' | 'ytd'>('ytd')

  const filtered = useMemo(() => {
    const now = new Date()
    const start =
      range === 'mtd'
        ? new Date(now.getFullYear(), now.getMonth(), 1)
        : range === 'qtd'
          ? new Date(now.getFullYear(), Math.floor(now.getMonth() / 3) * 3, 1)
          : new Date(now.getFullYear(), 0, 1)
    return rows.filter((r) => (r.date ? new Date(r.date) >= start : true))
  }, [rows, range])

  const reach = filtered.reduce((s, r) => s + r.delivered, 0)
  const engagement = filtered.reduce((s, r) => s + r.clicked, 0)
  const attrition = filtered.reduce((s, r) => s + r.unsubscribed, 0)

  const byDay = useMemo(() => {
    const map = new Map<string, number>()
    for (const r of filtered) {
      if (!r.date) continue
      const day = new Date(r.date).toISOString().slice(0, 10)
      map.set(day, (map.get(day) ?? 0) + r.delivered)
    }
    return Array.from(map.entries()).sort(([a], [b]) => (a < b ? -1 : 1))
  }, [filtered])

  const top10 = [...filtered].sort((a, b) => b.delivered - a.delivered).slice(0, 10)

  const kpiCard = (label: string, value: number, sub: string, active: boolean) => (
    <div style={{ ...cardStyle, flex: 1, borderLeft: active ? '4px solid #d99730' : cardStyle.border }}>
      <p style={{ fontSize: 13, color: 'var(--theme-elevation-450)', margin: 0 }}>{label}</p>
      <p style={{ fontSize: 28, fontWeight: 600, margin: '4px 0' }}>{value.toLocaleString()}</p>
      <p style={{ fontSize: 12, color: 'var(--theme-elevation-450)', margin: 0 }}>{sub}</p>
    </div>
  )

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 4, marginBottom: 12 }}>
        {(['mtd', 'qtd', 'ytd'] as const).map((r) => (
          <button
            key={r}
            type="button"
            onClick={() => setRange(r)}
            style={{
              padding: '6px 14px',
              fontSize: 12,
              border: '1px solid var(--theme-elevation-150)',
              borderRadius: 4,
              background: range === r ? 'var(--theme-elevation-100)' : 'none',
              fontWeight: range === r ? 600 : 400,
              cursor: 'pointer',
            }}
          >
            {r}
          </button>
        ))}
      </div>

      <div style={{ display: 'flex', gap: 12, marginBottom: 16 }}>
        {kpiCard('Reach', reach, 'emails delivered', true)}
        {kpiCard('Engagement', engagement, 'clicks', false)}
        {kpiCard('Attrition', attrition, 'unsubscribes', false)}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 16 }}>
        <div style={cardStyle}>
          <p style={{ fontWeight: 600, marginBottom: 8 }}>Emails Delivered</p>
          {byDay.length > 0 ? (
            <Sparkline points={byDay.map(([, v]) => v)} color="#d99730" />
          ) : (
            <p style={{ color: 'var(--theme-elevation-450)', fontSize: 13 }}>No sends in this period yet.</p>
          )}
        </div>
        <div style={cardStyle}>
          <p style={{ fontWeight: 600, marginBottom: 8 }}>Top Campaigns</p>
          {top10.length === 0 && <p style={{ color: 'var(--theme-elevation-450)', fontSize: 13 }}>Nothing sent yet.</p>}
          {top10.map((r, i) => (
            <div key={r.id} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, padding: '5px 0', borderBottom: '1px solid var(--theme-elevation-100)' }}>
              <span>
                {i + 1}. {r.name}
              </span>
              <span>{r.delivered.toLocaleString()}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

// ─── Root ───────────────────────────────────────────────────────────────────

export function AnalyticsDashboard() {
  const [rows, setRows] = useState<Row[] | null>(null)
  const [tab, setTab] = useState<'tracker' | 'performance' | 'cockpit'>('cockpit')

  useEffect(() => {
    fetch('/api/campaigns?limit=1000&depth=0', { credentials: 'include', cache: 'no-store' })
      .then((res) => (res.ok ? res.json() : { docs: [] }))
      .then((json) => setRows((json.docs ?? []).map(toRow)))
      .catch(() => setRows([]))
  }, [])

  return (
    <div style={{ marginBottom: 24, width: '100%', maxWidth: '100%', boxSizing: 'border-box', overflowX: 'auto' }}>
      <div style={{ display: 'flex', borderBottom: '1px solid var(--theme-elevation-150)', marginBottom: 16 }}>
        <TabButton active={tab === 'cockpit'} onClick={() => setTab('cockpit')}>
          Cockpit
        </TabButton>
        <TabButton active={tab === 'tracker'} onClick={() => setTab('tracker')}>
          Campaign Tracker
        </TabButton>
        <TabButton active={tab === 'performance'} onClick={() => setTab('performance')}>
          Performance Management
        </TabButton>
      </div>

      {rows === null ? (
        <div style={{ ...cardStyle, textAlign: 'center', color: 'var(--theme-elevation-450)', padding: 40 }}>Loading…</div>
      ) : (
        <>
          {tab === 'cockpit' && <CockpitTab rows={rows} />}
          {tab === 'tracker' && <TrackerTab rows={rows} />}
          {tab === 'performance' && <PerformanceTab rows={rows} />}
        </>
      )}
    </div>
  )
}

export default AnalyticsDashboard
