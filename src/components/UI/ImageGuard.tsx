'use client';
// src/components/UI/ImageGuard.tsx
//
// Closes the routes a visitor has to lift a photograph off the page: the
// right-click menu, drag-out to the desktop or another tab, and the long-press
// sheet on a phone. Mounted once for the storefront and not for /admin, where
// the owner may legitimately want to save one of his own product shots.
// Renders nothing.
//
// The CSS half lives in globals.css - `-webkit-user-drag`, `user-select` and
// `-webkit-touch-callout` on every <img>. That is what stops iOS, which does
// not fire contextmenu for a long-press. This component covers what CSS
// cannot: the context menu itself, and dragstart in Firefox, which ignores
// -webkit-user-drag.
//
// It does NOT block right-click on the page as a whole. Text stays copyable,
// links keep "Open in new tab", inputs keep spell-check. Only a click that
// lands on a photograph is refused.
//
// To be clear about the limit: a screenshot, the network panel or the page
// source will always get the file. This is a deterrent for the casual save,
// which is what stops product photographs reappearing in other people's
// listings.

import { useEffect } from 'react';

/**
 * True when the context menu would offer to save an image.
 *
 * An <img> is the obvious case. The other is an element painted WITH a
 * photograph - the product page's magnifier is a <span> whose background is a
 * Cloudinary derivative, and Firefox's menu offers "View Background Image" on
 * exactly that. Gradients and the data: noise texture do not match, so a
 * right-click on a dark section still gets the ordinary menu.
 */
function paintsAPhotograph(target: EventTarget | null): boolean {
  if (!(target instanceof Element)) return false;
  if (target.tagName === 'IMG') return true;
  return /url\(["']?https?:/.test(getComputedStyle(target).backgroundImage);
}

export default function ImageGuard() {
  useEffect(() => {
    const onContextMenu = (e: MouseEvent) => {
      if (paintsAPhotograph(e.target)) e.preventDefault();
    };
    const onDragStart = (e: DragEvent) => {
      if (paintsAPhotograph(e.target)) e.preventDefault();
    };
    document.addEventListener('contextmenu', onContextMenu);
    document.addEventListener('dragstart', onDragStart);
    return () => {
      document.removeEventListener('contextmenu', onContextMenu);
      document.removeEventListener('dragstart', onDragStart);
    };
  }, []);

  return null;
}
