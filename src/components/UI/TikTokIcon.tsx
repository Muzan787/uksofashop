// src/components/UI/TikTokIcon.tsx
//
// lucide-react dropped brand marks and never had TikTok, so this is the glyph
// as a plain inline SVG. It takes the same `style` and `className` props as a
// lucide icon and uses currentColor, so it can drop straight into the footer's
// icon list alongside Facebook and Instagram without special-casing.

export default function TikTokIcon({
  style,
  className,
}: {
  style?: React.CSSProperties
  className?: string
}) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden="true"
      focusable="false"
      style={style}
      className={className}
    >
      <path d="M16.6 5.82A4.28 4.28 0 0 1 15.54 3h-3.09v12.4a2.59 2.59 0 0 1-2.59 2.5 2.59 2.59 0 0 1 0-5.18c.27 0 .53.04.77.12V9.68a5.72 5.72 0 0 0-.77-.05A5.68 5.68 0 0 0 4.18 15.3 5.68 5.68 0 0 0 9.86 21a5.68 5.68 0 0 0 5.68-5.68V8.9a7.35 7.35 0 0 0 4.28 1.38V7.19a4.28 4.28 0 0 1-3.22-1.37z" />
    </svg>
  )
}
