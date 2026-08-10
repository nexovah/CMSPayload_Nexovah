// Shared style model + HTML<->style-panel conversion for both the Templates
// editor (TemplateEditorField) and the Campaign Content editor
// (ContentEditorField), so the two behave identically instead of drifting.

export type Styles = {
  backdropColor: string
  canvasColor: string
  canvasBorderColor: string
  canvasBorderRadius: number
  fontFamily: string
  textColor: string
  outlookCompatibility: boolean
}

export const DEFAULT_STYLES: Styles = {
  backdropColor: '#F0F1F3',
  canvasColor: '#FFFFFF',
  canvasBorderColor: '',
  canvasBorderRadius: 5,
  fontFamily: 'modern-sans',
  textColor: '#444444',
  outlookCompatibility: false,
}

export const FONT_STACKS: Record<string, string> = {
  'modern-sans': "'Helvetica Neue', 'Segoe UI', Helvetica, sans-serif",
  'classic-serif': "Georgia, 'Times New Roman', serif",
  monospace: 'Menlo, Consolas, monospace',
  'rounded-sans': "Verdana, 'Trebuchet MS', sans-serif",
}

export const FONT_LABELS: Record<string, string> = {
  'modern-sans': 'Modern sans',
  'classic-serif': 'Classic serif',
  monospace: 'Monospace',
  'rounded-sans': 'Rounded sans',
}

export const PRESET_COLORS = [
  '#E53E5C', '#D6249F', '#B026C4', '#7C3AED', '#6D5EF5', '#3B5BDB',
  '#2E7FE0', '#0EA5C4', '#0EA88E', '#16A34A', '#65A30D', '#CA8A04',
  '#E8830A', '#F0501C', '#DC2626', '#FFFFFF', '#F1F1F1', '#D4D4D4',
  '#A3A3A3', '#525252', '#262626', '#000000',
]

export const STYLE_TAG_ID = 'nx-auto-styles'

// ─── HTML helpers (defensive — never throw into the render/event cycle) ────

export function parseDoc(html: string): Document {
  const doc = new DOMParser().parseFromString(html || '<html><head></head><body></body></html>', 'text/html')
  if (!doc.head) doc.documentElement.insertBefore(doc.createElement('head'), doc.body)
  if (!doc.body) doc.documentElement.appendChild(doc.createElement('body'))
  return doc
}

export function serializeDoc(doc: Document): string {
  return `<!doctype html>\n${doc.documentElement.outerHTML}`
}

export function buildStyleBlock(styles: Styles): string {
  const font = FONT_STACKS[styles.fontFamily] ?? FONT_STACKS['modern-sans']
  const borderRule = styles.canvasBorderColor ? `border: 1px solid ${styles.canvasBorderColor};` : ''
  return `body {
        background-color: ${styles.backdropColor};
        font-family: ${font};
        font-size: 15px;
        line-height: 26px;
        margin: 0;
        color: ${styles.textColor};
      }
      .wrap {
        background-color: ${styles.canvasColor};
        padding: 30px;
        max-width: 525px;
        margin: 0 auto;
        border-radius: ${styles.canvasBorderRadius}px;
        ${borderRule}
      }
      img { max-width: 100%; }
      @media (max-width: 480px) {
        .wrap { padding: 20px; border-radius: ${Math.min(styles.canvasBorderRadius, 8)}px; }
      }`
}

export function injectStyles(rawHtml: string, styles: Styles): string {
  try {
    const doc = parseDoc(rawHtml)
    let tag = doc.getElementById(STYLE_TAG_ID)
    if (!tag) {
      tag = doc.createElement('style')
      tag.id = STYLE_TAG_ID
      doc.head.appendChild(tag)
    }
    tag.textContent = buildStyleBlock(styles)
    return serializeDoc(doc)
  } catch {
    // Malformed/pasted HTML shouldn't be able to crash the editor — worst
    // case the style panel's changes just don't reach the raw HTML this cycle.
    return rawHtml
  }
}

const FONT_STACK_MATCHERS: [RegExp, string][] = [
  [/helvetica|segoe|arial/i, 'modern-sans'],
  [/georgia|times|serif/i, 'classic-serif'],
  [/menlo|consolas|monospace|courier/i, 'monospace'],
  [/verdana|trebuchet/i, 'rounded-sans'],
]

function matchFontStack(cssFontFamily: string): string {
  for (const [re, key] of FONT_STACK_MATCHERS) {
    if (re.test(cssFontFamily)) return key
  }
  return 'modern-sans'
}

// The opposite direction of injectStyles — reads whatever backdrop/canvas
// colors, radius, and font are actually in the HTML (typically pasted or
// uploaded from elsewhere) and derives style-panel values from them, so the
// panel reflects the real content instead of sitting at stale defaults.
export function parseStylesFromHtml(rawHtml: string): Partial<Styles> {
  const result: Partial<Styles> = {}
  try {
    const doc = parseDoc(rawHtml)
    const cssText = Array.from(doc.querySelectorAll('style'))
      .map((s) => s.textContent || '')
      .join('\n')

    const bodyBlock = cssText.match(/(?:^|\})\s*body\s*\{([^}]*)\}/i)?.[1]
    if (bodyBlock) {
      const bg = bodyBlock.match(/background(?:-color)?\s*:\s*([^;]+);?/i)
      if (bg) result.backdropColor = bg[1].trim()
      const color = bodyBlock.match(/(?:^|[^-])\bcolor\s*:\s*([^;]+);?/i)
      if (color) result.textColor = color[1].trim()
      const font = bodyBlock.match(/font-family\s*:\s*([^;]+);?/i)
      if (font) result.fontFamily = matchFontStack(font[1].trim())
    }

    const wrapBlock = cssText.match(/\.wrap\s*\{([^}]*)\}/i)?.[1]
    if (wrapBlock) {
      const bg = wrapBlock.match(/background(?:-color)?\s*:\s*([^;]+);?/i)
      if (bg) result.canvasColor = bg[1].trim()
      const radius = wrapBlock.match(/border-radius\s*:\s*(\d+)px/i)
      if (radius) result.canvasBorderRadius = Number(radius[1])
      const border = wrapBlock.match(/border\s*:\s*[\d.]+px\s+solid\s+([^;]+);?/i)
      result.canvasBorderColor = border ? border[1].trim() : ''
    }
  } catch {
    // Unparseable HTML just means the panel keeps its current values.
  }
  return result
}

export function getWrapEl(doc: Document): HTMLElement {
  return (doc.querySelector('.wrap') as HTMLElement | null) ?? doc.body
}

export function extractWrapInner(rawHtml: string): string {
  try {
    return getWrapEl(parseDoc(rawHtml)).innerHTML
  } catch {
    return ''
  }
}

export function setWrapInner(rawHtml: string, innerHtml: string): string {
  try {
    const doc = parseDoc(rawHtml)
    getWrapEl(doc).innerHTML = innerHtml
    return serializeDoc(doc)
  } catch {
    return rawHtml
  }
}

// Fills sample merge-tag data for the live Preview tab — mirrors the same
// substitution the backend /preview endpoint does for the "Preview (F9)" button.
export function renderPreviewHtml(rawHtml: string): string {
  return rawHtml
    .replace(/\{\{\s*\.Campaign\.Subject\s*\}\}/g, 'Your Autumn Sale Starts Now')
    .replace(/\{\{\s*\.Subscriber\.Name\s*\}\}/g, 'Jordan')
    .replace(/\{\{\s*\.Subscriber\.LastName\s*\}\}/g, 'Rivera')
    .replace(/\{\{\s*template\s+"content"\s+\.\s*\}\}/g, '<p>This is a preview of your email content.</p>')
}
