// src/components/Chat/AssistantText.tsx
//
// Renders an assistant reply. The model is told to write plain prose with
// Markdown links to products and the odd bold price, and this understands
// exactly that much: paragraphs, bullet lists, [text](href) and **bold**.
//
// Built as React nodes, never as HTML. A reply is model output and the model
// reads product descriptions written in the admin panel, so nothing in it can
// be trusted to reach innerHTML. Links are the one place that matters: a
// relative path becomes a client-side <Link>, an http(s) URL opens in a new
// tab, and any other scheme is rendered as text.

import Link from 'next/link'
import type { ReactNode } from 'react'

const INLINE = /\[([^\]]+)\]\(([^)\s]+)\)|\*\*([^*\n]+)\*\*/g

function renderInline(text: string, keyBase: string): ReactNode[] {
  const nodes: ReactNode[] = []
  let last = 0
  let i = 0
  for (const match of text.matchAll(INLINE)) {
    const start = match.index ?? 0
    if (start > last) nodes.push(text.slice(last, start))
    const key = `${keyBase}-${i++}`
    if (match[1] !== undefined) {
      nodes.push(renderLink(match[1], match[2], key))
    } else {
      nodes.push(<strong key={key} className="font-semibold text-ink-900">{match[3]}</strong>)
    }
    last = start + match[0].length
  }
  if (last < text.length) nodes.push(text.slice(last))
  return nodes
}

function renderLink(label: string, href: string, key: string): ReactNode {
  const linkClass = 'font-medium text-ember-700 underline decoration-ember-700/40 underline-offset-2 hover:decoration-ember-700'
  if (href.startsWith('/') && !href.startsWith('//')) {
    return <Link key={key} href={href} className={linkClass}>{label}</Link>
  }
  if (/^https?:\/\//i.test(href)) {
    return (
      <a key={key} href={href} target="_blank" rel="noopener noreferrer" className={linkClass}>
        {label}
      </a>
    )
  }
  return <span key={key}>{label}</span>
}

/** Lines that begin a list item, with the marker stripped. */
function listItem(line: string): { ordered: boolean; text: string } | null {
  const bullet = /^\s*[-*•]\s+(.*)$/.exec(line)
  if (bullet) return { ordered: false, text: bullet[1] }
  const numbered = /^\s*\d+[.)]\s+(.*)$/.exec(line)
  if (numbered) return { ordered: true, text: numbered[1] }
  return null
}

export default function AssistantText({ text }: { text: string }) {
  const blocks = text.replace(/\r\n/g, '\n').trim().split(/\n{2,}/)
  const out: ReactNode[] = []

  blocks.forEach((block, b) => {
    const lines = block.split('\n')
    const items = lines.map(listItem)

    // A block is a list only if every line is an item - a paragraph that
    // happens to start with a dash is still a paragraph.
    if (items.length && items.every(Boolean)) {
      const ordered = items[0]!.ordered
      const Tag = ordered ? 'ol' : 'ul'
      out.push(
        <Tag key={b} className={`my-2 ${ordered ? 'list-decimal' : 'list-disc'} space-y-1 pl-5 first:mt-0 last:mb-0`}>
          {items.map((item, i) => (
            <li key={i}>{renderInline(item!.text, `${b}-${i}`)}</li>
          ))}
        </Tag>,
      )
      return
    }

    out.push(
      <p key={b} className="my-2 first:mt-0 last:mb-0">
        {lines.map((line, i) => (
          <span key={i}>
            {i > 0 && <br />}
            {renderInline(line, `${b}-${i}`)}
          </span>
        ))}
      </p>,
    )
  })

  return <>{out}</>
}
