// src/constants/palette.ts
//
// The three or four places that need a colour as a JavaScript string rather
// than as CSS.
//
// Browser chrome (viewport themeColor), the web app manifest and transactional
// email are all read by something that cannot resolve a CSS custom property —
// the OS status bar, the installer, and email clients respectively. They need a
// literal.
//
// These values MUST match src/styles/tokens.css, which stays the source of
// truth for everything that renders in the page. If a colour changes there,
// change it here too. Nothing else in the codebase may import this file — in a
// component, use the token.

export const PALETTE = {
  calico50: '#FBFAF7',
  calico100: '#F3F1EA',
  calico300: '#D6D2C6',
  ink500: '#5F574C',
  ink700: '#3B352E',
  ink900: '#191C1B',
  ember300: '#F5C784',
  ember500: '#D4871A',
  ember700: '#8F570D',
  sage700: '#465241',
  rust700: '#8C2F22',
} as const
