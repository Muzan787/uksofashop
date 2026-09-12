// src/app/api/chat/route.ts
//
// The website assistant. The widget (components/Chat/ChatWidget.tsx) posts
// the conversation so far; this streams the next reply back as plain text.
//
// ONE CALL PER TURN, NO TOOLS. The whole catalogue is in the system prompt
// (utils/chat/knowledge.ts), so the model never has to go and look anything
// up - which keeps a reply to one round trip and means the first words are on
// screen in about a second rather than after a tool loop.
//
// CACHED PREFIX. The knowledge block is several thousand tokens and is the
// same for every visitor, so it carries cache_control with a one-hour TTL:
// after the first turn of the hour, every visitor's turn reads it at a tenth
// of the price. The one volatile fact - which page the visitor is on - is a
// SEPARATE system block placed after the cached one, so it never breaks the
// match.
//
// PLAIN TEXT, NOT SSE. The client only needs the text deltas, so the body is
// the reply itself, chunked as it is generated. Anything that fails before
// the first byte comes back as a JSON error with a status; anything that
// fails after it is finished with a short apology in the stream, because a
// half-written answer that just stops looks like the shop's fault.
//
// COST CONTROLS. Per-IP rate limit, a cap on how much history is accepted, a
// cap on message length and a modest max_tokens - the assistant is told to be
// brief, and nothing it should ever say needs more than a few hundred tokens.

import Anthropic from '@anthropic-ai/sdk'
import { NextResponse } from 'next/server'
import { headers } from 'next/headers'
import { z } from 'zod'
import { rateLimit, callerKey } from '@/utils/rateLimit'
import { getAssistantKnowledge } from '@/utils/chat/knowledge'

export const dynamic = 'force-dynamic'
// A reply streams for a few seconds; Vercel's default function timeout is
// enough, but a slow first token on a cold cache should not be cut off.
export const maxDuration = 60

const MODEL = 'claude-opus-5'

/** Turns kept per request. Older ones are dropped by the widget before posting. */
const MAX_TURNS = 16
const MAX_MESSAGE_CHARS = 1500

/** What the visitor reads if the model cannot answer for any reason. */
const FALLBACK =
  'Sorry, I could not answer that just now. Message us on WhatsApp using the button below and someone from the team will reply.'
/** The same hand-over, for the errors returned before a reply starts. */
const UNAVAILABLE =
  'The assistant is not available right now. Message us on WhatsApp using the button below and someone from the team will reply.'

const bodySchema = z.object({
  messages: z
    .array(
      z.object({
        role: z.enum(['user', 'assistant']),
        content: z.string().trim().min(1).max(MAX_MESSAGE_CHARS),
      }),
    )
    .min(1)
    .max(MAX_TURNS),
  path: z.string().max(512).optional(),
})

function jsonError(message: string, status: number) {
  return NextResponse.json({ error: message }, { status, headers: { 'Cache-Control': 'no-store' } })
}

export async function POST(request: Request) {
  const hdrs = await headers()
  const limit = rateLimit(callerKey(hdrs, 'chat'), 20, 10 * 60 * 1000)
  if (!limit.ok) {
    return jsonError('Too many messages in a short time. Please try again in a few minutes, or message us on WhatsApp using the button below.', 429)
  }

  if (!process.env.ANTHROPIC_API_KEY) {
    return jsonError(UNAVAILABLE, 503)
  }

  let raw: unknown
  try {
    raw = await request.json()
  } catch {
    return jsonError('Bad request.', 400)
  }
  const parsed = bodySchema.safeParse(raw)
  if (!parsed.success) return jsonError('Bad request.', 400)

  const { messages, path } = parsed.data
  // The conversation must start with the visitor and end with the visitor;
  // the widget guarantees this, and anything else is a malformed request.
  if (messages[0].role !== 'user' || messages[messages.length - 1].role !== 'user') {
    return jsonError('Bad request.', 400)
  }

  // Only a storefront path is worth telling the model about; anything else
  // is left out rather than echoed into the prompt.
  const page = path && /^\/[\w\-./+%]*$/.test(path) && !path.startsWith('//') ? path : null

  const knowledge = await getAssistantKnowledge()
  const client = new Anthropic()

  const stream = client.messages.stream({
    model: MODEL,
    max_tokens: 700,
    system: [
      { type: 'text', text: knowledge, cache_control: { type: 'ephemeral', ttl: '1h' } },
      {
        type: 'text',
        text: page
          ? `The visitor is currently on the page ${page}. If that is a product page, they probably mean that product when they say "this sofa".`
          : 'The visitor is browsing the website.',
      },
    ],
    messages: messages.map<Anthropic.MessageParam>(m => ({ role: m.role, content: m.content })),
    // A short customer-service reply does not need deep reasoning, and the
    // visitor is watching a blinking cursor while it happens.
    output_config: { effort: 'low' },
    thinking: { type: 'adaptive' },
  })

  // Wait for the API to accept the request before committing to a 200. A bad
  // key, a rate limit at Anthropic's end or an outage all surface here, and
  // the widget can show an honest "not available" rather than an empty bubble.
  try {
    await stream.emitted('connect')
  } catch (err) {
    if (err instanceof Anthropic.AuthenticationError || err instanceof Anthropic.PermissionDeniedError) {
      console.error('[chat] Anthropic rejected the API key', err.message)
      return jsonError(UNAVAILABLE, 503)
    }
    if (err instanceof Anthropic.RateLimitError) {
      return jsonError('The assistant is busy right now. Please try again in a moment, or message us on WhatsApp using the button below.', 503)
    }
    console.error('[chat] could not start a reply', err)
    return jsonError(UNAVAILABLE, 502)
  }

  const encoder = new TextEncoder()
  let sentAnything = false

  const body = new ReadableStream<Uint8Array>({
    async start(controller) {
      const send = (text: string) => {
        if (!text) return
        sentAnything = true
        controller.enqueue(encoder.encode(text))
      }
      try {
        for await (const event of stream) {
          if (event.type === 'content_block_delta' && event.delta.type === 'text_delta') {
            send(event.delta.text)
          }
        }
        const final = await stream.finalMessage()
        if (final.stop_reason === 'refusal' || !sentAnything) send(FALLBACK)
      } catch (err) {
        console.error('[chat] stream failed', err)
        send(sentAnything ? '\n\nSorry - I lost the thread there. Could you ask that again?' : FALLBACK)
      } finally {
        controller.close()
      }
    },
    cancel() {
      stream.abort()
    },
  })

  return new Response(body, {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'no-store',
      // Stops any proxy holding the response until it is complete.
      'X-Accel-Buffering': 'no',
    },
  })
}
