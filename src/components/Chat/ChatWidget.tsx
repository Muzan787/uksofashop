'use client';
// src/components/Chat/ChatWidget.tsx
//
// "Ask us" - the website assistant.
//
// Mounted once in MainLayoutWrapper, next to the WhatsApp button, and only
// when the server has an ANTHROPIC_API_KEY to answer with (root layout). It is
// a second floating button stacked above the WhatsApp one, on the same
// `--fab-extra` clearance, so the two move together when a bottom bar is up.
// Like that one it shows its word only while the page is at the top and
// contracts to a circle once scrolled (useCompactFab) - a size smaller than
// WhatsApp, because WhatsApp is the one that reaches a person.
//
// WHAT IT IS FOR. Visitors ask the same handful of things before they will
// message - does it fit, do you deliver here, how do I pay, can I have it in
// blue - and each one that goes unanswered is a visitor who leaves rather
// than opens WhatsApp. This answers those from the site's own facts and
// catalogue (see utils/chat/knowledge.ts) and then hands over: the WhatsApp
// link in the footer carries their last question with it, so the team picks
// up where the assistant left off.
//
// WHAT IT IS NOT. Not the sales channel. It cannot quote a custom size, take
// an order or agree a price, and it says so - the money is made on WhatsApp
// and this exists to get people there better informed, not to replace it.
//
// The conversation lives in sessionStorage so it survives a reload and a
// client-side navigation, and dies with the tab. Nothing is sent anywhere
// except to /api/chat when the visitor presses send.

import { useCallback, useEffect, useRef, useState } from 'react';
import { MessageCircleQuestionMark, RotateCcw, SendHorizontal, X } from 'lucide-react';
import { useWhatsAppCTA } from '@/utils/attribution/useWhatsAppCTA';
import { useCompactFab } from '@/components/Layout/useCompactFab';
import { PHONE_DISPLAY } from '@/constants/contact';
import { useBodyLock } from '@/components/UI/useBodyLock';
import WhatsAppIcon from '@/components/Product/WhatsAppIcon';
import AssistantText from './AssistantText';

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  /** A failure shown in the assistant's voice. Never sent back as history. */
  error?: boolean;
}

const STORAGE_KEY = 'uks-chat-v1';
const MAX_INPUT = 1500;
/** Turns sent with each request. Mirrors MAX_TURNS in app/api/chat/route.ts. */
const HISTORY_LIMIT = 16;

const FALLBACK = `Sorry, I can't answer that one just now. Please ring or WhatsApp ${PHONE_DISPLAY} and the team will help.`;

const STARTERS = [
  'Do you deliver to my area, and what does it cost?',
  'How does paying on delivery work?',
  'Can I have a sofa made in my own size and fabric?',
  'Will a corner sofa fit through my front door?',
];

function loadMessages(): ChatMessage[] {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter(isMessage) : [];
  } catch {
    return [];
  }
}

function isMessage(value: unknown): value is ChatMessage {
  if (!value || typeof value !== 'object') return false;
  const m = value as Record<string, unknown>;
  return (m.role === 'user' || m.role === 'assistant') && typeof m.content === 'string';
}

function saveMessages(messages: ChatMessage[]) {
  try {
    if (messages.length) sessionStorage.setItem(STORAGE_KEY, JSON.stringify(messages));
    else sessionStorage.removeItem(STORAGE_KEY);
  } catch {
    // Private mode, storage full - the conversation just does not persist.
  }
}

/**
 * What the API gets: the recent turns, minus failures and the empty bubble
 * that is about to be filled, trimmed so the first turn is the visitor's.
 */
function historyFor(messages: ChatMessage[]): ChatMessage[] {
  const clean = messages
    .filter(m => !m.error && m.content.trim())
    .map(m => ({ role: m.role, content: m.content.slice(0, MAX_INPUT) }));
  const recent = clean.slice(-HISTORY_LIMIT);
  const firstUser = recent.findIndex(m => m.role === 'user');
  return firstUser > 0 ? recent.slice(firstUser) : recent;
}

export default function ChatWidget() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const [narrow, setNarrow] = useState(false);
  const loaded = useRef(false);
  const compact = useCompactFab();

  const launcher = useRef<HTMLButtonElement>(null);
  const textarea = useRef<HTMLTextAreaElement>(null);
  const list = useRef<HTMLDivElement>(null);

  // Restore after mount, never during render: the server has no storage, and
  // a stored conversation rendered on the client's first pass would not match
  // the HTML it was hydrating.
  useEffect(() => {
    setMessages(loadMessages());
    loaded.current = true;
  }, []);
  useEffect(() => {
    if (loaded.current) saveMessages(messages);
  }, [messages]);

  // Below the lg breakpoint the panel is the whole screen, so the page behind
  // it is locked as any sheet would be. On a desktop it is a corner panel and
  // the page stays scrollable - a chat window that freezes the site behind it
  // is one people close to get their scrollbar back.
  useEffect(() => {
    const mq = window.matchMedia('(width < 64rem)');
    const update = () => setNarrow(mq.matches);
    update();
    mq.addEventListener('change', update);
    return () => mq.removeEventListener('change', update);
  }, []);
  useBodyLock(open && narrow);

  useEffect(() => {
    if (!open) return;
    textarea.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open]);

  // Follow the reply as it streams in.
  useEffect(() => {
    const el = list.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages, open]);

  const close = useCallback(() => {
    setOpen(false);
    launcher.current?.focus();
  }, []);

  const lastQuestion = [...messages].reverse().find(m => m.role === 'user')?.content.trim();
  const whatsapp = useWhatsAppCTA({
    message: lastQuestion
      ? `Hi, I was asking on your website: "${lastQuestion.slice(0, 300)}" - could someone help?`
      : 'Hi, I’d like some help with a sofa enquiry.',
    pageContext: 'chat_widget',
  });

  async function send(text: string) {
    const content = text.trim().slice(0, MAX_INPUT);
    if (!content || busy) return;

    const history = [...messages, { role: 'user' as const, content }];
    setMessages([...history, { role: 'assistant', content: '' }]);
    setInput('');
    setBusy(true);
    if (textarea.current) textarea.current.style.height = '';

    const replaceLast = (reply: string, error = false) =>
      setMessages(prev => [...prev.slice(0, -1), { role: 'assistant', content: reply, error }]);

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: historyFor(history), path: window.location.pathname }),
      });

      if (!res.ok || !res.body) {
        const data = await res.json().catch(() => null);
        replaceLast(typeof data?.error === 'string' ? data.error : FALLBACK, true);
        return;
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let reply = '';
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        reply += decoder.decode(value, { stream: true });
        replaceLast(reply);
      }
      reply += decoder.decode();
      if (reply.trim()) replaceLast(reply);
      else replaceLast(FALLBACK, true);
    } catch {
      replaceLast(FALLBACK, true);
    } finally {
      setBusy(false);
    }
  }

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    void send(input);
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    // Enter sends; Shift+Enter is a new line, as in every chat people use.
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      void send(input);
    }
  }

  function onInput(e: React.ChangeEvent<HTMLTextAreaElement>) {
    setInput(e.target.value.slice(0, MAX_INPUT));
    // Grow with the text up to a few lines, then scroll inside.
    const el = e.target;
    el.style.height = '';
    el.style.height = `${Math.min(el.scrollHeight, 128)}px`;
  }

  function reset() {
    if (busy) return;
    setMessages([]);
    textarea.current?.focus();
  }

  return (
    <>
      {/* The launcher. Stacked above the WhatsApp button in the bottom-right
          corner: same edge inset, same clearance, one button-height higher.
          Ink rather than a second colour so the green stays the one thing
          that means "talk to a person". 44px to WhatsApp's 48, and the label
          contracts the same way: 12px + 20px icon + 12px is a circle once the
          page is scrolled. The left-hand corner is the product page's
          "Add to cart" pill - see components/Layout/WhatsAppFab.tsx. */}
      <button
        ref={launcher}
        type="button"
        onClick={() => setOpen(true)}
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-controls="site-assistant"
        aria-label="Ask us a question"
        className={`hover-btn fab-offset-2 fixed right-4 z-sticky-bar flex h-11 items-center rounded-pill bg-ink-900 text-calico-50 shadow-e2 transition-[bottom,opacity,transform,padding,gap] duration-base ease-out-expo focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink-900 ${
          open ? 'pointer-events-none translate-y-2 opacity-0' : 'translate-y-0 opacity-100'
        } ${compact ? 'gap-0 px-3' : 'gap-2 px-4'}`}
      >
        <MessageCircleQuestionMark className="h-5 w-5 shrink-0" aria-hidden="true" />
        <span
          aria-hidden={compact || undefined}
          className={`grid transition-[grid-template-columns] duration-base ease-out-expo ${
            compact ? 'grid-cols-[0fr]' : 'grid-cols-[1fr]'
          }`}
        >
          <span
            className={`min-w-0 overflow-hidden whitespace-nowrap text-body-sm font-semibold transition-opacity duration-swift ease-out-expo ${
              compact ? 'opacity-0' : 'opacity-100'
            }`}
          >
            Ask us
          </span>
        </span>
      </button>

      {open && (
        <div
          id="site-assistant"
          role="dialog"
          aria-modal={narrow || undefined}
          aria-label="Ask us"
          className="fixed inset-0 z-drawer flex flex-col overflow-hidden bg-calico-50 lg:inset-auto lg:right-4 lg:bottom-6 lg:h-[min(640px,calc(100dvh-48px))] lg:w-[380px] lg:rounded-lg lg:border lg:border-calico-300 lg:shadow-e3"
          style={{ animation: 'fadeUp var(--dur-base) var(--ease-out-expo)' }}
        >
          {/* Header, on the same ink as the mobile menu and the footer. */}
          <div data-ground="dark" className="grad-ink relative shrink-0 bg-ink-900 text-calico-50">
            <span aria-hidden="true" className="block h-0.5" style={{ backgroundImage: 'var(--grad-rule)' }} />
            <div className="flex items-start justify-between gap-3 px-4 pb-4 pt-3">
              <div className="min-w-0">
                <p className="m-0 font-display text-h4 font-semibold leading-tight">
                  Ask us<span className="text-ember-300">.</span>
                </p>
                <p className="m-0 mt-1 text-caption text-calico-50/70">
                  Sofas, delivery, payment and returns, answered from our own details. Automated assistant - the team is on WhatsApp.
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-1">
                {messages.length > 0 && (
                  <button
                    type="button"
                    onClick={reset}
                    disabled={busy}
                    aria-label="Start a new conversation"
                    title="Start again"
                    className="hover-icon hover-icon-dark grid h-10 w-10 place-items-center rounded-pill text-calico-50/80 disabled:opacity-40"
                  >
                    <RotateCcw className="h-4 w-4" aria-hidden="true" />
                  </button>
                )}
                <button
                  type="button"
                  onClick={close}
                  aria-label="Close"
                  className="hover-icon hover-icon-dark glass-dark-panel grid h-10 w-10 place-items-center rounded-pill text-calico-50"
                >
                  <X className="h-5 w-5" aria-hidden="true" />
                </button>
              </div>
            </div>
          </div>

          {/* The conversation. Its own scroller, kept out of Lenis. */}
          <div
            ref={list}
            data-lenis-prevent
            className="flex-1 overflow-y-auto px-4 py-4"
            aria-live="polite"
            aria-busy={busy || undefined}
          >
            <div className="flex flex-col gap-3">
              <Bubble role="assistant">
                <p className="m-0">
                  Hello. Ask me about any of our sofas, delivery to your address, paying on the day, or
                  returns. For a custom size or a quote, the team answers on WhatsApp.
                </p>
              </Bubble>

              {messages.length === 0 && (
                <div className="flex flex-col items-start gap-2 pl-1 pt-1">
                  {STARTERS.map(q => (
                    <button
                      key={q}
                      type="button"
                      onClick={() => void send(q)}
                      className="hover-btn rounded-pill border border-calico-300 bg-calico-50 px-3.5 py-2 text-left text-body-sm text-ink-700"
                    >
                      {q}
                    </button>
                  ))}
                </div>
              )}

              {messages.map((m, i) => (
                <Bubble key={i} role={m.role} error={m.error}>
                  {m.role === 'user' ? (
                    <p className="m-0 whitespace-pre-wrap">{m.content}</p>
                  ) : m.content ? (
                    <AssistantText text={m.content} />
                  ) : (
                    <Typing />
                  )}
                </Bubble>
              ))}
            </div>
          </div>

          {/* The composer, then the way out to a person. */}
          <div className="shrink-0 border-t border-calico-300 bg-calico-50 px-3 pb-[max(12px,env(safe-area-inset-bottom))] pt-3">
            <form onSubmit={onSubmit} className="flex items-end gap-2">
              <label htmlFor="site-assistant-input" className="sr-only">
                Your question
              </label>
              <textarea
                ref={textarea}
                id="site-assistant-input"
                value={input}
                onChange={onInput}
                onKeyDown={onKeyDown}
                rows={1}
                maxLength={MAX_INPUT}
                placeholder="Type a question…"
                className="focus-ring-inset min-h-11 flex-1 resize-none rounded-md border border-calico-300 bg-calico-50 px-3.5 py-2.5 text-body-sm leading-relaxed text-ink-900 placeholder:text-ink-500"
              />
              <button
                type="submit"
                disabled={busy || !input.trim()}
                aria-label="Send"
                className="btn-ember hover-btn grid h-11 w-11 shrink-0 place-items-center rounded-pill text-ink-900 disabled:cursor-default disabled:opacity-40"
              >
                <SendHorizontal className="h-5 w-5" aria-hidden="true" />
              </button>
            </form>

            <a
              href={whatsapp.href}
              onClick={whatsapp.onClick}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-3 flex items-center justify-center gap-2 rounded-md py-2 text-caption font-semibold text-ink-700 no-underline hover:text-ink-900"
            >
              <WhatsAppIcon className="h-4 w-4 text-whatsapp-dark" />
              <span>Prefer a person? Message us on WhatsApp</span>
            </a>
          </div>
        </div>
      )}
    </>
  );
}

function Bubble({
  role,
  error,
  children,
}: {
  role: 'user' | 'assistant';
  error?: boolean;
  children: React.ReactNode;
}) {
  if (role === 'user') {
    return (
      <div className="flex justify-end">
        <div className="max-w-[88%] rounded-md rounded-br-sm bg-ink-900 px-3.5 py-2.5 text-body-sm leading-relaxed text-calico-50">
          {children}
        </div>
      </div>
    );
  }
  return (
    <div className="flex justify-start">
      <div
        className={`max-w-[92%] rounded-md rounded-bl-sm px-3.5 py-2.5 text-body-sm leading-relaxed ${
          error ? 'border border-rust-200 bg-rust-50 text-rust-700' : 'bg-calico-100 text-ink-700'
        }`}
      >
        {children}
      </div>
    </div>
  );
}

/** Three dots while the first words are on their way. */
function Typing() {
  return (
    <span className="flex h-5 items-center gap-1" aria-label="Typing">
      {[0, 1, 2].map(i => (
        <span
          key={i}
          className="block h-1.5 w-1.5 rounded-pill bg-ink-400"
          style={{ animation: `pulseDot 1.1s ${i * 0.16}s ease-in-out infinite` }}
        />
      ))}
    </span>
  );
}
