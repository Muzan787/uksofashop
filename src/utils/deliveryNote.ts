// src/utils/deliveryNote.ts
//
// What the driver's delivery note says about getting the sofa in (admin
// upgrade H1): the floor and lift, assembly, and the old sofa to take away.
//
// Website orders ask all three at checkout, so the answers are on the order.
// Orders taken on WhatsApp or the phone don't: the form never asks, and the
// columns hold their defaults (ground floor, no assembly, no removal). Printing
// those as fact would send a driver to a third-floor flat expecting a ground
// floor, so for those orders the note says it was agreed by phone - unless
// the order itself says yes.

export interface NoteAccessOrder {
  source: string | null
  delivery_floor: number | null
  delivery_has_lift: boolean | null
  wants_assembly: boolean | null
  wants_sofa_removal: boolean | null
  sofa_removal_seats: number | null
}

const AGREED = 'As agreed by phone'

export function deliveryNoteAccess(order: NoteAccessOrder): { label: string; value: string }[] {
  const takenByHand = order.source === 'whatsapp'
  const floor = Number(order.delivery_floor ?? 0)

  const floorLine = floor > 0
    ? `Floor ${floor}, ${order.delivery_has_lift ? 'lift available' : 'no lift'}`
    : takenByHand ? AGREED : 'Ground floor'

  const assembly = order.wants_assembly ? 'Yes, assemble on delivery' : takenByHand ? AGREED : 'No'

  const removal = order.wants_sofa_removal
    ? `Yes, take away the old sofa${order.sofa_removal_seats ? ` (${order.sofa_removal_seats} seats)` : ''}`
    : takenByHand ? AGREED : 'No'

  return [
    { label: 'Floor and lift', value: floorLine },
    { label: 'Assembly', value: assembly },
    { label: 'Old sofa removal', value: removal },
  ]
}
