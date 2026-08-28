'use client';
// src/components/Product/DimensionsDialog.tsx

import { isDrawable, parseDimensions, type ParsedDimensions } from './dimensions';
import Modal from '@/components/UI/Modal';

/**
 * What size is it, drawn rather than described.
 *
 * This was the raw contents of the admin field rendered as a paragraph —
 * "L:198cm H:97cm D:99cm" — which is a note the shop wrote to itself, not an
 * answer to "will it fit through my door and along that wall". Two elevations
 * and a labelled table say the same thing in the form the question is asked
 * in. The original string is still printed at the foot, because it is the
 * record and the parser is only as good as what was typed.
 *
 * Two views rather than one perspective drawing: width and height belong to
 * the front, depth and height to the side, and a single isometric sofa would
 * have to distort all three to show them at once. This is how a furniture
 * spec sheet is drawn for the same reason.
 */
export default function DimensionsDialog({ dimensions, onClose }: {
  dimensions: string;
  onClose: () => void;
}) {
  const d = parseDimensions(dimensions);

  return (
    <Modal title="Dimensions" onClose={onClose} size="md">
          {isDrawable(d) ? (
            <>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <Figure caption="From the front">
                  <FrontElevation d={d} />
                </Figure>
                <Figure caption="From the side">
                  <SideElevation d={d} />
                </Figure>
              </div>

              <dl className="m-0 mt-5">
                <Row label="Width" value={d.width} />
                {d.secondSide !== undefined && <Row label="Return (corner)" value={d.secondSide} />}
                <Row label="Depth" value={d.depth} />
                <Row label="Height" value={d.height} />
                <Row label="Seat height" value={d.seatHeight} />
              </dl>
            </>
          ) : (
            <p className="m-0 whitespace-pre-wrap text-body-sm leading-relaxed text-ink-700">
              {d.raw || 'No dimensions have been recorded for this product yet.'}
            </p>
          )}

          <p className="m-0 mt-5 border-t border-calico-300 pt-4 text-caption leading-relaxed text-ink-500">
            Measurements are approximate and given in centimetres. As recorded:{' '}
            <span className="font-data text-ink-700">{d.raw}</span>
          </p>
    </Modal>
  );
}
function Figure({ caption, children }: { caption: string; children: React.ReactNode }) {
  return (
    <figure className="m-0 rounded-md border border-calico-300 bg-calico-100 p-3">
      {children}
      <figcaption className="mt-2 text-center text-caption text-ink-500">{caption}</figcaption>
    </figure>
  );
}

function Row({ label, value }: { label: string; value?: number }) {
  if (value === undefined) return null;
  return (
    <div className="flex items-baseline justify-between gap-6 border-b border-calico-100 py-2.5 last:border-b-0">
      <dt className="text-body-sm text-ink-500">{label}</dt>
      <dd className="m-0 font-data text-body-sm tabular-nums text-ink-900">{value} cm</dd>
    </div>
  );
}

// ─── The drawings ────────────────────────────────────────────────────────────
//
// Schematic, not to scale — a sofa 240cm wide and 90cm tall drawn to scale in a
// 520px dialog would be a letterbox. The numbers carry the proportions; the
// drawing only has to say which measurement is which.

const LINE = 'stroke-ink-500';
const BODY = 'fill-calico-200 stroke-ink-900';

/** A horizontal measurement with end ticks and a label above the line. */
function DimX({ x1, x2, y, label }: { x1: number; x2: number; y: number; label?: number }) {
  if (label === undefined) return null;
  return (
    <g className={LINE} strokeWidth={1}>
      <line x1={x1} y1={y - 5} x2={x1} y2={y + 5} />
      <line x1={x2} y1={y - 5} x2={x2} y2={y + 5} />
      <line x1={x1} y1={y} x2={x2} y2={y} />
      <text x={(x1 + x2) / 2} y={y - 9} textAnchor="middle" className="fill-ink-700 stroke-none font-data text-[11px]">
        {label}
      </text>
    </g>
  );
}

/** A vertical measurement, label rotated to sit along the line. */
function DimY({ y1, y2, x, label }: { y1: number; y2: number; x: number; label?: number }) {
  if (label === undefined) return null;
  return (
    <g className={LINE} strokeWidth={1}>
      <line x1={x - 5} y1={y1} x2={x + 5} y2={y1} />
      <line x1={x - 5} y1={y2} x2={x + 5} y2={y2} />
      <line x1={x} y1={y1} x2={x} y2={y2} />
      <text
        x={x - 8}
        y={(y1 + y2) / 2}
        textAnchor="middle"
        transform={`rotate(-90 ${x - 8} ${(y1 + y2) / 2})`}
        className="fill-ink-700 stroke-none font-data text-[11px]"
      >
        {label}
      </text>
    </g>
  );
}

function FrontElevation({ d }: { d: ParsedDimensions }) {
  // Floor at y=132, sofa top at y=28, seat top at y=96.
  return (
    <svg viewBox="0 0 240 160" role="img" aria-label={frontLabel(d)} className="w-full">
      <g className={BODY} strokeWidth={1.5} strokeLinejoin="round">
        <rect x={44} y={28} width={152} height={54} rx={6} />
        <rect x={30} y={62} width={26} height={62} rx={7} />
        <rect x={184} y={62} width={26} height={62} rx={7} />
        <rect x={56} y={82} width={128} height={22} rx={4} />
      </g>
      <g className="fill-ink-900">
        <rect x={40} y={124} width={7} height={8} rx={1} />
        <rect x={193} y={124} width={7} height={8} rx={1} />
      </g>
      <line x1={16} y1={132} x2={224} y2={132} className="stroke-calico-300" strokeWidth={1.5} />

      <DimX x1={30} x2={210} y={150} label={d.width} />
      <DimY y1={28} y2={132} x={22} label={d.height} />
      {d.seatHeight !== undefined && <DimY y1={104} y2={132} x={228} label={d.seatHeight} />}
    </svg>
  );
}

function SideElevation({ d }: { d: ParsedDimensions }) {
  return (
    <svg viewBox="0 0 240 160" role="img" aria-label={sideLabel(d)} className="w-full">
      <g className={BODY} strokeWidth={1.5} strokeLinejoin="round">
        <rect x={72} y={28} width={26} height={96} rx={7} />
        <rect x={98} y={82} width={70} height={22} rx={4} />
        <rect x={98} y={104} width={70} height={20} rx={4} />
      </g>
      <g className="fill-ink-900">
        <rect x={80} y={124} width={7} height={8} rx={1} />
        <rect x={158} y={124} width={7} height={8} rx={1} />
      </g>
      <line x1={16} y1={132} x2={224} y2={132} className="stroke-calico-300" strokeWidth={1.5} />

      <DimX x1={72} x2={168} y={150} label={d.depth} />
      <DimY y1={28} y2={132} x={64} label={d.height} />
    </svg>
  );
}

function frontLabel(d: ParsedDimensions): string {
  const bits = [
    d.width !== undefined && `${d.width}cm wide`,
    d.height !== undefined && `${d.height}cm tall`,
    d.seatHeight !== undefined && `seat ${d.seatHeight}cm from the floor`,
  ].filter(Boolean);
  return `The sofa from the front: ${bits.join(', ')}.`;
}

function sideLabel(d: ParsedDimensions): string {
  const bits = [
    d.depth !== undefined && `${d.depth}cm deep`,
    d.height !== undefined && `${d.height}cm tall`,
  ].filter(Boolean);
  return `The sofa from the side: ${bits.join(', ')}.`;
}
