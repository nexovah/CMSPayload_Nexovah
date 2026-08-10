'use client'

import React, { useEffect, useMemo, useRef, useState } from 'react'
import { useForm, useFormFields, CodeEditor } from '@payloadcms/ui'

type Format = 'rich_text' | 'raw_html' | 'markdown' | 'plain_text' | 'visual'

const CONTENT_MARKER_ID = 'nx-campaign-content'

function Icon({ children, size = 16 }: { children: React.ReactNode; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      {children}
    </svg>
  )
}
const PreviewIcon = () => <Icon><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7Z" /><circle cx="12" cy="12" r="3" /></Icon>

// ─── Main field ──────────────────────────────────────────────────────────

export function ContentEditorField() {
  const { dispatchFields, setModified } = useForm()
  const content = useFormFields(([fields]) => (fields.content?.value as string) ?? '')
  const format = useFormFields(([fields]) => (fields.format?.value as Format) ?? 'rich_text')
  const templateId = useFormFields(([fields]) => fields.template?.value as string | number | undefined)

  const [showPreview, setShowPreview] = useState(false)
  const [previewHtml, setPreviewHtml] = useState('')
  const [loadingPreview, setLoadingPreview] = useState(false)
  // The full template HTML as it actually exists in the Templates section
  // right now — this is what the Edit tab renders. Refetched (no-store)
  // whenever the selected template changes, so an update made in Templates
  // shows up here on next open rather than a stale copy.
  const [templateRawHtml, setTemplateRawHtml] = useState<string | null>(null)
  const [templateLoading, setTemplateLoading] = useState(false)

  const contentRef = useRef(content)
  contentRef.current = content
  const editorRef = useRef<HTMLDivElement>(null) // plain contentEditable, used only when no template is selected
  const iframeRef = useRef<HTMLIFrameElement>(null) // template-wrapped editable canvas
  const editableFormats: Format[] = ['rich_text', 'visual']
  const isRichEditable = editableFormats.includes(format)

  useEffect(() => {
    if (!templateId) {
      setTemplateRawHtml(null)
      return
    }
    let cancelled = false
    setTemplateLoading(true)
    fetch(`/api/campaign-templates/${templateId}`, { credentials: 'include', cache: 'no-store' })
      .then((res) => (res.ok ? res.json() : null))
      .then((doc) => {
        if (cancelled) return
        setTemplateRawHtml(doc?.rawHtml || null)
      })
      .catch(() => {
        if (!cancelled) setTemplateRawHtml(null)
      })
      .finally(() => {
        if (!cancelled) setTemplateLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [templateId])

  // dispatchFields() alone doesn't flip the document's "modified" flag the
  // Save button checks (see TemplateEditorField for the full explanation) —
  // every write here must set it explicitly.
  const setContent = (value: string) => {
    dispatchFields({ type: 'UPDATE', path: 'content', value })
    setModified(true)
  }

  // The template-wrapped editable doc is only rebuilt when the template's own
  // HTML changes (selection changed, or the template was edited elsewhere) —
  // never on every keystroke, or the iframe would reload and the caret would
  // jump mid-edit. The content seed uses whatever was in the field at that
  // moment; edits after that happen live inside the iframe's own DOM and sync
  // back via the input listener wired up in the onLoad handler below.
  const editableSrcDoc = useMemo(() => {
    if (!templateRawHtml) return null
    return templateRawHtml.replace(
      /\{\{\s*template\s+"content"\s+\.\s*\}\}/g,
      `<div id="${CONTENT_MARKER_ID}">${contentRef.current}</div>`,
    )
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [templateRawHtml])

  const handleIframeLoad = () => {
    const doc = iframeRef.current?.contentDocument
    const marker = doc?.getElementById(CONTENT_MARKER_ID)
    if (!marker) return
    marker.contentEditable = 'true'
    marker.style.outline = 'none'
    marker.addEventListener('input', () => setContent(marker.innerHTML))
  }

  // Plain (no-template) contentEditable — only relevant when no template is
  // selected, so there's no chrome to render around the content.
  useEffect(() => {
    if (isRichEditable && !templateRawHtml && editorRef.current && editorRef.current.innerHTML !== content) {
      editorRef.current.innerHTML = content
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [format, templateRawHtml])

  const handlePlainEditorInput = () => {
    if (editorRef.current) setContent(editorRef.current.innerHTML)
  }

  const wordCount = useMemo(() => {
    const text = content.replace(/<[^>]*>/g, ' ').trim()
    return text ? text.split(/\s+/).length : 0
  }, [content])

  const handlePreview = async () => {
    setShowPreview(true)
    setLoadingPreview(true)
    try {
      let html = content
      if (templateId) {
        const res = await fetch(`/api/campaign-templates/${templateId}`, { credentials: 'include', cache: 'no-store' })
        if (res.ok) {
          const doc = await res.json()
          html = (doc.rawHtml || '').replace(/\{\{\s*template\s+"content"\s+\.\s*\}\}/g, content)
        }
      }
      setPreviewHtml(html || '<p style="font-family:sans-serif;color:#888;padding:20px;">Nothing to preview yet.</p>')
    } finally {
      setLoadingPreview(false)
    }
  }

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'F9') {
        e.preventDefault()
        handlePreview()
      }
      if (e.key === 'Escape') setShowPreview(false)
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [content, templateId])

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 8 }}>
        <button
          type="button"
          onClick={handlePreview}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            padding: '8px 16px',
            background: 'var(--theme-success-500, #2563eb)',
            color: '#fff',
            border: 'none',
            borderRadius: 5,
            cursor: 'pointer',
            fontSize: 13,
          }}
        >
          <PreviewIcon /> Preview <span style={{ opacity: 0.7, fontSize: 11 }}>F9</span>
        </button>
      </div>

      <div style={{ border: '1px solid var(--theme-elevation-150, #ddd)', borderRadius: 6, overflow: 'hidden' }}>
        {isRichEditable && templateId && templateLoading && (
          <div style={{ minHeight: 420, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--theme-elevation-400, #999)', fontSize: 13 }}>Loading template…</div>
        )}

        {isRichEditable && templateRawHtml && !templateLoading && (
          <iframe
            ref={iframeRef}
            title="Campaign content"
            srcDoc={editableSrcDoc ?? ''}
            onLoad={handleIframeLoad}
            style={{ width: '100%', height: 420, border: 'none', display: 'block' }}
          />
        )}

        {isRichEditable && !templateRawHtml && !templateLoading && (
          <div
            ref={editorRef}
            contentEditable
            suppressContentEditableWarning
            onInput={handlePlainEditorInput}
            style={{ minHeight: 420, padding: 20, outline: 'none', fontSize: 14, lineHeight: 1.6 }}
          />
        )}

        {!editableFormats.includes(format) && format !== 'plain_text' && (
          <CodeEditor value={content} language={format === 'markdown' ? 'markdown' : 'html'} onChange={(v: string | undefined) => setContent(v ?? '')} minHeight={420} maxHeight={420} />
        )}
        {format === 'plain_text' && (
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            style={{ width: '100%', minHeight: 420, padding: 20, border: 'none', outline: 'none', resize: 'vertical', fontFamily: 'inherit', fontSize: 14, lineHeight: 1.6, boxSizing: 'border-box' }}
          />
        )}

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 12px', fontSize: 11, color: 'var(--theme-elevation-400, #999)', borderTop: '1px solid var(--theme-elevation-150, #ddd)' }}>
          <span>{templateRawHtml ? 'Editing content only — the template layout comes from Templates and isn\'t editable here.' : ''}</span>
          <span>{wordCount} WORDS</span>
        </div>
      </div>

      <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 10, fontSize: 13 }}>
        <a href="https://payloadcms.com/docs" target="_blank" rel="noreferrer" style={{ color: 'var(--theme-success-500, #2563eb)', textDecoration: 'none' }}>
          {'{}'} Templating reference
        </a>
      </div>

      {showPreview && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 1001, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }} onClick={() => setShowPreview(false)}>
          <div style={{ background: '#fff', width: '100%', maxWidth: 720, height: '100%', maxHeight: '90vh', display: 'flex', flexDirection: 'column', borderRadius: 6, overflow: 'hidden' }} onClick={(e) => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 16px', borderBottom: '1px solid #eee' }}>
              <span style={{ fontWeight: 600, fontSize: 13 }}>Preview</span>
              <button type="button" onClick={() => setShowPreview(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 16 }}>✕</button>
            </div>
            {loadingPreview ? (
              <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#999' }}>Loading…</div>
            ) : (
              <iframe title="Content preview" srcDoc={previewHtml} style={{ flex: 1, border: 'none', width: '100%' }} />
            )}
          </div>
        </div>
      )}
    </div>
  )
}

export default ContentEditorField
