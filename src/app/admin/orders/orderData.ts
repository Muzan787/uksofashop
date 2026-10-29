// src/app/admin/orders/orderData.ts
//
// What the orders list and the order page both read: the order with its lines,
// and the two pickers the new-order and edit forms choose from.

import 'server-only'
import type { createClient } from '@/utils/supabase/server'
import type { PickerFabric, PickerVariant } from './NewWhatsAppOrder'
import { asOptions, optionsLabel } from '@/utils/productOptions'

type Db = Awaited<ReturnType<typeof createClient>>

/** One order with everything the order page shows, lines included. */
export const ORDER_WITH_LINES = `
  *,
  order_items (
    id, variant_id, fabric_id, quantity, price_at_time_of_purchase,
    fabric_code, fabric_name, fabric_collection, customisation, custom_title,
    product_variants ( sku, color, products ( title ) )
  )
` as const

/** One order with its lines, or null. */
export function loadOrder(supabase: Db, id: string) {
  return supabase.from('orders').select(ORDER_WITH_LINES).eq('id', id).maybeSingle()
}

export type OrderWithLines = NonNullable<Awaited<ReturnType<typeof loadOrder>>['data']>

/**
 * The live sofas and fabrics, for the new-order and edit forms. Each sofa is
 * labelled "name · colour material · SKU" (G2), because a title on its own
 * does not tell you which of the six Veronas the customer means.
 */
export async function loadPickers(supabase: Db): Promise<{ variants: PickerVariant[]; fabrics: PickerFabric[] }> {
  const [{ data: variantRows }, { data: fabricRows }] = await Promise.all([
    supabase
      .from('product_variants')
      .select('id, sku, color, material, price_adjustment, options, products!inner ( title, base_price, is_active )')
      .eq('products.is_active', true),
    supabase
      .from('fabrics')
      .select('id, code, name, is_active, fabric_collections ( name )')
      .eq('is_active', true)
      .order('sort'),
  ])

  type VariantRow = {
    id: string
    sku: string | null
    color: string | null
    material: string | null
    price_adjustment: number | null
    options: unknown
    products: { title: string; base_price: number } | null
  }
  type FabricRow = { id: string; code: string; name: string; fabric_collections: { name: string } | null }

  const variants = ((variantRows ?? []) as unknown as VariantRow[])
    .filter(v => v.products)
    .map(v => ({
      id: v.id,
      // A bed's ten variants share a colour; the size and frame-or-set are
      // what tell them apart.
      label: [v.products!.title, optionsLabel(asOptions(v.options)), [v.color, v.material].filter(Boolean).join(' '), v.sku]
        .filter(Boolean)
        .join(' · '),
      price: Number(v.products!.base_price) + Number(v.price_adjustment ?? 0),
    }))
    .sort((a, b) => a.label.localeCompare(b.label))

  const fabrics = ((fabricRows ?? []) as unknown as FabricRow[]).map(f => ({
    id: f.id,
    label: `${f.fabric_collections?.name ?? 'Fabric'} ${f.name} (${f.code})`,
  }))

  return { variants, fabrics }
}
