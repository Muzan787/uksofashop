// src/constants/swatches.ts

/**
 * Five samples, £5 for the set, and the £5 comes back off a future order.
 *
 * WHY IT IS NO LONGER FREE. It was three, free, posted to anyone who asked,
 * and enough people worked out that "anyone who asked" included them several
 * times over that the drawer was being emptied by people who were never going
 * to buy a sofa. A charge that is refunded on purchase costs a real customer
 * nothing and costs a collector five pounds a go, which is the whole point of
 * it. Nothing on the storefront says any of that - a shop explaining which of
 * its customers it mistrusts is not a shop anybody enjoys buying from.
 *
 * The number went UP at the same time, from three to five. The fee makes the
 * request deliberate, so the old reason to keep the set small - postage on
 * requests nobody meant - stops applying, and five is a genuinely better set
 * to choose a sofa from.
 *
 * THE MONEY IS NEVER TAKEN ON THIS SITE. There is no card payment anywhere on
 * the storefront - sofas are cash on delivery - and samples are no exception:
 * the request books a phone call, and the £5 is settled on that call, before
 * anything is posted. That is also what makes the abuse stop. A fake request
 * costs us a phone call that never connects, rather than a stamp and a set of
 * cloth, because nothing goes in an envelope until somebody has paid.
 *
 * These live here rather than in any one surface because six of them now
 * quote the number, the fee, or both - the product dialog, the fabric guide,
 * /swatches, /build, the emails and the chat assistant - and a limit that
 * says five in one place and three in another is the kind of thing nobody
 * notices until a customer counts.
 */
export const MAX_SAMPLES = 5;

/**
 * The size of the fabric library, as the storefront quotes it.
 *
 * Verified against the database: 70 active rows in `fabrics`, across six
 * rows in `fabric_collections` (Plush Soft Velvet 17, Chenille 12, Crushed
 * Velvet 12, Naple 11, Marble 9, PVC Leather 9).
 *
 * These are constants rather than a live count on purpose - the number
 * appears in metadata, in llms.txt and in prose on six pages, and none of
 * those can wait on a query. But it did appear as a bare "70" in fourteen
 * places, so adding a colour meant fourteen edits and the first one anybody
 * forgot would be a false claim. Change these two when the library changes,
 * and check the figure above still matches.
 */
export const FABRIC_COLOUR_COUNT = 70;
export const FABRIC_COLLECTION_COUNT = 6;

/** Pounds, for the set - not per sample. */
const SAMPLE_FEE_GBP = 5;

/** How the fee is written wherever a customer reads it. */
export const SAMPLE_FEE = `£${SAMPLE_FEE_GBP}`;
