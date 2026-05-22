'use client';

import { useEffect, useState } from 'react';

// ─── Config ───────────────────────────────────────────────────────────────────
const ACCENT   = '#d4871a';
const DARK     = '#0c0c0b';
const DURATION = 3400; // ms before animation unmounts completely

// ─── Particle data ───────────────────────────────────────────────────────────
function genParticles() {
  const cols = [ACCENT, '#f5a623', '#fff', '#e8a940', '#b8721a', '#ffd580'];
  const particles = [];
  for (let i = 0; i < 28; i++) {
    const angle = (i / 28) * Math.PI * 2;
    const dist  = 120 + Math.random() * 110;
    particles.push({
      dx:    Math.cos(angle) * dist + (Math.random() - 0.5) * 44,
      dy:    Math.sin(angle) * dist + (Math.random() - 0.5) * 44,
      size:  4 + Math.random() * 6,
      color: cols[Math.floor(Math.random() * cols.length)],
      delay: Math.random() * 0.15,
      dur:   0.5 + Math.random() * 0.35,
    });
  }
  for (let j = 0; j < 14; j++) {
    const a = (j / 14) * Math.PI * 2 + 0.2;
    const d = 45 + Math.random() * 65;
    particles.push({
      dx: Math.cos(a) * d, dy: Math.sin(a) * d,
      size: 3, color: ACCENT,
      delay: 0.05 + Math.random() * 0.1,
      dur:   0.4 + Math.random() * 0.2,
    });
  }
  return particles;
}

// ─── Letter configs ───────────────────────────────────────────────────────────
const LETTERS = [
  { ch: 'U',   color: '#fff',   from: 'translateY(-80px) rotateX(-90deg)', delay: 550 },
  { ch: 'K',   color: '#fff',   from: 'translateY(-80px) rotateX(-90deg)', delay: 630 },
  { ch: ' ',   color: '#fff',   from: 'translateY(0)',                     delay: 0   },
  { ch: 'S',   color: '#fff',   from: 'translateY(80px) rotateX(90deg)',   delay: 720 },
  { ch: 'o',   color: '#fff',   from: 'translateY(80px) rotateX(90deg)',   delay: 790 },
  { ch: 'f',   color: '#fff',   from: 'translateY(80px) rotateX(90deg)',   delay: 860 },
  { ch: 'a',   color: '#fff',   from: 'translateY(80px) rotateX(90deg)',   delay: 930 },
  { ch: 'S',   color: ACCENT,   from: 'translateX(60px) rotateY(-60deg)',  delay: 1050 },
  { ch: 'h',   color: ACCENT,   from: 'translateX(60px) rotateY(-60deg)',  delay: 1120 },
  { ch: 'o',   color: ACCENT,   from: 'translateX(60px) rotateY(-60deg)',  delay: 1190 },
  { ch: 'p',   color: ACCENT,   from: 'translateX(60px) rotateY(-60deg)',  delay: 1260 },
];

// ─── Component ────────────────────────────────────────────────────────────────
export default function EntryAnimation() {
  const [visible,       setVisible]       = useState(false);
  const [phase,         setPhase]         = useState(0);
  const [particles,     setParticles]     = useState<ReturnType<typeof genParticles>>([]);
  const [letterShown,   setLetterShown]   = useState<boolean[]>(Array(LETTERS.length).fill(false));
  const [showUnderline, setShowUnderline] = useState(false);
  const [showShimmer,   setShowShimmer]   = useState(false);
  const [showTagline,   setShowTagline]   = useState(false);
  const [showIcon,      setShowIcon]      = useState(false);
  const [showRing1,     setShowRing1]     = useState(false);
  const [showRing2,     setShowRing2]     = useState(false);
  const [curtainOpen,   setCurtainOpen]   = useState(false);
  const [done,          setDone]          = useState(false);

  useEffect(() => {
    // Only run once per session
    if (typeof window === 'undefined') return;
    if (sessionStorage.getItem('ukss_intro_seen')) return;
    sessionStorage.setItem('ukss_intro_seen', '1');
    setVisible(true);
  }, []);

  useEffect(() => {
    if (!visible) return;

    const timers: ReturnType<typeof setTimeout>[] = [];
    const t = (fn: () => void, ms: number) => timers.push(setTimeout(fn, ms));

    // Lock scroll during animation
    document.body.style.overflow = 'hidden';

    // Phase sequence
    t(() => { setShowRing1(true); }, 80);
    t(() => { setShowRing2(true); setParticles(genParticles()); }, 160);
    t(() => { setShowIcon(true); }, 280);

    // Stagger letters
    LETTERS.forEach((l, i) => {
      if (l.ch === ' ') return;
      t(() => setLetterShown(prev => { const n = [...prev]; n[i] = true; return n; }), l.delay);
    });

    t(() => setShowUnderline(true), 1550);
    t(() => setShowShimmer(true),   1700);
    t(() => setShowTagline(true),   1850);
    t(() => setCurtainOpen(true),   2450);
    t(() => { document.body.style.overflow = ''; setDone(true); }, DURATION);

    return () => {
      timers.forEach(clearTimeout);
      document.body.style.overflow = '';
    };
  }, [visible]);

  if (!visible || done) return null;

  return (
    <>
      {/* ── Keyframes injected once ── */}
      <style>{`
        @keyframes ukssPOut {
          0%   { transform: translate(-50%,-50%) translate(0,0) scale(1); opacity:1; }
          100% { transform: translate(-50%,-50%) translate(var(--pdx),var(--pdy)) scale(0); opacity:0; }
        }
        @keyframes ukssRing {
          0%   { transform:translate(-50%,-50%) scale(0.2); opacity:0.9; }
          100% { transform:translate(-50%,-50%) scale(3.5); opacity:0; }
        }
        @keyframes ukssIcon {
          0%   { opacity:0; transform:scale(0.3) rotate(-20deg); }
          70%  { opacity:1; transform:scale(1.1) rotate(4deg); }
          100% { opacity:1; transform:scale(1) rotate(0deg); }
        }
        @keyframes ukssLetter {
          0%   { opacity:0; transform:var(--lfrom); }
          65%  { opacity:1; transform:var(--lmid); }
          100% { opacity:1; transform:translate(0,0) rotateX(0) rotateY(0); }
        }
        @keyframes ukssShimmer {
          0%   { left:-60%; }
          100% { left:160%; }
        }
        @keyframes ukssTag {
          0%   { opacity:0; letter-spacing:0.55em; }
          100% { opacity:0.5; letter-spacing:0.28em; }
        }
        @keyframes ukssCurtL {
          0%   { transform:translateX(0); }
          100% { transform:translateX(-102%); }
        }
        @keyframes ukssCurtR {
          0%   { transform:translateX(0); }
          100% { transform:translateX(102%); }
        }
      `}</style>

      {/* ── Overlay ── */}
      <div
        role="presentation"
        aria-hidden="true"
        style={{
          position:   'fixed',
          inset:       0,
          zIndex:      9999,
          overflow:   'hidden',
          background: DARK,
        }}
      >
        {/* Particles */}
        {particles.map((p, i) => (
          <div
            key={i}
            style={{
              position:    'absolute',
              left:        '50%',
              top:         '44%',
              width:        p.size,
              height:       p.size,
              borderRadius: '50%',
              background:   p.color,
              '--pdx':     `${p.dx}px`,
              '--pdy':     `${p.dy}px`,
              animation:   `ukssPOut ${p.dur}s cubic-bezier(.2,.8,.4,1) ${p.delay}s both`,
            } as React.CSSProperties}
          />
        ))}

        {/* Pulse rings */}
        {showRing1 && (
          <div style={{
            position: 'absolute', left: '50%', top: '44%',
            width: 80, height: 80, borderRadius: '50%',
            border: `2px solid rgba(212,135,26,0.8)`,
            animation: 'ukssRing 0.7s ease-out forwards',
          }} />
        )}
        {showRing2 && (
          <div style={{
            position: 'absolute', left: '50%', top: '44%',
            width: 80, height: 80, borderRadius: '50%',
            border: `1px solid rgba(212,135,26,0.4)`,
            animation: 'ukssRing 0.75s ease-out 0.12s forwards',
          }} />
        )}

        {/* Centre group */}
        <div style={{
          position:       'absolute', inset: 0,
          display:        'flex', flexDirection: 'column',
          alignItems:     'center', justifyContent: 'center',
        }}>
          {/* Icon */}
          {showIcon && (
            <div style={{
              width: 56, height: 56, background: ACCENT, borderRadius: 12,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              marginBottom: 14,
              boxShadow: `0 8px 40px ${ACCENT}44`,
              animation: 'ukssIcon 0.55s cubic-bezier(.16,1,.3,1) forwards',
            }}>
              <svg viewBox="0 0 24 24" width="32" height="32" fill="white">
                <path d="M21 9V7a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v2a1 1 0 0 0-1 1v3a1 1 0 0 0 1 1v1a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-1a1 1 0 0 0 1-1v-3a1 1 0 0 0-1-1zM5 7h14v2H5zm14 8H5v-1h14zm1-3H4v-1h16z"/>
              </svg>
            </div>
          )}

          {/* Letters */}
          <div style={{ perspective: '600px', display: 'flex', alignItems: 'baseline', position: 'relative' }}>
            {/* Shimmer */}
            {showShimmer && (
              <div style={{
                position:   'absolute', top: -10, bottom: -10,
                width:      '50%', pointerEvents: 'none',
                background: `linear-gradient(90deg,transparent,rgba(212,135,26,0.2),transparent)`,
                animation:  'ukssShimmer 0.65s ease-in-out forwards',
              }} />
            )}

            {LETTERS.map((l, i) => {
              if (l.ch === ' ') return (
                <span key={i} style={{ display: 'inline-block', width: 12 }} />
              );
              const midMap: Record<string, string> = {
                'translateY(-80px) rotateX(-90deg)': 'translateY(5px) rotateX(5deg)',
                'translateY(80px) rotateX(90deg)':   'translateY(-5px) rotateX(-5deg)',
                'translateX(60px) rotateY(-60deg)':  'translateX(-3px) rotateY(4deg)',
              };
              const mid = midMap[l.from] || 'translate(0,0)';
              return (
                <span
                  key={i}
                  style={{
                    fontFamily:  '"Playfair Display", Georgia, serif',
                    fontSize:    'clamp(36px, 8vw, 60px)',
                    fontWeight:   700,
                    color:        l.color,
                    display:     'inline-block',
                    opacity:      letterShown[i] ? undefined : 0,
                    transform:    letterShown[i] ? undefined : l.from,
                    '--lfrom':    l.from,
                    '--lmid':     mid,
                    animation:    letterShown[i]
                      ? `ukssLetter 0.55s cubic-bezier(.16,1,.3,1) forwards`
                      : 'none',
                    lineHeight:   1,
                  } as React.CSSProperties}
                >
                  {l.ch}
                </span>
              );
            })}
          </div>

          {/* Underline */}
          <div style={{
            height:     2,
            background: ACCENT,
            borderRadius: 1,
            marginTop:  4,
            width:      showUnderline ? '100%' : 0,
            transition: showUnderline ? 'width 0.45s cubic-bezier(.16,1,.3,1)' : 'none',
          }} />

          {/* Tagline */}
          <div style={{
            fontFamily:  'system-ui, sans-serif',
            fontSize:     'clamp(9px,2vw,11px)',
            letterSpacing: '0.28em',
            textTransform: 'uppercase',
            color:        'rgba(255,255,255,0.5)',
            marginTop:    14,
            opacity:       0,
            animation:    showTagline ? 'ukssTag 0.6s ease-out forwards' : 'none',
          }}>
            British Craftsmanship Since 1995
          </div>
        </div>

        {/* Curtains */}
        <div style={{
          position: 'absolute', top: 0, left: 0, width: '50%', height: '100%',
          background: DARK, zIndex: 10,
          animation: curtainOpen ? 'ukssCurtL 0.7s cubic-bezier(.7,0,.3,1) forwards' : 'none',
        }} />
        <div style={{
          position: 'absolute', top: 0, right: 0, width: '50%', height: '100%',
          background: DARK, zIndex: 10,
          animation: curtainOpen ? 'ukssCurtR 0.7s cubic-bezier(.7,0,.3,1) forwards' : 'none',
        }} />

        {/* Centre amber split line */}
        {curtainOpen && (
          <div style={{
            position: 'absolute', top: 0, bottom: 0, left: '50%',
            width: 2, background: ACCENT,
            transform: 'translateX(-50%)',
            zIndex: 11,
            opacity: curtainOpen ? 0 : 1,
            transition: 'opacity 0.1s',
          }} />
        )}
      </div>
    </>
  );
}