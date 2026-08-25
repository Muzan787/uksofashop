// Shape returned by the public.track_order database function.
// Deliberately narrow: no customer name, email, phone or shipping address.

export interface TrackedOrderItem {
  quantity: number
  price_at_time_of_purchase: number
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
  /** Delivery breakdown. Optional: orders placed before delivery extras existed. */
  items_subtotal?: number
  delivery_total?: number
  delivery_floor?: number
  delivery_has_lift?: boolean
  fee_upstairs?: number
  wants_assembly?: boolean
  fee_assembly?: number
  wants_sofa_removal?: boolean
  fee_sofa_removal?: number
}
