// scripts/mattress-art.cjs
//
// Draws the eight mattress illustrations (1024x1024 SVG) that stand in for
// photographs until there are some. Uploaded to Cloudinary under
// Products/Mattresses as mattress-<slug>.svg and delivered as .png - see the
// beds-and-mattresses migration.
//
//   node scripts/mattress-art.cjs <outdir>
const fs = require('fs')
const path = require('path')
const out = process.argv[2]
fs.mkdirSync(out, { recursive: true })

const C = {
  bg1: '#F3F1EA', bg2: '#E9E4D8', ink900: '#191C1B', ink700: '#3B352E', ink500: '#5F574C',
  ember300: '#F5C784', ember500: '#D4871A', ember700: '#8F570D', calico50: '#FBFAF7', calico300: '#D6D2C6',
  sage: '#8E9C86', sage700: '#465241',
}

const M = [
  { slug: 'eco-spring-mattress', name: 'Eco Spring', depth: 8, depthLabel: '8″', line: '8 inch · open coil + foam · medium', core: 'coil', layers: ['foam'] },
  { slug: 'memory-foam-mattress', name: 'Memory Foam', depth: 10, depthLabel: '10″', line: '10 inch · full memory foam · medium-soft', core: 'memory', layers: ['memory'] },
  { slug: 'orthopaedic-firm-mattress', name: 'Orthopaedic Firm', depth: 11, depthLabel: '11″', line: '11 inch · orthopaedic foam · firm', core: 'ortho', layers: ['ortho'] },
  { slug: '1000-pocket-mattress', name: '1000 Pocket', depth: 11, depthLabel: '11″', line: '11 inch · 1,000 pocket springs · medium', core: 'pocket', springs: 11, layers: ['foam'] },
  { slug: '2000-pocket-mattress', name: '2000 Pocket', depth: 12, depthLabel: '12″', line: '12 inch · 2,000 pocket springs · medium-firm', core: 'pocket', springs: 15, layers: ['foam', 'fibre'] },
  { slug: 'pillow-top-pocket-mattress', name: 'Pillow Top Luxury', depth: 12, depthLabel: '12″', line: '12 inch · pocket springs · pillow top · soft', core: 'pocket', springs: 13, layers: ['foam'], pillow: true },
  { slug: 'emperor-3000-pocket-mattress', name: 'Emperor 3000', depth: 13, depthLabel: '3000', line: '3,000 pocket springs · luxury fillings', core: 'pocket', springs: 19, layers: ['memory', 'fibre'] },
  { slug: 'royal-5000-pocket-mattress', name: 'Royal 5000', depth: 14, depthLabel: '5000', line: '5,000 pocket springs · luxury fillings', core: 'pocket', springs: 25, layers: ['memory', 'foam', 'fibre'] },
]

const LAYER = {
  foam: { fill: '#F1E3C8', label: 'foam' },
  memory: { fill: '#F5C784', label: 'memory foam' },
  ortho: { fill: '#C9D1C0', label: 'orthopaedic foam' },
  fibre: { fill: '#FBF6EC', label: 'fibre' },
}

function svg(m) {
  // Geometry: a block in three-quarter view.
  const L = 96, R = 856, Y = 570          // front top edge
  const dx = 72, dy = 140                  // depth of the top face
  const T = Math.round(m.depth * 21) + (m.pillow ? 30 : 0) // thickness
  const top = [[L, Y], [R, Y], [R + dx, Y - dy], [L + dx, Y - dy]]
  const r = 22

  const parts = []
  // Shadow
  parts.push(`<ellipse cx="520" cy="${Y + T + 22}" rx="460" ry="30" fill="${C.ink900}" opacity="0.10"/>`)

  // Side face (right)
  parts.push(`<path d="M${R} ${Y} L${R + dx} ${Y - dy} L${R + dx} ${Y - dy + T} L${R} ${Y + T} Z" fill="#E3DCCB" stroke="#D6D2C6" stroke-width="4" stroke-linejoin="round"/>`)

  // Front face background (cover)
  parts.push(`<rect x="${L}" y="${Y}" width="${R - L}" height="${T}" rx="10" fill="${C.calico50}"/>`)

  // The section: layers inside a cut-away panel on the front.
  const inset = 26
  const px = L + inset, pw = R - L - inset * 2
  let y = Y + 16
  const bottom = Y + T - 14
  const section = []
  // Pillow top band
  if (m.pillow) {
    section.push(`<rect x="${px}" y="${y}" width="${pw}" height="30" rx="14" fill="${C.calico50}" stroke="${C.calico300}" stroke-width="3"/>`)
    for (let i = 0; i < 14; i++) section.push(`<circle cx="${px + 30 + i * (pw - 60) / 13}" cy="${y + 15}" r="3" fill="${C.calico300}"/>`)
    y += 38
  }
  // Quilted cover
  section.push(`<rect x="${px}" y="${y}" width="${pw}" height="16" fill="#FFFFFF"/>`)
  section.push(`<line x1="${px}" y1="${y + 8}" x2="${px + pw}" y2="${y + 8}" stroke="${C.calico300}" stroke-width="2" stroke-dasharray="10 8"/>`)
  y += 18
  // Comfort layers
  for (const k of m.layers) {
    section.push(`<rect x="${px}" y="${y}" width="${pw}" height="16" fill="${LAYER[k].fill}"/>`)
    if (k === 'fibre') for (let i = 0; i < 40; i++) section.push(`<path d="M${px + 8 + i * pw / 40} ${y + 11} q6 -8 12 0" fill="none" stroke="${C.calico300}" stroke-width="2"/>`)
    if (k === 'memory') for (let i = 0; i < 30; i++) section.push(`<circle cx="${px + 14 + i * (pw - 28) / 29}" cy="${y + 8}" r="2.2" fill="${C.ember500}" opacity="0.35"/>`)
    y += 18
  }
  // Core
  const coreTop = y, coreH = bottom - 14 - y
  if (m.core === 'pocket') {
    const n = m.springs
    const gap = 6
    const w = (pw - gap * (n + 1)) / n
    section.push(`<rect x="${px}" y="${coreTop}" width="${pw}" height="${coreH}" fill="#EFE9DC"/>`)
    for (let i = 0; i < n; i++) {
      const x = px + gap + i * (w + gap)
      section.push(`<rect x="${x}" y="${coreTop + 4}" width="${w}" height="${coreH - 8}" rx="${Math.min(10, w / 2)}" fill="#FFFFFF" stroke="${C.calico300}" stroke-width="2"/>`)
      const turns = Math.max(3, Math.round((coreH - 16) / 14))
      let d = `M${x + 4} ${coreTop + 10}`
      for (let t = 0; t < turns; t++) {
        const yy = coreTop + 10 + (t + 0.5) * (coreH - 20) / turns
        const yy2 = coreTop + 10 + (t + 1) * (coreH - 20) / turns
        d += ` Q${x + w - 3} ${yy} ${x + 4} ${yy2}`
      }
      section.push(`<path d="${d}" fill="none" stroke="${C.ink500}" stroke-width="${w > 30 ? 3 : 2}" stroke-linecap="round" opacity="0.75"/>`)
    }
  } else if (m.core === 'coil') {
    section.push(`<rect x="${px}" y="${coreTop}" width="${pw}" height="${coreH}" fill="#EFE9DC"/>`)
    section.push(`<line x1="${px}" y1="${coreTop + 4}" x2="${px + pw}" y2="${coreTop + 4}" stroke="${C.ink500}" stroke-width="3"/>`)
    section.push(`<line x1="${px}" y1="${coreTop + coreH - 4}" x2="${px + pw}" y2="${coreTop + coreH - 4}" stroke="${C.ink500}" stroke-width="3"/>`)
    const n = 9, w = pw / n
    for (let i = 0; i < n; i++) {
      const cx = px + w * (i + 0.5)
      let d = `M${cx} ${coreTop + 4}`
      const turns = 4
      for (let t = 0; t < turns; t++) {
        const a = coreTop + 4 + t * (coreH - 8) / turns
        const b = a + (coreH - 8) / turns
        d += ` C${cx + w * 0.42} ${a + (b - a) * 0.25} ${cx + w * 0.42} ${a + (b - a) * 0.75} ${cx} ${b}`
        d += ` M${cx} ${a} C${cx - w * 0.42} ${a + (b - a) * 0.25} ${cx - w * 0.42} ${a + (b - a) * 0.75} ${cx} ${b}`
      }
      section.push(`<path d="${d}" fill="none" stroke="${C.ink500}" stroke-width="3" opacity="0.7"/>`)
    }
  } else {
    const fill = m.core === 'memory' ? '#F7D9A4' : '#C9D1C0'
    section.push(`<rect x="${px}" y="${coreTop}" width="${pw}" height="${coreH}" fill="${fill}"/>`)
    // Open-cell texture
    for (let row = 0; row < Math.floor(coreH / 18); row++) {
      for (let i = 0; i < 34; i++) {
        const cx = px + 12 + i * (pw - 24) / 33 + (row % 2 ? 9 : 0)
        if (cx > px + pw - 8) continue
        section.push(`<circle cx="${cx}" cy="${coreTop + 12 + row * 18}" r="3" fill="${C.calico50}" opacity="0.55"/>`)
      }
    }
  }
  // Base
  section.push(`<rect x="${px}" y="${bottom - 12}" width="${pw}" height="12" fill="${C.ink700}" opacity="0.85"/>`)
  parts.push(`<g>${section.join('')}</g>`)
  // Piping along the front edges
  parts.push(`<rect x="${L}" y="${Y}" width="${R - L}" height="${T}" rx="10" fill="none" stroke="${C.calico300}" stroke-width="4"/>`)

  // Top face with tufting
  parts.push(`<path d="M${top[0][0]} ${top[0][1]} L${top[1][0]} ${top[1][1]} L${top[2][0]} ${top[2][1]} L${top[3][0]} ${top[3][1]} Z" fill="#FFFFFF" stroke="${C.calico300}" stroke-width="4" stroke-linejoin="round"/>`)
  for (let rr = 1; rr <= 3; rr++) {
    const f = rr / 4
    const lx = top[0][0] + (top[3][0] - top[0][0]) * f, ly = top[0][1] + (top[3][1] - top[0][1]) * f
    const rx = top[1][0] + (top[2][0] - top[1][0]) * f, ry = top[1][1] + (top[2][1] - top[1][1]) * f
    for (let cc = 1; cc <= 7; cc++) {
      const g = cc / 8
      parts.push(`<circle cx="${lx + (rx - lx) * g}" cy="${ly + (ry - ly) * g}" r="4.5" fill="${C.calico300}"/>`)
    }
  }
  if (m.pillow) {
    parts.push(`<path d="M${top[0][0] + 10} ${top[0][1] + 10} L${top[1][0] - 10} ${top[1][1] + 10}" stroke="${C.calico300}" stroke-width="3"/>`)
  }

  // Words
  const words = `
  <g font-family="Georgia, 'DejaVu Serif', serif" fill="${C.ink900}">
    <rect x="96" y="146" width="40" height="3" fill="${C.ember500}"/>
    <text x="150" y="154" font-family="Arial, 'DejaVu Sans', sans-serif" font-size="24" letter-spacing="6" fill="${C.ink500}" font-weight="700">MATTRESS</text>
    <text x="96" y="246" font-size="72" font-weight="700">${m.name}</text>
    <text x="98" y="294" font-family="Arial, 'DejaVu Sans', sans-serif" font-size="28" fill="${C.ink500}">${m.line}</text>
    <text x="98" y="334" font-family="Arial, 'DejaVu Sans', sans-serif" font-size="20" letter-spacing="3" fill="${C.ink500}" opacity="0.8">ILLUSTRATION · ALL UK SIZES 3FT – 6FT</text>
  </g>
  <g>
    <circle cx="880" cy="210" r="66" fill="${C.ember500}"/>
    <text x="880" y="${m.depthLabel.length > 3 ? 224 : 228}" text-anchor="middle" font-family="Georgia, 'DejaVu Serif', serif" font-size="${m.depthLabel.length > 3 ? 40 : 52}" font-weight="700" fill="${C.ink900}">${m.depthLabel}</text>
  </g>
`

  return `<svg xmlns="http://www.w3.org/2000/svg" width="1024" height="1024" viewBox="0 0 1024 1024">
  <defs><linearGradient id="bg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${C.bg1}"/><stop offset="1" stop-color="${C.bg2}"/></linearGradient></defs>
  <rect width="1024" height="1024" fill="url(#bg)"/>
  ${words}
  ${parts.join('\n  ')}
</svg>`
}

for (const m of M) fs.writeFileSync(path.join(out, `${m.slug}.svg`), svg(m))
console.log(M.map(m => m.slug).join('\n'))
