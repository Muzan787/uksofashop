'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ArrowRight } from 'lucide-react';

export function QuickActionLink({ href, label, icon, accent }: { 
  href: string; 
  label: string; 
  icon: React.ReactNode; // 1. Change type to ReactNode
  accent: string 
}) {
  const [isHovered, setIsHovered] = useState(false);

  return (
    <Link 
      href={href}
      style={{ 
        display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', 
        borderRadius: 8, textDecoration: 'none', fontSize: 12, fontWeight: 600, 
        transition: 'all 0.15s',
        background: isHovered ? `${accent}18` : 'rgba(255,255,255,0.05)',
        color: isHovered ? accent : '#a8a29e',
        border: isHovered ? `1px solid ${accent}30` : '1px solid rgba(255,255,255,0.07)',
      }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* 2. Render the node directly */}
      {icon}
      {label}
      <ArrowRight style={{ width: 11, height: 11, marginLeft: 'auto', opacity: 0.4 }} />
    </Link>
  );
}