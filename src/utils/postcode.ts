// src/utils/postcode.ts
//
// One postcode implementation. The Homedata lookup below was written inline in
// CheckoutClient and lived nowhere else, so the product page could not confirm
// an address without a second copy of the request, the key handling and the
// three different response shapes the API returns.

/** Uppercased, single space before the inward code. "bb67ls" → "BB6 7LS". */
export function normalisePostcode(raw: string): string {
  const clean = raw.toUpperCase().replace(/\s+/g, '');
  if (clean.length < 5) return clean;
  return `${clean.slice(0, -3)} ${clean.slice(-3)}`;
}

/**
 * The official Royal Mail pattern. Deliberately strict: the estimator promises
 * a delivery date, and it should not promise one for "ABC 123".
 */
const UK_POSTCODE =
  /^([A-Z]{1,2}\d[A-Z\d]?|ASCN|STHL|TDCU|BBND|[BFS]IQQ|PCRN|TKCA)\s?\d[A-Z]{2}$/;

export function isValidUkPostcode(raw: string): boolean {
  return UK_POSTCODE.test(raw.toUpperCase().replace(/\s+/g, ' ').trim());
}

/** "BB6 7LS" → "BB6". */
export function outwardCode(raw: string): string {
  return normalisePostcode(raw).split(' ')[0] ?? '';
}

/**
 * Areas outside "UK Mainland", which is the wording of the delivery promise.
 *
 * Northern Ireland, the Isle of Man and the Channel Islands are separate
 * postcode areas. The Scottish entries are the islands and the far north,
 * where every carrier surcharges — these are the ranges the trade treats as
 * off-mainland, not a judgement we are inventing here.
 */
const OFF_MAINLAND_AREAS = ['BT', 'IM', 'JE', 'GY', 'HS', 'ZE'];
const OFF_MAINLAND_RANGES: Record<string, [number, number][]> = {
  KW: [[15, 17]],   // Orkney
  PA: [[20, 78]],   // Argyll islands
  PH: [[42, 44]],   // Isle of Skye and the small isles
  KA: [[27, 28]],   // Arran and Cumbrae
};

/**
 * True where the free-delivery promise applies.
 *
 * An unrecognisable postcode returns true rather than false: the estimator
 * only ever calls this on something that has already passed the pattern above,
 * and defaulting an unknown to "off mainland" would refuse free delivery to a
 * customer who is entitled to it.
 */
export function isMainland(raw: string): boolean {
  const out = outwardCode(raw);
  const area = out.replace(/\d.*$/, '');
  if (OFF_MAINLAND_AREAS.includes(area)) return false;

  const district = Number(out.slice(area.length).replace(/[A-Z]/g, ''));
  const ranges = OFF_MAINLAND_RANGES[area];
  if (!ranges || Number.isNaN(district)) return true;

  return !ranges.some(([lo, hi]) => district >= lo && district <= hi);
}

/**
 * Addresses at a postcode, from Homedata.
 *
 * Throws with a message written for a customer to read, because both callers
 * put it straight on screen. Homedata has been seen to answer with the list
 * under `suggestions` and under `results`, and each entry with either
 * `address` or `full_address` — hence the shape-juggling.
 */
export async function lookupAddresses(postcode: string): Promise<string[]> {
  const apiKey = process.env.NEXT_PUBLIC_HOMEDATA_API_KEY;
  if (!apiKey) throw new Error('Address lookup is unavailable. Please type your address.');

  const res = await fetch(
    `https://api.homedata.co.uk/api/address/find/?q=${encodeURIComponent(normalisePostcode(postcode))}`,
    { headers: { Authorization: `Api-Key ${apiKey}` } },
  );

  if (!res.ok) {
    if (res.status === 401 || res.status === 403) throw new Error('Invalid API Key.');
    if (res.status === 404) throw new Error('Postcode not found.');
    throw new Error('Could not fetch addresses. Please enter manually.');
  }

  const data = await res.json();
  const list = data.suggestions || data.results || [];
  if (!list.length) throw new Error('No addresses found for this postcode.');

  return list
    .map((item: { address?: string; full_address?: string }) => item.address || item.full_address)
    .filter(Boolean) as string[];
}
