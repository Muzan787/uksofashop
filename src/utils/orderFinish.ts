// src/utils/orderFinish.ts
//
// What the sofa is in, as one line.
//
// A made-to-order sofa is photographed in one colourway and built in whichever
// fabric the customer picked, so the variant's colour is the photograph, not
// the order. Print both and the order reads as two instructions - "Grey" over
// "Chenille Mink" - which is how a sofa gets made in the wrong colour. When a
// fabric was chosen it is the only colour that gets printed. A stocked recliner
// has no fabric choice, and there the variant colour is the truth.
//
// Used everywhere an order line is shown after the order exists: the admin
// list, the printed invoice, the copy-to-WhatsApp text, the customer's
// tracking page and account history. The basket and checkout have their own
// fabric_label and already put it first.

export interface FinishSource {
  fabric_code?: string | null
  fabric_name?: string | null
  fabric_collection?: string | null
  /** The variant's colourway, when known. */
  color?: string | null
}

export interface Finish {
  /** "Chenille Mink" for a chosen fabric, else the variant colour, else null. */
  label: string | null
  /** The fabric code the purchase order needs, when a fabric was chosen. */
  code: string | null
}

export function describeFinish(item: FinishSource): Finish {
  const code = item.fabric_code?.trim() || null
  if (code) {
    const label = [item.fabric_collection, item.fabric_name]
      .map(s => s?.trim())
      .filter(Boolean)
      .join(' ')
    return { label: label || null, code }
  }
  return { label: item.color?.trim() || null, code: null }
}

/** "Chenille Mink (CH02)" or "Grey" or "". */
export function finishText(item: FinishSource): string {
  const { label, code } = describeFinish(item)
  if (!label && !code) return ''
  if (!code) return label ?? ''
  return label ? `${label} (${code})` : code
}
