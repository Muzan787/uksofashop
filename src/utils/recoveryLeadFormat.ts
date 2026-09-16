export type RecoveryBasketItem = {
  product_title?: string | null
  sku?: string | null
  color?: string | null
  material?: string | null
  fabric_name?: string | null
  fabric_code?: string | null
  fabric_collection?: string | null
  quantity?: number | null
  unit_price_gbp?: number | null
}

export function formatRecoveryBasket(value: unknown): string {
  if (!Array.isArray(value) || value.length === 0) return 'No product details'

  return value
    .map((raw) => {
      const item = (raw ?? {}) as RecoveryBasketItem
      const quantity = Number.isFinite(Number(item.quantity)) ? Number(item.quantity) : 1
      const price = Number(item.unit_price_gbp)
      const fabric = [item.fabric_collection, item.fabric_name, item.fabric_code ? `(${item.fabric_code})` : null]
        .filter(Boolean)
        .join(' ')

      return [
        item.product_title || 'Sofa',
        item.sku ? `SKU ${item.sku}` : null,
        item.color || null,
        fabric || item.material || null,
        `Qty ${quantity}`,
        Number.isFinite(price) ? `£${price.toFixed(2)}` : null,
      ]
        .filter(Boolean)
        .join(' · ')
    })
    .join(' | ')
}
