'use client';
// src/components/Home/CraftStory.tsx

import { useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { ArrowRight, ChevronDown } from 'lucide-react';
import { SplitText } from '@/components/Motion';
import { blurDataURL } from '@/utils/cloudinary';

/**
 * Three panels. Every claim here is one the site can already stand behind:
 * free delivery to UK mainland, made-to-order fabric sofas, cash on delivery,
 * 2–4 working days. No founding date, no heritage, no workshop we do not have.
 */
const PANELS = [
  {
    step: 'One',
    heading: 'We pick every range\nourselves.',
    body:
      'There is no algorithm choosing what appears on this site. Each range is chosen by hand, and anything that would not go in our own living room does not go on the shop floor either.',
    image: 'https://res.cloudinary.com/dmlna04yk/image/upload/v1782255171/Home-Page-Furniture-Background-Image-2_cgmd50.jpg',
    alt: 'Upholstery detail on a fabric sofa',
  },
  {
    step: 'Two',
    heading: 'Fabric sofas are built\nto your measurements.',
    body:
      'Colour, material, size and layout are yours to choose. Nothing is cut until the specification is agreed with you, which is why a made-to-order sofa takes longer than one off a warehouse shelf — and why it fits the room it was meant for.',
    image: 'https://res.cloudinary.com/dmlna04yk/image/upload/v1782255172/Home-Page-Furniture-Background-Image-3_dxl0qo.avif',
    alt: 'A sofa being assembled',
  },
  {
    step: 'Three',
    heading: 'Nothing is paid for until\nit is in the room.',
    body:
      'Cash on delivery means what it says. Our team carries it in, you look at it, and only then does any money change hands — by cash or bank transfer, on the doorstep. Delivery across UK mainland is free and usually takes two to four working days.',
    image: 'https://res.cloudinary.com/dmlna04yk/image/upload/v1782255178/Home-Page-Furniture-Background-Image-4_j5camh.jpg',
    alt: 'A sofa delivered into a living room',
  },
] as const;

/**
 * The editorial centrepiece, and the one place Indigo 700 leads.
 *
 * On desktop the photograph pins while three panels of text scroll past it,
 * cross-fading as each one comes level. The pin is plain CSS `position: sticky`
 * — no scroll maths, no JS layout — and the only thing JavaScript decides is
 * which photograph is showing.
 *
 * On mobile the pin is released entirely and it becomes three stacked
 * image-and-text pairs. A pinned scroll section on a phone means a long stretch
 * where the page appears not to move, which reads as a broken page.
 */
export default function CraftStory() {
  const [active, setActive] = useState(0);
  const panels = useRef<(HTMLDivElement | null)[]>([]);

  /** Which panel is open below lg. One at a time, and closed to begin with. */
  const [open, setOpen] = useState<number | null>(null);
  /** Whether the first row has been asked to demonstrate itself. */
  const [hint, setHint] = useState(false);
  const list = useRef<HTMLOListElement>(null);

  const toggle = (i: number) => {
    setOpen((current) => (current === i ? null : i));
    // The peek animation overrides the panel's own grid-template-rows for as
    // long as it runs, so a tap landing mid-hint would appear to do nothing.
    // Any interaction retires the hint immediately — it has done its job the
    // moment somebody reaches for the control.
    setHint(false);
  };

  /**
   * The hint.
   *
   * Closed by default, three rows of this section look like three headings
   * rather than three things you can open — and the one gesture that makes it
   * work is invisible. So the first row opens a little way and closes again as
   * the section arrives, which shows the movement rather than describing it.
   *
   * Three conditions, and each one fails safe. Mobile only, because desktop is
   * not a disclosure at all. Once, because a control that keeps demonstrating
   * itself after you have seen it is an animation nobody asked for. And never
   * under reduced motion, where the rows are simply rows you can tap.
   *
   * The observer watches the LIST, which nothing clips. Watching the panel
   * would have been the obvious choice and it could not work: a collapsed
   * panel is zero pixels tall inside its own overflow, and a target with no
   * area never reports an intersection.
   */
  useEffect(() => {
    if (!window.matchMedia('(max-width: 1023.98px)').matches) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    const node = list.current;
    if (!node) return;

    const io = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return;
        setHint(true);
        io.disconnect();
      },
      { threshold: 0.25 },
    );
    io.observe(node);
    return () => io.disconnect();
  }, []);

  useEffect(() => {
    // Only the desktop layout pins, so only it needs to track a panel.
    const mq = window.matchMedia('(min-width: 1024px)');
    if (!mq.matches) return;

    const io = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          const i = Number((entry.target as HTMLElement).dataset.panel);
          if (!Number.isNaN(i)) setActive(i);
        }
      },
      // A band across the middle of the viewport: a panel becomes active as it
      // comes level with the pinned photograph, not as it enters the screen.
      { rootMargin: '-45% 0px -45% 0px', threshold: 0 },
    );

    panels.current.forEach((node) => node && io.observe(node));
    return () => io.disconnect();
  }, []);

  return (
    <section
      data-ground="dark"
      className="grad-indigo grain relative isolate overflow-hidden bg-indigo-700 text-calico-50"
    >
      {/* The one cool section on the page, so it gets the cool wash and none of
          the ember. The warm blobs belong to the ink sections; running them
          here would take the indigo out of the only place it leads. */}
      <div aria-hidden="true" className="aurora">
        <span className="aurora__cool" />
      </div>

      <div className="relative mx-auto max-w-shell px-4 sm:px-6">
        <div className="border-b border-calico-50/15 py-9 lg:py-16">
          <p className="eyebrow m-0 mb-4 flex items-center gap-3 text-ember-300">
            <span aria-hidden="true" className="block h-px w-8 bg-ember-500" />
            How this works
          </p>
          <SplitText
            as="h2"
            by="word"
            text="Three things worth knowing before you buy."
            emphasise="knowing"
            emphasisClassName="text-shimmer font-light italic"
            amount={0.3}
            className="m-0 max-w-[18ch] font-display text-h1 font-semibold leading-tight"
          />
        </div>

        <div className="grid grid-cols-1 gap-8 lg:grid-cols-2 lg:gap-16">
          {/* ── The pinned photograph. Desktop only. ────────────────────── */}
          <div className="hidden lg:block">
            <div className="sticky top-24 aspect-[4/5] overflow-hidden rounded-md bg-indigo-700">
              {PANELS.map((panel, i) => (
                <Image
                  key={panel.image}
                  src={panel.image}
                  alt={panel.alt}
                  fill
                  sizes="(max-width: 1024px) 100vw, 45vw"
                  placeholder="blur"
                  blurDataURL={blurDataURL(panel.image)}
                  className={`object-cover transition-opacity duration-settle ease-out-expo ${
                    active === i ? 'opacity-100' : 'opacity-0'
                  }`}
                />
              ))}

              <span
                aria-hidden="true"
                className="absolute inset-x-0 bottom-0 h-1/4 bg-gradient-to-t from-indigo-700/80 to-transparent"
              />

              {/* Which of the three you are looking at. */}
              <div className="absolute bottom-5 left-5 flex items-center gap-2">
                {PANELS.map((panel, i) => (
                  <span
                    key={panel.step}
                    aria-hidden="true"
                    className={`block h-1 rounded-pill transition-all duration-base ease-out-expo ${
                      active === i ? 'w-8 bg-ember-500' : 'w-4 bg-calico-50/35'
                    }`}
                  />
                ))}
              </div>
            </div>
          </div>

          {/* ── The panels ───────────────────────────────────────────────
              One markup tree, two behaviours.

              On desktop nothing here is interactive: the trigger is
              display:none, the body is always open, and the section reads as
              the three-panel editorial it was written as.

              Below lg the same three panels become a disclosure. Closed, the
              section is about a third of the height it was — three tappable
              rows instead of three full screens of prose with a photograph on
              top of each. The images alone were most of that.

              The collapse is entirely in the `lg:` variants below, so the
              desktop layout cannot drift when the mobile one is adjusted. */}
          <ol ref={list} className="m-0 list-none p-0">
            {PANELS.map((panel, i) => {
              const isOpen = open === i;
              // Only the first row demonstrates the gesture. Three panels
              // peeking at once reads as the page misbehaving rather than as
              // an invitation, and one is enough to teach the control.
              const hinting = hint && i === 0 && open === null;

              return (
                <li key={panel.step} className="border-t border-calico-50/15 lg:border-0">
                  <div
                    ref={(node) => { panels.current[i] = node; }}
                    data-panel={i}
                    className="lg:flex lg:min-h-[85vh] lg:flex-col lg:justify-center"
                  >
                    {/* ── The trigger. Mobile only. ────────────────────── */}
                    <h3 className="m-0 lg:hidden">
                      <button
                        type="button"
                        id={`craft-${i}-trigger`}
                        aria-expanded={isOpen}
                        aria-controls={`craft-${i}-panel`}
                        onClick={() => toggle(i)}
                        className="flex w-full items-center justify-between gap-4 py-5 text-left"
                      >
                        <span className="min-w-0">
                          <span className="eyebrow mb-2 flex items-center gap-2.5 text-ember-300">
                            <span aria-hidden="true" className="block h-px w-5 bg-ember-500" />
                            Step {panel.step}
                          </span>
                          <span className="block font-display text-h3 font-semibold leading-snug text-calico-50">
                            {panel.heading.replace('\n', ' ')}
                          </span>
                        </span>

                        <span
                          aria-hidden="true"
                          className="glass-dark-panel grid h-10 w-10 shrink-0 place-items-center rounded-pill"
                        >
                          <ChevronDown
                            className={`h-4 w-4 text-ember-300 transition-transform duration-base ease-out-expo ${
                              isOpen ? 'rotate-180' : ''
                            } ${hinting ? 'craft-hint-chevron' : ''}`}
                          />
                        </span>
                      </button>
                    </h3>

                    {/* ── The editorial header. Desktop only. ──────────── */}
                    <div className="hidden lg:block">
                      <p className="eyebrow mb-3 flex items-center gap-3 text-ember-300">
                        <span aria-hidden="true" className="block h-px w-6 bg-ember-500" />
                        Step {panel.step}
                      </p>

                      <SplitText
                        as="h3"
                        by="line"
                        text={panel.heading}
                        amount={0.5}
                        className="m-0 font-display text-h2 font-semibold leading-tight text-calico-50"
                      />
                    </div>

                    {/* ── The body ─────────────────────────────────────────
                        The collapse lives in `.craft-panel`, which is declared
                        entirely inside a `width < 64rem` block — so above that
                        breakpoint there is no collapse rule to override and the
                        panel is an ordinary block of prose.

                        It was written first as Tailwind state classes with an
                        `lg:grid-rows-[1fr]` override, and the override lost:
                        two arbitrary values of the same property, where which
                        one wins comes down to the order Tailwind happens to
                        emit them. The desktop body copy was clipped to zero
                        height. A media query is not a tie to be broken.

                        data-accordion-panel is what the <noscript> rule in
                        layout.tsx keys off to force every panel open when
                        scripting never arrives — the content is never stuck
                        behind a control that cannot work. */}
                    <div
                      id={`craft-${i}-panel`}
                      data-accordion-panel=""
                      data-open={isOpen ? 'true' : 'false'}
                      className={`craft-panel ${hinting ? 'craft-hint' : ''}`}
                    >
                      <div>
                        <div className="pb-6 lg:pb-0">
                          {/* The photograph, inline, on mobile only — where the
                              pinned column is not rendered at all. */}
                          <div className="relative mb-5 aspect-[16/10] overflow-hidden rounded-md bg-indigo-700 lg:hidden">
                            <Image
                              src={panel.image}
                              alt={panel.alt}
                              fill
                              sizes="100vw"
                              placeholder="blur"
                              blurDataURL={blurDataURL(panel.image)}
                              className="object-cover"
                            />
                          </div>

                          <p className="m-0 max-w-[46ch] text-body text-calico-50/75 lg:mt-5">
                            {panel.body}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </li>
              );
            })}
          </ol>
        </div>

        <div className="border-t border-calico-50/15 py-9 lg:py-12">
          <Link
            href="/about"
            className="hover-link inline-flex items-center gap-2 text-body text-calico-50 no-underline"
          >
            More about how we work
            <ArrowRight aria-hidden="true" className="h-4 w-4 text-ember-300" />
          </Link>
        </div>
      </div>
    </section>
  );
}
