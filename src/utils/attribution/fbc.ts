// src/utils/attribution/fbc.ts
//
// Meta's fbc value is not the raw fbclid. When the Pixel cannot create _fbc
// (for example because the library is blocked) but we captured fbclid on the
// landing URL, CAPI can still use the documented fb.1.<timestamp>.<fbclid>
// shape. The timestamp comes from the touch itself, not from the later order
// confirmation, so the identifier represents the ad click time.

export interface FbcTouchLike {
  fbclid?: string | null
  touchAtMs?: number | string | null
}

export function metaFbcFromTouch(touch: FbcTouchLike | null | undefined): string | null {
  const fbclid = typeof touch?.fbclid === 'string' ? touch.fbclid.trim() : ''
  if (!fbclid) return null

  const raw = touch?.touchAtMs
  const touchAtMs = typeof raw === 'number' ? raw : Number(raw)
  if (!Number.isFinite(touchAtMs) || touchAtMs <= 0) return null

  return `fb.1.${Math.trunc(touchAtMs)}.${fbclid}`
}
