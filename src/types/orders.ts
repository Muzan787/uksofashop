// Shape returned by the public.track_order database function.
// Deliberately narrow: no customer name, email, phone or shipping address.

export interface TrackedOrderItem {
  quantity: number
  price_at_time_of_purchase: number
  /** The fabric a made-to-order sofa was ordered in. Null on stocked sofas. */
  fabric_code?: string | null
  fabric_name?: string | null
  fabric_collection?: string | null
  product_variants: {
    color: string | null
    products: { title: string } | null
  } | null
}

export interface TrackedOrder {
  id: string
  status: string
  created_at: string
  total_amount: number
  order_items: TrackedOrderItem[]
  /** Financial breakdown. Optional: orders placed before these fields existed. */
  items_subtotal?: number
  discount_amount?: number
  discount_tier?: string | null
  promotion_code?: string | null
  offer_source?: string | null
  delivery_total?: number
  delivery_floor?: number
  delivery_has_lift?: boolean
  fee_upstairs?: number
  wants_assembly?: boolean
  fee_assembly?: number
  wants_sofa_removal?: boolean
  fee_sofa_removal?: number
  sofa_removal_seats?: number | null
  /** YYYY-MM-DD the customer asked for at checkout, or null for as soon as possible. */
  preferred_delivery_date?: string | null
}

// ─────────────────────────────────────────────────────────────────────────────
// Shape returned by public.order_for_confirmation.
//
// Wider than TrackedOrder, because this is the order being shown back to the
// person who placed it so they can check it before confirming: the name, the
// address, the number we will ring, what they asked for on the day, and every
// line with its fabric and its /build choices. The full order uuid is what
// gets them here, and it only ever went to them.

export interface ConfirmationOrderItem {
  quantity: number
  price_at_time_of_purchase: number
  /** The fabric a made-to-order sofa was ordered in. Null on stocked sofas. */
  fabric_code?: string | null
  fabric_name?: string | null
  fabric_collection?: string | null
  /** The /build snapshot, when the line came from the sofa builder. */
  customisation?: unknown
  /** The variant's colourway - the photograph, not necessarily the order. */
  color: string | null
  title: string | null
}

export interface ConfirmationOrder {
  id: string
  status: string | null
  created_at: string | null
  confirmed_at: string | null
  cancelled_at: string | null
  customer_name: string
  customer_email: string | null
  customer_phone: string
  shipping_address: string
  special_instructions: string | null
  /** YYYY-MM-DD the customer asked for at checkout, or null for as soon as possible. */
  preferred_delivery_date: string | null
  has_made_to_order: boolean
  total_amount: number
  items_subtotal: number
  discount_amount: number
  discount_tier: string | null
  promotion_code: string | null
  delivery_total: number
  delivery_floor: number
  delivery_has_lift: boolean
  fee_upstairs: number
  wants_assembly: boolean
  fee_assembly: number
  wants_sofa_removal: boolean
  sofa_removal_seats: number | null
  fee_sofa_removal: number
  order_items: ConfirmationOrderItem[]
}
