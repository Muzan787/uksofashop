// src/components/Chat/assistantEvents.ts
//
// How a page reaches the assistant without importing it. The widget is
// mounted once by the layout, and only when there is an API key; anything
// that wants to open it dispatches ASSISTANT_OPEN_EVENT and checks
// assistantReady() first so it never offers a button that does nothing.

export const ASSISTANT_OPEN_EVENT = 'ukss:open-assistant';
export const ASSISTANT_READY_EVENT = 'ukss:assistant-ready';

/** Set on <html> by ChatWidget while it is mounted. */
const READY_ATTRIBUTE = 'data-assistant';

export function markAssistantReady(ready: boolean): void {
  const root = document.documentElement;
  if (ready) root.setAttribute(READY_ATTRIBUTE, 'ready');
  else root.removeAttribute(READY_ATTRIBUTE);
  window.dispatchEvent(new Event(ASSISTANT_READY_EVENT));
}

export function assistantReady(): boolean {
  return document.documentElement.getAttribute(READY_ATTRIBUTE) === 'ready';
}

/** /shop/<category>/<slug> - the product pages, where the pill stands down. */
export function isProductPage(pathname: string | null | undefined): boolean {
  return /^\/shop\/[^/]+\/[^/]+\/?$/.test(pathname ?? '');
}
