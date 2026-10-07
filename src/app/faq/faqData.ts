// src/app/faq/faqData.ts
//
// The questions themselves, kept out of the page so both the server component
// (which emits the FAQPage schema) and the client accordion can read them
// without the client bundle pulling in the page.

import { ASSEMBLY_FEE, SOFA_REMOVAL_PER_SEAT, UPSTAIRS_FIRST_FLOOR } from '@/constants/delivery'
import { CANCELLATION, PROMISES } from '@/constants/promises'
import { SUPPORT_EMAIL } from '@/constants/contact'

export interface Faq { q: string; a: string }
interface FaqGroup { group: string; items: Faq[] }

export const faqGroups: FaqGroup[] = [
  {
    group: 'Delivery',
    items: [
      {
        q: 'How long does delivery take?',
        a: `${PROMISES.delivery.timingLong} Around 90% arrive inside the window for their delivery band, unless you have asked us to hold it back. Northern Ireland, the Isle of Man and the Scottish Islands sit outside the standard service, so please get in touch before ordering and we will arrange it.`,
      },
      {
        q: 'Where do you deliver?',
        a: 'We deliver across UK Mainland, and it’s free — there’s no minimum order value. Our drivers bring your sofa to the ground floor, or to a ground-floor room of your choice.',
      },
      {
        q: 'Do you deliver to Northern Ireland or the Scottish Islands?',
        a: `Yes, we do — we just can’t quote for it automatically on the website. Get in touch before you order, at ${SUPPORT_EMAIL} or on 07476 616022, and we’ll arrange it with you directly.`,
      },
      {
        q: 'Do you deliver upstairs?',
        a: `As standard we deliver to the ground floor, or a ground-floor room of your choice. We can take it upstairs for a fee, starting at £${UPSTAIRS_FIRST_FLOOR}, which you can add at checkout. If you’re not sure how many floors are involved or whether it will fit up your stairwell, please check with us before you buy rather than on the day.`,
      },
      {
        q: 'Do you assemble the sofa?',
        a: `Yes — assembly in the room costs £${ASSEMBLY_FEE}, and you can add it when you check out. Like everything else, you pay for it on delivery rather than upfront.`,
      },
      {
        q: 'Can you take my old sofa away?',
        a: `Yes. Old sofa removal is £${SOFA_REMOVAL_PER_SEAT} per seat — £${SOFA_REMOVAL_PER_SEAT * 2} for a two-seater, £${SOFA_REMOVAL_PER_SEAT * 3} for a three-seater — and you add it at checkout, telling us how many seats we’re collecting. For very large or unusual items the charge may be a little different — if so, we’ll tell you as soon as we’ve received your order, well before delivery day.`,
      },
      {
        q: 'What happens if I miss my delivery?',
        a: 'Once we’ve confirmed a delivery slot with you, a missed delivery means the whole trip has to be made again, so a £50 re-delivery charge applies. If the day stops working for you, just tell us as early as you can and we’ll rearrange it.',
      },
      {
        q: 'Will my sofa fit through my door?',
        a: 'Every product page lists the dimensions, so start by measuring your doorways, hallway and any turns on the way in. Our size guide has a doorway calculator that will narrow the range down for you. If you’re at all unsure, talk to us — our team does this every day and will happily walk you through it.',
      },
    ],
  },
  {
    group: 'Paying',
    items: [
      {
        q: 'How do I pay?',
        a: 'You pay when your sofa arrives, not before. Either hand the driver cash, or make a bank transfer at the door — the driver gives you our account details and waits for the payment to come through. We don’t accept card payments of any kind.',
      },
      {
        q: 'Do I pay anything upfront?',
        a: 'No. Nothing is taken when you place your order. Everything — the sofa, assembly, upstairs delivery, old sofa removal — is paid on the day it arrives, once you’ve seen it and you’re happy with it.',
      },
    ],
  },
  {
    group: 'Your order',
    items: [
      {
        q: 'Can I change or cancel my order?',
        a: `Email us within 2 working days of placing your order, at ${SUPPORT_EMAIL}, with your order number, your name and your full postcode. That gives us time to catch it before the order is prepared for dispatch.`,
      },
      {
        q: 'Can I return a sofa if I change my mind?',
        a: `Yes. You can cancel from the moment you order until 14 days after delivery, as required by the Consumer Contracts Regulations, and you don’t need to give a reason — email, call or write to us and that’s enough. You then have another 14 days to send it back, and we refund within 14 days of it reaching us or of you showing us it’s been sent. For a change-of-mind return you arrange and pay for the return carriage — worth getting a quote first, as sofas are awkward to move. We can reduce the refund to reflect any loss in value from handling beyond what you could have done in a shop. This is separate from faulty goods, which we collect ourselves free of charge. ${CANCELLATION.test}`,
      },
    ],
  },
  {
    group: 'Choosing your sofa',
    items: [
      {
        q: 'Can I choose my own fabric, colour or size?',
        a: 'On our fabric sofas, yes — we make them to order in a colour, material or size of your choosing. Look for the “Made to order” block on the product page and tap “Design yours on WhatsApp”: it opens a message with that sofa’s details already filled in, and you just add what you want changed. We’ll come back to you with the price and how long it will take. Our recliner ranges aren’t made this way, so those come as listed and keep the full 14-day right to change your mind. One thing to know before you commit to a fabric sofa: choosing the cloth is part of ordering one, so it’s built to your specification and is exempt from the 14-day change-of-mind return. Faulty items are covered either way.',
      },
    ],
  },
  {
    group: 'Guarantee and problems',
    items: [
      {
        q: 'What does the 1-year guarantee cover?',
        a: 'Every sofa carries a 1-year guarantee covering structural faults — the wooden frame and the springs. It doesn’t cover general wear and tear, fabric fading, or accidental damage. If you think something structural has gone wrong, contact us with photographs and we’ll look at it.',
      },
      {
        q: 'What if my sofa arrives damaged?',
        a: `Because you pay on delivery, check your sofa properly while the driver is still there and only pay once you’re happy with it. If you do find transit damage afterwards, email ${SUPPORT_EMAIL} with photographs as soon as you reasonably can — the sooner we see it the quicker it’s settled, though your rights under the Consumer Rights Act run far longer than that. If the damage is minor and the sofa is usable, we’ll log an incident report with your photos. If it’s considerable, we’ll offer a replacement. If it can’t be repaired and is deemed faulty, we’ll collect it and issue a full refund.`,
      },
    ],
  },
]

export const allFaqs = faqGroups.flatMap(g => g.items)
