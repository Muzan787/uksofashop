'use client'
// src/app/build/steps/SummaryStep.tsx

import Image from 'next/image'
import { Check, MessageCircle, PhoneCall, ShoppingBag } from 'lucide-react'
import WhatsAppLink from '@/components/UI/WhatsAppLink'
import { blurDataURL } from '@/utils/cloudinary'
import type { BuildSpec } from '@/types/build'
import { describeBuild } from '@/types/build'
import type { Fabric } from '@/components/Product/types'
import type { BuildDesign } from '../catalogue'
import type { Resolved, StepId } from '../state'
import { StepHeading, pounds } from './ui'

interface Props {
  design: BuildDesign
  fabric: Fabric
  resolved: Resolved
  spec: BuildSpec
  onEdit: (step: StepId) => void
  onCheckout: () => void
  onWhatsApp: () => void
  /** True for the two seconds after the sofa went into the cart. */
  added: boolean
}

/**
 * Step seven: everything, on one screen, and the price we can put a number to.
 *
 * THE PRICE IS A GUIDE AND SAYS SO. The frame in any fabric has a website
 * price, and that is the figure. Feet, piping, custom dimensions and design
 * changes are not priced online at all, because they cannot be priced
 * honestly without a person looking at the request - so the panel names what
 * the number covers, names what it does not, and says a call comes next. That
 * call already happens for every made-to-order sofa; this page just tells the
 * customer about it before they get there rather than after.
 *
 * TWO WAYS TO SEND IT. Checkout puts the build in the basket as a normal line
 * and the order lands with the customisation attached. WhatsApp sends the
 * same summary as a message, for the customer who would rather talk first -
 * which, on this shop, is most of them.
 */
export default function SummaryStep({ design, fabric, resolved, spec, onEdit, onCheckout, added, onWhatsApp }: Props) {
  const lines = describeBuild(spec)
  const notes = lines.filter(l => ['Custom dimensions', 'Design changes', 'Other'].includes(l.label))
  const custom = spec.seats === 'Custom'

  const message = [
    `Hi, I've put together a sofa on your website and I'd like a quotation.`,
    '',
    `Design: ${custom ? `${design.family}, made to my size` : design.title}`,
    `Fabric: ${fabric.collectionName} ${fabric.name} (${fabric.code})`,
    ...lines.map(l => `${l.label}: ${l.value}`),
    '',
    `Guide price on the site: ${pounds(design.price)}${custom ? ' (for the ' + design.sizeLabel.toLowerCase() + ')' : ''}`,
  ].join('\n')

  return (
    <div>
      <StepHeading
        eyebrow="Step 7 of 7"
        title="Your sofa"
        lead="Here's everything you chose. Check it over, change anything with the edit links, and send it on when you're happy."
      />

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-[minmax(0,1fr)_360px] lg:items-start">
        {/* ── The build ─────────────────────────────────────────────────── */}
        <section aria-label="What you chose" className="overflow-hidden rounded-md border border-calico-300 bg-calico-50 shadow-e1">
          <div className="relative aspect-[16/10] w-full bg-calico-200">
            {design.image && (
              <Image
                src={design.image}
                alt={design.title}
                fill
                sizes="(max-width: 1024px) 100vw, 700px"
                priority
                placeholder="blur"
                blurDataURL={blurDataURL(design.image)}
                className="object-cover"
              />
            )}
            <span className="absolute bottom-3 left-3 rounded-pill bg-ink-900/80 px-3 py-1.5 font-data text-caption text-calico-50 backdrop-blur-sm">
              {design.photographedIn ? `Shown in ${design.photographedIn.toLowerCase()} · ` : ''}yours in {fabric.collectionName.toLowerCase()} {fabric.name.toLowerCase()}
            </span>
          </div>

          <dl className="m-0 divide-y divide-calico-300">
            <Row label="Design" step="design" onEdit={onEdit}>
              <span className="min-w-0">
                <span className="block text-body-sm font-semibold text-ink-900">
                  {custom ? `${design.family} — made to your size` : design.title}
                </span>
                {design.dimensions && !custom && (
                  <span className="mt-0.5 block whitespace-pre-line font-data text-caption tabular-nums text-ink-500">
                    {design.dimensions}
                  </span>
                )}
              </span>
            </Row>

            <Row label="Seats" step="seats" onEdit={onEdit}>
              <span className="min-w-0">
                <span className="block text-body-sm font-semibold text-ink-900">
                  {custom ? 'Custom size' : spec.seats}
                  {spec.back ? ` · ${spec.back === 'High Back' ? 'High back' : 'Scatter back'}` : ''}
                </span>
                {custom && spec.custom_seats && (
                  <span className="mt-0.5 block text-caption leading-snug text-ink-700">“{spec.custom_seats}”</span>
                )}
              </span>
            </Row>

            <Row label="Fabric" step="fabric" onEdit={onEdit}>
              <Swatch image={fabric.image} hex={fabric.hex} />
              <span className="min-w-0">
                <span className="block text-body-sm font-semibold text-ink-900">
                  {fabric.collectionName} {fabric.name}
                </span>
                <span className="mt-0.5 block font-data text-caption uppercase tracking-widest text-ink-500">
                  {fabric.code}
                </span>
              </span>
            </Row>

            <Row label="Feet" step="feet" onEdit={onEdit}>
              {resolved.feet ? (
                <>
                  <Swatch image={resolved.feet.image} hex="#FFFFFF" contain />
                  <span className="min-w-0">
                    <span className="block text-body-sm font-semibold text-ink-900">
                      {resolved.feet.name}
                      {resolved.feet.finish ? ` — ${resolved.feet.finish}` : ''}
                    </span>
                    <span className="mt-0.5 block font-data text-caption uppercase tracking-widest text-ink-500">
                      {resolved.feet.code}
                    </span>
                  </span>
                </>
              ) : (
                <span className="block text-body-sm text-ink-700">
                  As pictured{design.feetAsPictured ? ` — ${design.feetAsPictured.toLowerCase()}` : ''}
                </span>
              )}
            </Row>

            <Row label="Piping" step="piping" onEdit={onEdit}>
              {resolved.pipingFabric ? (
                <>
                  <Swatch image={resolved.pipingFabric.image} hex={resolved.pipingFabric.hex} />
                  <span className="min-w-0">
                    <span className="block text-body-sm font-semibold text-ink-900">
                      {resolved.pipingFabric.collectionName} {resolved.pipingFabric.name}
                    </span>
                    <span className="mt-0.5 block font-data text-caption uppercase tracking-widest text-ink-500">
                      {resolved.pipingFabric.code}
                    </span>
                  </span>
                </>
              ) : (
                <span className="block text-body-sm text-ink-700">Plain — same fabric as the sofa</span>
              )}
            </Row>

            <Row label="Extras" step="notes" onEdit={onEdit}>
              {notes.length > 0 ? (
                <ul className="m-0 flex list-none flex-col gap-2 p-0">
                  {notes.map(n => (
                    <li key={n.label} className="text-body-sm leading-relaxed text-ink-700">
                      <span className="font-semibold text-ink-900">{n.label}: </span>
                      {n.value}
                    </li>
                  ))}
                </ul>
              ) : (
                <span className="block text-body-sm text-ink-700">Nothing extra</span>
              )}
            </Row>
          </dl>
        </section>

        {/* ── The price, and what happens next ──────────────────────────── */}
        <aside
          data-ground="dark"
          aria-label="Price and next steps"
          className="grad-ink rounded-md bg-ink-900 p-5 text-calico-50 shadow-e2 lg:sticky lg:top-20"
        >
          <p className="eyebrow m-0 text-ember-300">{custom ? 'Guide price, from' : 'Guide price'}</p>
          <p className="tnum m-0 mt-2 font-display text-[2.5rem] font-semibold leading-none">
            {pounds(design.price)}
          </p>
          <p className="m-0 mt-2 text-body-sm leading-relaxed text-calico-300">
            {custom
              ? `What the ${design.family} costs as a ${design.sizeLabel.toLowerCase()}, in any fabric. Your size is quoted on the phone.`
              : `The ${design.title} in any of our fabrics, delivered to the UK mainland.`}
          </p>

          <ul className="m-0 mt-5 flex list-none flex-col gap-2.5 p-0">
            {[
              { icon: PhoneCall, text: 'One of us rings you to go through every detail — feet, piping and anything custom are priced on that call.' },
              { icon: Check, text: 'You get a final quotation before a single cut is made. Nothing to pay until it arrives.' },
            ].map(({ icon: Icon, text }) => (
              <li key={text} className="flex items-start gap-3 text-body-sm leading-relaxed text-calico-300">
                <span aria-hidden="true" className="mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-pill bg-ember-500/20">
                  <Icon className="h-3.5 w-3.5 text-ember-300" strokeWidth={2.25} />
                </span>
                {text}
              </li>
            ))}
          </ul>

          <div className="mt-6 flex flex-col gap-2.5">
            <button
              type="button"
              onClick={onCheckout}
              disabled={added}
              aria-live="polite"
              className={`flex h-14 w-full cursor-pointer items-center justify-center gap-2.5 rounded-pill border-0 font-data text-eyebrow font-bold uppercase tracking-[0.1em] transition-[background-color,color] duration-base ease-out-expo ${
                added ? 'bg-sage-700 text-calico-50' : 'hover-btn btn-ember sheen shadow-ember bg-ember-500 text-ink-900'
              }`}
            >
              {added ? (
                <>
                  <Check aria-hidden="true" className="h-4 w-4" strokeWidth={3} />
                  In your cart
                </>
              ) : (
                <>
                  <ShoppingBag aria-hidden="true" className="h-4 w-4" />
                  Continue to checkout
                </>
              )}
            </button>

            <WhatsAppLink
              message={message}
              pageContext="build_summary"
              productId={design.productId}
              variantId={design.variantId}
              productName={design.title}
              onBeforeOpen={onWhatsApp}
              className="hover-btn btn-whatsapp shadow-whatsapp flex h-14 w-full items-center justify-center gap-2.5 rounded-pill bg-whatsapp font-data text-eyebrow font-bold uppercase tracking-[0.1em] text-ink-900 no-underline"
            >
              <MessageCircle aria-hidden="true" className="h-4 w-4" />
              Send it on WhatsApp
            </WhatsAppLink>
          </div>

          <p className="m-0 mt-4 text-caption leading-relaxed text-calico-300/80">
            Made to your specification, so the 14-day change-of-mind right doesn&apos;t apply once
            it&apos;s in production — faults and damage are covered exactly as normal.
          </p>
        </aside>
      </div>
    </div>
  )
}

function Row({ label, step, onEdit, children }: {
  label: string
  step: StepId
  onEdit: (step: StepId) => void
  children: React.ReactNode
}) {
  return (
    <div className="grid grid-cols-[72px_minmax(0,1fr)_auto] items-start gap-3 px-4 py-3.5 sm:grid-cols-[96px_minmax(0,1fr)_auto] sm:px-5">
      <dt className="eyebrow pt-1 text-ink-500">{label}</dt>
      <dd className="m-0 flex min-w-0 items-center gap-3">{children}</dd>
      <dd className="m-0">
        <button
          type="button"
          onClick={() => onEdit(step)}
          aria-label={`Change ${label.toLowerCase()}`}
          className="hover-link -mr-1 inline-flex min-h-11 cursor-pointer items-center border-0 bg-transparent px-1 text-caption font-semibold text-ember-700"
        >
          Edit
        </button>
      </dd>
    </div>
  )
}

function Swatch({ image, hex, contain }: { image: string | null; hex: string | null; contain?: boolean }) {
  return (
    <span
      aria-hidden="true"
      className="relative block h-11 w-11 shrink-0 overflow-hidden rounded-sm bg-calico-200 shadow-[inset_0_0_0_1px_rgba(25,28,27,0.18)]"
      style={hex ? { background: hex } : undefined}
    >
      {image && (
        <Image
          src={image}
          alt=""
          fill
          sizes="44px"
          placeholder="blur"
          blurDataURL={blurDataURL(image)}
          className={contain ? 'object-contain p-1' : 'object-cover'}
        />
      )}
    </span>
  )
}
