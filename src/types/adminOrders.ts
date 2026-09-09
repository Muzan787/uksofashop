export interface AdminOrderProductDisplay {
  title: string | null
}

export interface AdminOrderVariantDisplay {
  color: string | null
  sku: string | null
  products: AdminOrderProductDisplay | null
}

export interface AdminOrderItemDisplay {
  quantity: number
  price_at_time_of_purchase: number
  fabric_code?: string | null
  fabric_name?: string | null
  fabric_collection?: string | null
  product_variants: AdminOrderVariantDisplay | null
}

/**
 * Narrow shape shared by the admin order copy/print helpers. It intentionally
 * models only what those two presentation surfaces read from the joined order
 * query, rather than weakening them with `any` or coupling them to the whole
 * database row.
 */
export interface AdminOrderDisplay {
  id: string
  created_at: string | null
  customer_name: string
  customer_email: string | null
  customer_phone: string
  shipping_address: string
  items_subtotal: number | null
  total_amount: number
  discount_amount?: number | null
  promotion_code?: string | null
  delivery_floor?: number | null
  delivery_has_lift?: boolean | null
  fee_upstairs?: number | null
  fee_assembly?: number | null
  fee_sofa_removal?: number | null
  order_items: AdminOrderItemDisplay[]
}
