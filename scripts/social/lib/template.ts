// scripts/social/lib/template.ts
//
// The smallest template language that lets the five post formats stay as
// plain HTML files a designer can read:
//
//   {{name}}                  escaped text
//   {{{name}}}                raw HTML (the lockup partial, rich headlines)
//   {{#if name}}...{{/if}}    rendered when the value is truthy
//   {{#each rows}}...{{/each}} repeated per item, with the item's own keys
//                             available inside as {{key}}
//
// Nothing else. No nesting of blocks, no else, no expressions. If a format
// needs more logic than this, the renderer computes the value and passes it
// in, so every decision stays in one typed file rather than in five HTML ones.

export type TemplateValue = string | number | boolean | null | undefined | TemplateItem[]
export type TemplateItem = Record<string, string | number | boolean | null | undefined>
export type TemplateData = Record<string, TemplateValue>

export function escapeHtml(value: unknown): string {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

/**
 * Copy the way it is typed on the command line, turned into safe HTML:
 * escaped, with two conveniences — a literal "\n" (or a real newline) forces
 * a line break, and *asterisks* wrap a run of words in the ember accent.
 */
export function richText(value: string | null | undefined): string {
  if (!value) return ''
  return escapeHtml(value)
    .replace(/\\n|\r?\n/g, '<br>')
    .replace(/\*([^*]+)\*/g, '<span class="accent">$1</span>')
}

function isTruthy(value: TemplateValue): boolean {
  if (Array.isArray(value)) return value.length > 0
  return value !== undefined && value !== null && value !== false && value !== ''
}

export function renderTemplate(source: string, data: TemplateData): string {
  let html = source

  html = html.replace(
    /\{\{#each (\w+)\}\}([\s\S]*?)\{\{\/each\}\}/g,
    (_, name: string, body: string) => {
      const items = data[name]
      if (!Array.isArray(items)) return ''
      return items.map(item => renderTemplate(body, item as TemplateData)).join('')
    },
  )

  html = html.replace(
    /\{\{#if (\w+)\}\}([\s\S]*?)\{\{\/if\}\}/g,
    (_, name: string, body: string) => (isTruthy(data[name]) ? body : ''),
  )

  html = html.replace(/\{\{\{(\w+)\}\}\}/g, (_, name: string) => {
    const value = data[name]
    return Array.isArray(value) ? '' : String(value ?? '')
  })

  html = html.replace(/\{\{(\w+)\}\}/g, (_, name: string) => {
    const value = data[name]
    return Array.isArray(value) ? '' : escapeHtml(value)
  })

  return html
}
