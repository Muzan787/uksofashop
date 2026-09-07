'use client';
// src/components/UI/PhoneLink.tsx
//
// A drop-in replacement for a plain `<a href={PHONE_HREF}>` on pages that are
// otherwise server components (app/care-guide, app/faq, app/showroom). See
// components/UI/WhatsAppLink.tsx for the same pattern applied to WhatsApp.
// Every prop other than href/onClick passes straight through, so the visual
// markup at each call site is untouched.

import type { AnchorHTMLAttributes, ReactNode } from 'react';
import { PHONE_HREF } from '@/constants/contact';
import { usePhoneClick } from '@/utils/attribution/usePhoneClick';

type Props = Omit<AnchorHTMLAttributes<HTMLAnchorElement>, 'href' | 'onClick'> & {
  children: ReactNode;
};

export default function PhoneLink({ children, ...anchorProps }: Props) {
  const onClick = usePhoneClick();
  return (
    <a href={PHONE_HREF} onClick={onClick} {...anchorProps}>
      {children}
    </a>
  );
}
