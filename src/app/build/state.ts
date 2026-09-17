// src/app/build/state.ts
//
// The builder's memory: what has been chosen so far, how it is kept between
// visits, and how it turns into a basket line at the end.
//
// The draft holds IDS, not objects. A saved draft is read back against the
// live catalogue every time the page opens, so a fabric withdrawn last week or
// a design whose price changed overnight is picked up rather than replayed
// from a stale copy. What the customer sees is always today's catalogue with
// their choices laid over it.

import type { Fabric, FabricCollection } from '@/components/Product/types'
import { FEET, findFeet } from '@/constants/feet'
import type { BuildBack, BuildSpec } from '@/types/build'
import type { BuildDesign, BuildSize } from './catalogue'

// ─── Steps ───────────────────────────────────────────────────────────────────

export type StepId = 'seats' | 'design' | 'fabric' | 'feet' | 'piping' | 'notes' | 'summary'

export interface StepMeta {
  id: StepId
  /** In the rail. */
  label: string
  /** Where the step's answer is optional, the bar says "Skip" instead of refusing. */
  optional: boolean
}

export const STEPS: StepMeta[] = [
  { id: 'seats', label: 'Seats', optional: false },
  { id: 'design', label: 'Design', optional: false },
  { id: 'fabric', label: 'Fabric', optional: false },
  { id: 'feet', label: 'Feet', optional: true },
  { id: 'piping', label: 'Piping', optional: true },
  { id: 'notes', label: 'Extras', optional: true },
  { id: 'summary', label: 'Summary', optional: false },
]

export function stepIndex(id: StepId): number {
  return STEPS.findIndex(s => s.id === id)
}

// ─── The draft ───────────────────────────────────────────────────────────────

/** The size key step one uses for "something else". */
export const CUSTOM_SIZE = 'custom'

export type BackPreference = BuildBack | 'either'

export interface FeetChoice {
  code: string
  finish: string
}

export interface Draft {
  version: 1
  /** For the basket key. Minted once per build. */
  key: string
  step: StepId
  /** The furthest step reached, so the rail can jump forward as well as back. */
  reached: number

  sizeKey: string | null
  customSeats: string
  back: BackPreference
  productId: string | null
  fabricId: string | null
  /** 'pictured' is an answer; null is "not asked yet". */
  feet: FeetChoice | 'pictured' | null
  /** 'none' is an answer; null is "not asked yet". */
  piping: { fabricId: string | null } | 'none' | null
  notes: {
    dimensions: { on: boolean; text: string }
    design: { on: boolean; text: string }
    other: { on: boolean; text: string }
  }
}

const STORAGE_KEY = 'uksofashop_build_v1'

function mintKey(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return crypto.randomUUID()
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`
}

export function emptyDraft(): Draft {
  return {
    version: 1,
    key: mintKey(),
    step: 'seats',
    reached: 0,
    sizeKey: null,
    customSeats: '',
    back: 'either',
    productId: null,
    fabricId: null,
    feet: null,
    piping: null,
    notes: {
      dimensions: { on: false, text: '' },
      design: { on: false, text: '' },
      other: { on: false, text: '' },
    },
  }
}

/** Reads the saved draft. Anything unreadable, or from another version, is a fresh start. */
export function loadDraft(): Draft | null {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as Partial<Draft>
    if (parsed.version !== 1 || typeof parsed.key !== 'string') return null
    const fresh = emptyDraft()
    return {
      ...fresh,
      ...parsed,
      notes: { ...fresh.notes, ...(parsed.notes ?? {}) },
      step: STEPS.some(s => s.id === parsed.step) ? (parsed.step as StepId) : 'seats',
    }
  } catch {
    return null
  }
}

export function saveDraft(draft: Draft): void {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(draft))
  } catch {
    // Private mode or a full quota. The builder still works for this visit.
  }
}

export function clearDraft(): void {
  try {
    window.localStorage.removeItem(STORAGE_KEY)
  } catch {
    // Nothing to do.
  }
}

// ─── Reading the draft against the catalogue ─────────────────────────────────

/** One card in the design carousel: a family, in the backs it comes in at this size. */
export interface DesignCard {
  family: string
  familySlug: string
  /** Every product this family offers at the chosen size, one per back style. */
  options: BuildDesign[]
  /** The one the card is currently showing. */
  current: BuildDesign
}

/** Flat lookup. The same as utils/fabrics' findFabric, which cannot be imported here: that module also builds the server Supabase client. */
function findFabric(library: FabricCollection[], id: string | null | undefined): Fabric | null {
  if (!id) return null
  for (const c of library) {
    const hit = c.fabrics.find(f => f.id === id)
    if (hit) return hit
  }
  return null
}

function matchesBack(design: BuildDesign, pref: BackPreference): boolean {
  return pref === 'either' || design.back === pref
}

/**
 * The designs step two lays out, given the size and back preference from
 * step one. One card per family; the back toggle inside the card switches
 * between that family's products at this size.
 *
 * `hidden` counts the families excluded by the back preference alone, so the
 * step can say "2 more designs come with a fixed back" rather than silently
 * showing fewer sofas than the size tile promised.
 */
export function designCards(
  designs: BuildDesign[],
  draft: Pick<Draft, 'sizeKey' | 'back' | 'productId'>,
): { cards: DesignCard[]; hidden: number } {
  const pool = draft.sizeKey === CUSTOM_SIZE
    ? designs
    : designs.filter(d => d.sizeKey === draft.sizeKey)

  const families = new Map<string, BuildDesign[]>()
  for (const d of pool) {
    const list = families.get(d.familySlug) ?? []
    list.push(d)
    families.set(d.familySlug, list)
  }

  const cards: DesignCard[] = []
  let hidden = 0

  for (const [, all] of families) {
    // For a custom size every family is one card, shown as its 3 seater where
    // it has one - the photograph a customer is most likely to recognise.
    let options = all
    if (draft.sizeKey === CUSTOM_SIZE) {
      const preferredSize =
        all.find(d => d.sizeKey === '3-seater') ??
        all.find(d => d.sizeKey === '3-2-seater') ??
        all[0]
      options = all.filter(d => d.sizeKey === preferredSize.sizeKey)
    }

    const matching = options.filter(d => matchesBack(d, draft.back))
    if (matching.length === 0) {
      hidden += 1
      continue
    }

    // A previously chosen product wins; otherwise the preferred back, else the first.
    const chosen = matching.find(d => d.productId === draft.productId)
    const current =
      chosen ??
      matching.find(d => d.back === draft.back) ??
      matching[0]

    cards.push({ family: current.family, familySlug: current.familySlug, options: matching, current })
  }

  return { cards, hidden }
}

export interface Resolved {
  size: BuildSize | null
  design: BuildDesign | null
  fabric: Fabric | null
  feet: { code: string; name: string; finish: string | null; image: string | null } | null
  pipingFabric: Fabric | null
}

/** The draft's ids turned back into the things they point at. */
export function resolveDraft(
  draft: Draft,
  designs: BuildDesign[],
  sizes: BuildSize[],
  library: FabricCollection[],
): Resolved {
  const design = designs.find(d => d.productId === draft.productId) ?? null
  const size = draft.sizeKey && draft.sizeKey !== CUSTOM_SIZE
    ? sizes.find(s => s.key === draft.sizeKey) ?? null
    : null

  let feet: Resolved['feet'] = null
  const choice = draft.feet
  if (choice && choice !== 'pictured') {
    const style = findFeet(choice.code)
    const finish = style?.finishes.find(f => f.key === choice.finish) ?? style?.finishes[0]
    if (style && finish) {
      feet = {
        code: style.code,
        name: style.name,
        finish: style.finishes.length > 1 ? finish.name : null,
        image: finish.image,
      }
    }
  }

  return {
    size,
    design,
    fabric: findFabric(library, draft.fabricId),
    feet,
    pipingFabric:
      draft.piping && draft.piping !== 'none' ? findFabric(library, draft.piping.fabricId) : null,
  }
}

/** Whether the customer can leave this step. Optional steps can always be left. */
export function stepComplete(step: StepId, draft: Draft, resolved: Resolved): boolean {
  switch (step) {
    case 'seats':
      return draft.sizeKey === CUSTOM_SIZE
        ? draft.customSeats.trim().length > 0
        : Boolean(draft.sizeKey)
    case 'design':
      return Boolean(resolved.design)
    case 'fabric':
      return Boolean(resolved.fabric)
    case 'piping':
      // "Yes" without a colour is not an answer yet.
      return !(draft.piping && draft.piping !== 'none' && !resolved.pipingFabric)
    default:
      return true
  }
}

/** The whole build, as the basket wants it. Null until the required steps are done. */
export function toBuildSpec(draft: Draft, resolved: Resolved): BuildSpec | null {
  if (!resolved.design || !resolved.fabric) return null

  const size = draft.sizeKey === CUSTOM_SIZE
    ? 'Custom'
    : (resolved.size?.label ?? resolved.design.sizeLabel)

  return {
    key: draft.key,
    seats: size,
    custom_seats: draft.sizeKey === CUSTOM_SIZE ? draft.customSeats.trim() || null : null,
    back: resolved.design.back,
    design: resolved.design.family,
    feet: resolved.feet,
    piping: resolved.pipingFabric
      ? {
          fabric_id: resolved.pipingFabric.id,
          code: resolved.pipingFabric.code,
          name: resolved.pipingFabric.name,
          collection: resolved.pipingFabric.collectionName,
          image: resolved.pipingFabric.image,
        }
      : null,
    notes: {
      dimensions: draft.notes.dimensions.on ? draft.notes.dimensions.text.trim() || null : null,
      design: draft.notes.design.on ? draft.notes.design.text.trim() || null : null,
      other: draft.notes.other.on ? draft.notes.other.text.trim() || null : null,
    },
  }
}

/** Every feet style, for the step that lists them. Re-exported so the step has one import. */
export const FEET_STYLES = FEET
