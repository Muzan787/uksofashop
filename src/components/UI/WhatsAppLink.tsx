'use client';
// src/components/UI/WhatsAppLink.tsx
//
// A drop-in replacement for a plain `<a href={whatsAppHref(...)}>` on pages
// that are otherwise server components (app/contact, app/showroom,
// app/swatches). Wraps utils/attribution/useWhatsAppCTA.ts - reference
// minting, the enquiry beacon, the Contact event - behind a small client
// island, so none of those pages has to become a client component just to
// gain tracking on one button. Every other prop (className, style,
// data-ground, ...) passes straight through unchanged, so the visual markup
// at each call site is untouched.

import type { AnchorHTMLAttributes, ReactNode } from 'react';
import { useWhatsAppCTA, type WhatsAppCTAOptions } from '@/utils/attribution/useWhatsAppCTA';

type Props = WhatsAppCTAOptions &
  Omit<AnchorHTMLAttributes<HTMLAnchorElement>, 'href' | 'onClick'> & {
    children: ReactNode;
  };

export default function WhatsAppLink({
  message,
  pageContext,
  productId,
  variantId,
  productName,
  children,
  ...anchorProps
}: Props) {
  const cta = useWhatsAppCTA({ message, pageContext, productId, variantId, productName });

  return (
    <a href={cta.href} onClick={cta.onClick} target="_blank" rel="noopener noreferrer" {...anchorProps}>
      {children}
    </a>
  );
}
