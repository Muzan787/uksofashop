from pathlib import Path


def replace(path: str, old: str, new: str, count: int | None = None) -> None:
    p = Path(path)
    text = p.read_text()
    found = text.count(old)
    if found == 0:
        raise SystemExit(f"missing replacement in {path}: {old[:140]!r}")
    if count is not None and found != count:
        raise SystemExit(f"unexpected count in {path}: expected {count}, found {found}: {old[:140]!r}")
    p.write_text(text.replace(old, new))


# Central promises: qualify delivery timing, preserve the true product-level
# made-to-order promise, and introduce a safe global custom-options promise.
replace(
    "src/constants/promises.ts",
    """  delivery: {
    label: 'Free Delivery',
    sub: 'UK Mainland, ground floor',
    short: 'Free UK Mainland delivery',
    long: 'Free delivery to UK Mainland addresses, brought to the ground floor or a ground-floor room of your choice.',
  },""",
    """  delivery: {
    label: 'Free Delivery',
    sub: 'UK Mainland, ground floor',
    short: 'Free UK Mainland delivery',
    long: 'Free delivery to UK Mainland addresses, brought to the ground floor or a ground-floor room of your choice.',
    timingShort: 'Most UK Mainland: 2–4 working days',
    timingException: 'Some Wales and Scotland postcodes take 5–7 working days.',
    timingLong: 'Most UK Mainland orders arrive in 2–4 working days. Some Wales and Scotland postcodes take 5–7 working days.',
  },""",
    1,
)
replace(
    "src/constants/promises.ts",
    """  custom: {
    label: 'Made to Order',
    sub: 'Your fabric and size',
    short: 'Fabric sofas made to order',
    long: 'Our fabric sofas are made to order in the colour, material and size you choose.',
  },""",
    """  custom: {
    label: 'Made to Order',
    sub: 'Your fabric and size',
    short: 'Fabric sofas made to order',
    long: 'Our fabric sofas are made to order in the colour, material and size you choose.',
  },
  customGlobal: {
    label: 'Custom Options',
    sub: 'Fabric & size options available',
    short: 'Custom fabric & size options available',
    long: 'Custom fabric and size options are available on selected sofas.',
  },""",
    1,
)
replace(
    "src/constants/promises.ts",
    """export const ANNOUNCEMENTS = [
  'Free Delivery to UK Mainland',
  'Fabric Sofas Made to Your Own Size and Colour',
  'Cash on Delivery Available Nationwide',
  'Delivered in 2-4 Working Days',
] as const""",
    """export const ANNOUNCEMENTS = [
  'Free Delivery to UK Mainland',
  'Fabric Sofas Made to Your Own Size and Colour',
  'Pay Cash or by Bank Transfer on Delivery',
  'Most UK Mainland Orders: 2-4 Working Days',
] as const""",
    1,
)
replace("src/constants/promises.ts", "  PROMISES.custom,\n", "  PROMISES.customGlobal,\n", 1)

# Footer: placeholder profiles stay in central config but never render publicly.
replace(
    "src/components/Layout/Footer.tsx",
    """const socials = SOCIAL_PROFILES.map(({ platform, url }) => ({
  Icon: SOCIAL_ICONS[platform],
  href: url,
  label: SOCIAL_LABELS[platform],
}));""",
    """const socials = SOCIAL_PROFILES.filter((profile) => !profile.placeholder).map(({ platform, url }) => ({
  Icon: SOCIAL_ICONS[platform],
  href: url,
  label: SOCIAL_LABELS[platform],
}));""",
    1,
)

# Homepage: live catalogue count is not warehouse stock.
replace("src/components/Home/Hero.tsx", "{sofaCount} in stock", "{sofaCount} sofas available", 1)
replace(
    "src/components/Home/Hero.tsx",
    "Made to your size. Delivered free. Paid for on the doorstep.",
    "Fabric sofas made to your size. Delivered free. Pay on arrival.",
    1,
)

replace(
    "src/components/Home/StatsBand.tsx",
    "import { HOME_ART, hasArt } from '@/constants/homeArt';",
    "import { HOME_ART, hasArt } from '@/constants/homeArt';\nimport { PROMISES } from '@/constants/promises';",
    1,
)
replace(
    "src/components/Home/StatsBand.tsx",
    "and the two\n * fixed terms of the offer — nothing paid up front, two to four working days.",
    "and the two\n * fixed terms of the offer — nothing paid up front, plus the qualified delivery window.",
    1,
)
replace(
    "src/components/Home/StatsBand.tsx",
    """            <span className="font-data text-data font-semibold tabular-nums text-ember-300">
              2–4 working days
            </span>
            <span aria-hidden="true" className="h-3 w-px bg-calico-50/25" />
            <span className="text-body-sm text-calico-300">
              Free delivery to UK mainland, brought to the ground floor
            </span>""",
    """            <span className="font-data text-data font-semibold tabular-nums text-ember-300">
              {PROMISES.delivery.timingShort}
            </span>
            <span aria-hidden="true" className="h-3 w-px bg-calico-50/25" />
            <span className="text-body-sm text-calico-300">
              {PROMISES.delivery.timingException}
            </span>""",
    1,
)

replace(
    "src/components/Home/CraftStory.tsx",
    "import { blurDataURL } from '@/utils/cloudinary';",
    "import { blurDataURL } from '@/utils/cloudinary';\nimport { PROMISES } from '@/constants/promises';",
    1,
)
replace(
    "src/components/Home/CraftStory.tsx",
    " * 2–4 working days. No founding date, no heritage, no workshop we do not have.",
    " * qualified delivery timing. No founding date, no heritage, no workshop we do not have.",
    1,
)
replace(
    "src/components/Home/CraftStory.tsx",
    """    body:
      'Cash on delivery means what it says. Our team carries it in, you look at it, and only then does any money change hands — by cash or bank transfer, on the doorstep. Delivery across UK mainland is free and usually takes two to four working days.',""",
    """    body:
      `Cash on delivery means what it says. Our team carries it in, you look at it, and only then does any money change hands — by cash or bank transfer, on the doorstep. Delivery across UK Mainland is free. ${PROMISES.delivery.timingLong}`,""",
    1,
)

# PDP: retain an estimate but qualify the normal 2–4-day window.
replace(
    "src/components/Product/DeliveryEstimate.tsx",
    """ * The dates are real. `deliveryWindow()` turns "2–4 working days" into two
 * calendar dates on the server, so the page answers the question rather than
 * restating the policy and leaving the customer to count weekends. The <time>
 * elements carry the machine-readable dates for anything parsing the page.""",
    """ * `deliveryWindow()` turns the normal 2–4-working-day mainland window into
 * two calendar dates on the server. The visible label qualifies that window,
 * because some Wales and Scotland postcodes take 5–7 working days and no
 * regional postcode mapping exists here.""",
    1,
)
replace(
    "src/components/Product/DeliveryEstimate.tsx",
    """          <p className="mt-1.5 text-body font-semibold leading-snug text-ink-900">
            Arrives{' '}
            <time dateTime={estimate.fromISO} className="font-data font-semibold tabular-nums">
              {estimate.label.split(' – ')[0]}
            </time>
            {' – '}
            <time dateTime={estimate.toISO} className="font-data font-semibold tabular-nums">
              {estimate.label.split(' – ')[1]}
            </time>
          </p>
          <p className="mt-1 text-body-sm text-ink-500">{PROMISES.delivery.long}</p>""",
    """          <p className="mt-1.5 text-body font-semibold leading-snug text-ink-900">
            Most UK Mainland: arrives{' '}
            <time dateTime={estimate.fromISO} className="font-data font-semibold tabular-nums">
              {estimate.label.split(' – ')[0]}
            </time>
            {' – '}
            <time dateTime={estimate.toISO} className="font-data font-semibold tabular-nums">
              {estimate.label.split(' – ')[1]}
            </time>
          </p>
          <p className="mt-1 text-body-sm text-ink-500">{PROMISES.delivery.timingException}</p>
          <p className="mt-1 text-body-sm text-ink-500">{PROMISES.delivery.long}</p>""",
    1,
)

# Postcode helper knows mainland/off-mainland, not the mainland timing band.
replace("src/components/Product/DeliveryEstimator.tsx", "import { deliveryWindow, type DeliveryWindow } from '@/utils/delivery';\n", "", 1)
replace("src/components/Product/DeliveryEstimator.tsx", "  | { kind: 'free'; postcode: string; window: DeliveryWindow }\n", "  | { kind: 'free'; postcode: string }\n", 1)
replace(
    "src/components/Product/DeliveryEstimator.tsx",
    """ * The page already states 2–4 working days and free UK Mainland delivery. That
 * is a policy, not an answer: a customer paying cash on the doorstep is
 * deciding whether they will be in the house on a particular day, and whether
 * the number they have been quoted is the number they will hand over. This
 * turns both into facts about their address.""",
    """ * The postcode can safely answer whether the free UK Mainland service applies.
 * It cannot safely assign a delivery band inside the mainland, so this component
 * deliberately keeps the timing qualified instead of fabricating regional
 * precision from the postcode string.""",
    1,
)
replace("src/components/Product/DeliveryEstimator.tsx", """    // The date is computed first and is never contingent on the network.
    const window = deliveryWindow();

""", "", 1)
replace("src/components/Product/DeliveryEstimator.tsx", "    setResult({ kind: 'free', postcode, window });", "    setResult({ kind: 'free', postcode });", 1)
replace(
    "src/components/Product/DeliveryEstimator.tsx",
    """            <p className="m-0 mt-2 font-data text-body font-semibold tabular-nums text-ink-900">
              Delivered{' '}
              <time dateTime={result.window.fromISO}>{result.window.label.split(' – ')[0]}</time>
              {' – '}
              <time dateTime={result.window.toISO}>{result.window.label.split(' – ')[1]}</time>
            </p>
            <p className="m-0 mt-2 text-caption leading-relaxed text-ink-500">
              {PROMISES.delivery.sub}. {PROMISES.payment.long}
            </p>""",
    """            <p className="m-0 mt-2 text-body font-semibold text-ink-900">
              {PROMISES.delivery.timingLong}
            </p>
            <p className="m-0 mt-2 text-caption leading-relaxed text-ink-500">
              {PROMISES.delivery.sub}. {PROMISES.payment.long}
            </p>""",
    1,
)

# Delivery policy is the explicit regional source of truth.
replace(
    "src/app/delivery-returns/page.tsx",
    "import { ASSEMBLY_FEE, SOFA_REMOVAL_FEE, UPSTAIRS_FIRST_FLOOR } from '@/constants/delivery'",
    "import { ASSEMBLY_FEE, SOFA_REMOVAL_FEE, UPSTAIRS_FIRST_FLOOR } from '@/constants/delivery'\nimport { PROMISES } from '@/constants/promises'",
    1,
)
replace(
    "src/app/delivery-returns/page.tsx",
    """const DESCRIPTION =
  'Free delivery across UK Mainland in 2–4 working days, paid on delivery. What to do if your sofa arrives damaged, and your 14-day right to change your mind.'""",
    """const DESCRIPTION =
  `${PROMISES.delivery.short}. ${PROMISES.delivery.timingLong} Pay on delivery. What to do if your sofa arrives damaged, and your 14-day right to change your mind.`""",
    1,
)
replace("src/app/delivery-returns/page.tsx", "  { icon: Clock, label: '2–4 working days' },", "  { icon: Clock, label: PROMISES.delivery.timingShort },", 1)
replace(
    "src/app/delivery-returns/page.tsx",
    """          bring your sofa to the ground floor, or to a ground-floor room of your choice. Orders
          arrive within two to four working days of purchase, anywhere on the mainland — England,
          Scotland and Wales alike.""",
    """          bring your sofa to the ground floor, or to a ground-floor room of your choice. Most UK
          Mainland orders arrive in two to four working days. Some Wales and Scotland postcodes
          take five to seven working days.""",
    1,
)
replace("src/app/delivery-returns/page.tsx", 'updated="2026-08-28"', 'updated="2026-09-07"', 1)

replace(
    "src/components/Editorial/CoverageMap.tsx",
    """    // This band said 5-7, and was the source of that claim in the prose above
    // the map, in the FAQ, in the category copy and in two Journal articles.
    // The whole mainland is 2-4 working days; within that, Wales and Scotland
    // are 3-4 rather than 2-4. Both figures confirmed by the owner.
    window: '3–4 working days',""",
    """    // Slower mainland band. Keep this explicit rather than deriving it from
    // a postcode prefix: the site has no maintained region-to-postcode map.
    window: '5–7 working days',""",
    1,
)

# FAQ uses the same central timing sentence as the storefront.
replace(
    "src/app/faq/faqData.ts",
    "import { ASSEMBLY_FEE, SOFA_REMOVAL_FEE, UPSTAIRS_FIRST_FLOOR } from '@/constants/delivery'",
    "import { ASSEMBLY_FEE, SOFA_REMOVAL_FEE, UPSTAIRS_FIRST_FLOOR } from '@/constants/delivery'\nimport { PROMISES } from '@/constants/promises'",
    1,
)
replace(
    "src/app/faq/faqData.ts",
    "a: 'Orders reach UK Mainland addresses within 2–4 working days of purchase — England, Scotland and Wales alike. Around 90% arrive inside that window, unless you have asked us to hold it back; if anything is going to run late on yours we will tell you as soon as the order reaches us rather than leaving you to find out on the day. Northern Ireland, the Isle of Man and the Scottish Islands sit outside the standard service, so please get in touch before ordering and we will arrange it.',",
    "a: `${PROMISES.delivery.timingLong} Around 90% arrive inside the window for their delivery band, unless you have asked us to hold it back. Northern Ireland, the Isle of Man and the Scottish Islands sit outside the standard service, so please get in touch before ordering and we will arrange it.`,",
    1,
)

# Category metadata and editorial copy preserve fabric-vs-stock distinction.
replace("src/constants/categorySeo.ts", "// src/constants/categorySeo.ts\n", "// src/constants/categorySeo.ts\nimport { PROMISES } from '@/constants/promises'\n\nconst DELIVERY_TIMING = PROMISES.delivery.timingLong\n", 1)
for old, new in [
    ("'Fabric sofas made to order in your choice of 69 colours across chenille, velvet and more. Free UK Mainland delivery in 2-4 working days, paid on arrival.'", "`Fabric sofas made to order in your choice of 69 colours across chenille, velvet and more. Free UK Mainland delivery, paid on arrival. ${DELIVERY_TIMING}`"),
    ("'Leather sofas and 3+2 leather sofa sets that wipe clean in seconds. Free UK Mainland delivery in 2-4 working days, and you pay when it arrives.'", "`Leather sofas and 3+2 leather sofa sets that wipe clean in seconds. Free UK Mainland delivery, and you pay when it arrives. ${DELIVERY_TIMING}`"),
    ("'Electric recliner sofas and power reclining sofa sets, reclining at the touch of a button. Free UK Mainland delivery in 2-4 working days, cash on delivery.'", "`Electric recliner sofas and power reclining sofa sets, reclining at the touch of a button. Free UK Mainland delivery, cash on delivery. ${DELIVERY_TIMING}`"),
    ("'A three seater and a two seater together - the usual answer for a family living room. Free UK Mainland delivery in 2-4 working days, cash on delivery.'", "`A three seater and a two seater together - the usual answer for a family living room. Free UK Mainland delivery, cash on delivery. ${DELIVERY_TIMING}`"),
    ("'Every corner sofa is delivered free to a UK Mainland address in 2 to 4 working days, brought to the ground floor or a ground-floor room of your choice, and paid for in cash or by bank transfer on the doorstep. Nothing upfront. It carries a 1-year guarantee on the frame and springs.'", "`Every corner sofa is delivered free to a UK Mainland address, brought to the ground floor or a ground-floor room of your choice, and paid for in cash or by bank transfer on the doorstep. ${DELIVERY_TIMING} Nothing upfront. It carries a 1-year guarantee on the frame and springs.`"),
    ("'Delivery is free to UK Mainland in 2 to 4 working days and you pay cash or by bank transfer when it arrives. Fabric needs a little care to stay looking new; the [care guide](/care-guide) covers the first thirty seconds of a spill, which is the part that decides the outcome.'", "`Delivery is free to UK Mainland and you pay cash or by bank transfer when it arrives. ${DELIVERY_TIMING} Fabric needs a little care to stay looking new; the [care guide](/care-guide) covers the first thirty seconds of a spill, which is the part that decides the outcome.`"),
    ("'Leather sofas here are stocked in set sizes rather than made to order, so they ship sooner and, being a standard size, they come with the full 14-day right to change your mind. Delivery is free across UK Mainland in 2 to 4 working days, cash or bank transfer on the doorstep, with a 1-year guarantee on the frame and springs. Check the doorway first with the [size guide](/size-guide): a leather three-seater does not give under pressure the way a fabric one does.'", "`Leather sofas here are stocked in set sizes rather than made to order, so they come with the full 14-day right to change your mind. Delivery is free across UK Mainland, cash or bank transfer on the doorstep. ${DELIVERY_TIMING} A 1-year guarantee covers the frame and springs. Check the doorway first with the [size guide](/size-guide): a leather three-seater does not give under pressure the way a fabric one does.`"),
    ("'Free delivery to UK Mainland in 2 to 4 working days, brought to a ground-floor room of your choice, paid in cash or by bank transfer on arrival. A 1-year guarantee covers the frame and springs. Upstairs delivery, assembly and taking your old sofa away are available as paid extras chosen at checkout - see [delivery and returns](/delivery-returns).'", "`Free delivery to UK Mainland, brought to a ground-floor room of your choice, paid in cash or by bank transfer on arrival. ${DELIVERY_TIMING} A 1-year guarantee covers the frame and springs. Upstairs delivery, assembly and taking your old sofa away are available as paid extras chosen at checkout - see [delivery and returns](/delivery-returns).`"),
    ("'Delivered free to UK Mainland in 2 to 4 working days and paid for in cash or by bank transfer when it arrives. The 1-year guarantee covers structural faults in the frame and springs. Measure the doorway first with the [size guide](/size-guide): powered frames carry their mechanism inside the seat and do not pack down as small as you might expect.'", "`Delivered free to UK Mainland and paid for in cash or by bank transfer when it arrives. ${DELIVERY_TIMING} The 1-year guarantee covers structural faults in the frame and springs. Measure the doorway first with the [size guide](/size-guide): powered frames carry their mechanism inside the seat and do not pack down as small as you might expect.`"),
    ("'Fabric sets are made to order in your own size and any of the 69 colours in the [fabric library](/fabrics); leather sets are stocked in set sizes. Either way delivery is free to UK Mainland in 2 to 4 working days, both pieces are brought to a ground-floor room of your choice, and you pay cash or by bank transfer on the doorstep. A 1-year guarantee covers frame and springs on both pieces.'", "`Fabric sets are made to order in your own size and any of the 69 colours in the [fabric library](/fabrics); leather sets are stocked in set sizes. Either way delivery is free to UK Mainland, both pieces are brought to a ground-floor room of your choice, and you pay cash or by bank transfer on the doorstep. ${DELIVERY_TIMING} A 1-year guarantee covers frame and springs on both pieces.`"),
    ("'However you get there: free delivery to any UK Mainland address in 2 to 4 working days, brought to the ground floor or a ground-floor room of your choice, and paid for in cash or by bank transfer when it arrives rather than upfront. A 1-year guarantee covers the frame and springs. You can also see everything in person at the Blackburn [showroom](/showroom), by appointment.'", "`However you get there: free delivery to any UK Mainland address, brought to the ground floor or a ground-floor room of your choice, and paid for in cash or by bank transfer when it arrives rather than upfront. ${DELIVERY_TIMING} A 1-year guarantee covers the frame and springs. You can also see everything in person at the Blackburn [showroom](/showroom), by appointment.`"),
]:
    replace("src/constants/categorySeo.ts", old, new, 1)

replace(
    "src/app/shop/[category]/page.tsx",
    "import { CATEGORY_COPY } from '@/constants/categorySeo'",
    "import { CATEGORY_COPY } from '@/constants/categorySeo'\nimport { PROMISES } from '@/constants/promises'",
    1,
)
replace(
    "src/app/shop/[category]/page.tsx",
    "`Shop our ${name.toLowerCase()} at UK Sofa Shop. Free delivery across UK Mainland in 2-4 working days, and cash on delivery.`",
    "`Shop our ${name.toLowerCase()} at UK Sofa Shop. Free delivery across UK Mainland and cash on delivery. ${PROMISES.delivery.timingLong}`",
    1,
)

# Public answer-engine copy must not repeat the old universal promise.
replace(
    "src/app/llms.txt/route.ts",
    "> and recliners across UK Mainland. Free delivery in 2-4 working days, paid for\n> in cash or by bank transfer on the doorstep rather than upfront.",
    "> and recliners across UK Mainland. Delivery is free; most UK Mainland orders arrive\n> in 2-4 working days, while some Wales and Scotland postcodes take 5-7. Payment\n> is cash or bank transfer on the doorstep rather than upfront.",
    1,
)
replace(
    "src/app/llms.txt/route.ts",
    "- Delivery is free to every UK Mainland address with no minimum order, in 2-4 working days. Northern Ireland, the Isle of Man and the Scottish Islands are arranged individually rather than quoted online.",
    "- Delivery is free to every UK Mainland address with no minimum order. Most UK Mainland orders arrive in 2-4 working days; some Wales and Scotland postcodes take 5-7 working days. Northern Ireland, the Isle of Man and the Scottish Islands are arranged individually rather than quoted online.",
    1,
)

# Long-form delivery articles get the same qualified policy wording.
replace(
    "src/app/journal/articles/delivery-day-preparation.tsx",
    "//   2-4 working days across UK Mainland         /delivery-returns",
    "//   most 2-4; some Wales/Scotland 5-7          /delivery-returns",
    1,
)
replace(
    "src/app/journal/articles/delivery-day-preparation.tsx",
    """        Delivery runs to two to four working days anywhere on UK Mainland, so the day comes round
        quickly — which is the reason to have the rest of this list done before it does.""",
    """        Most UK Mainland orders arrive in two to four working days; some Wales and Scotland
        postcodes take five to seven. Either way the day can come round quickly, which is the reason
        to have the rest of this list done before it does.""",
    1,
)
replace(
    "src/app/journal/articles/cash-on-delivery-explained.tsx",
    """        Delivery runs to two to four working days across the whole of UK Mainland. Northern
        Ireland, the Isle of Man and the Scottish Islands are not refused — we just do not quote
        for them automatically, so get in touch before ordering and we will arrange it.""",
    """        Most UK Mainland orders arrive in two to four working days. Some Wales and Scotland
        postcodes take five to seven working days. Northern Ireland, the Isle of Man and the Scottish
        Islands are not refused — we just do not quote for them automatically, so get in touch before
        ordering and we will arrange it.""",
    1,
)
