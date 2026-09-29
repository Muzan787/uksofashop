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

/** Pounds, for the set - not per sample. */
export const SAMPLE_FEE_GBP = 5;

/** How the fee is written wherever a customer reads it. */
export const SAMPLE_FEE = `£${SAMPLE_FEE_GBP}`;
