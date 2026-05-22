'use client';

import { useState } from 'react';
import Link from 'next/link';

export function StatCard({ label, value, sub, icon, accent, href }: {
  label: string; 
  value: string; 
  sub?: string; 
  icon: React.ReactNode; // 1. Change type to ReactNode
  accent: string; 
  href: string;
}) {
  const [isHovered, setIsHovered] = useState(false);

  return (
    <Link href={href} style={{ textDecoration: 'none' }}>
      <div 
        style={{
          background: '#fff', borderRadius: 12, padding: '18px 20px',
          border: '1px solid #e8e2da',
          boxShadow: isHovered ? '0 4px 16px rgba(0,0,0,0.08)' : '0 1px 4px rgba(0,0,0,0.04)',
          transform: isHovered ? 'translateY(-1px)' : 'translateY(0)',
          transition: 'box-shadow 0.2s ease, transform 0.2s ease',
          cursor: 'pointer',
        }}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 14 }}>
          <span style={{ fontSize: 11, fontWeight: 700, color: '#a8a29e', textTransform: 'uppercase', letterSpacing: '0.14em' }}>
            {label}
          </span>
          <div style={{ width: 34, height: 34, borderRadius: 8, background: `${accent}14`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            
            {/* 2. Render the node directly. No need for <Icon /> */}
            {icon} 
            
          </div>
        </div>
        <div style={{ fontSize: 28, fontWeight: 800, color: '#1c1917', letterSpacing: '-0.02em', lineHeight: 1 }}>
          {value}
        </div>
        {sub && <div style={{ fontSize: 11, color: '#a8a29e', marginTop: 6 }}>{sub}</div>}
      </div>
    </Link>
  );
}