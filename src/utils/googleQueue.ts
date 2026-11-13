// src/utils/googleQueue.ts
//
// Where one Google offline-conversion row stands, in plain words, from the
// facts that exist. "In the Sheet" and "accepted by Google Ads" are different
// things and this file keeps them apart: only an independent Google Ads
// verification may say verified.
//
//   no_click     staged for internal use only; with no Google click id there
//                is nothing for Google Ads to match, so it is never uploaded
//   blocked      held, don't-send, cancelled or withdrawn
//   waiting      has a click id, not yet in the import Sheet
//   in_sheet     in the Sheet; Google Ads has not been checked
//   internal_flag  an older internal 'accepted' flag, not Google's word
//   verified     checked in Google Ads (Goals, Uploads)
//   adjustment   was imported and the order was since cancelled: needs a
//                retraction in Google Ads by a person

export type GoogleRowState = 'no_click' | 'blocked' | 'waiting' | 'in_sheet' | 'internal_flag' | 'verified' | 'adjustment'

export interface GoogleRow {
  status: string
  google_import_status: string
  sheet_synced_at: string | null
  acquisition: { gclid?: string | null; gbraid?: string | null; wbraid?: string | null } | null
}

export const GOOGLE_STATE_LABEL: Record<GoogleRowState, string> = {
  no_click: 'Staged only: no Google click',
  blocked: 'Blocked',
  waiting: 'Waiting for the Sheet',
  in_sheet: 'In Sheet, Google Ads not verified',
  internal_flag: 'Internal flag only, not Google’s word',
  verified: 'Verified in Google Ads',
  adjustment: 'Needs a retraction in Google Ads',
}

export const hasGoogleClick = (a: GoogleRow['acquisition']): boolean => Boolean(a && (a.gclid || a.gbraid || a.wbraid))

export function googleRowState(row: GoogleRow, blocked: boolean): GoogleRowState {
  if (row.google_import_status === 'adjustment_required') return 'adjustment'
  if (blocked || row.status === 'held' || row.status === 'withdrawn') return 'blocked'
  if (!hasGoogleClick(row.acquisition)) return 'no_click'
  if (row.google_import_status === 'verified') return 'verified'
  if (row.google_import_status === 'accepted') return 'internal_flag'
  return row.sheet_synced_at ? 'in_sheet' : 'waiting'
}
