import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import DeliveryEstimator from '@/components/Product/DeliveryEstimator';

// An internal QA harness. It 404s unless PHASE_D_QA_ENABLE is set, but when it
// IS set it was a reachable page with no metadata of its own - so it inherited
// the homepage title and description and was indexable. noindex regardless of
// the flag, because the one environment where it renders is the one where a
// crawler could find it.
export const metadata: Metadata = {
  title: 'Phase D estimator QA',
  description: 'Internal QA harness for the delivery estimator.',
  robots: { index: false, follow: false },
};

export default function PhaseDEstimatorQaPage() {
  if (process.env.PHASE_D_QA_ENABLE !== '1') notFound();

  return (
    <main className="mx-auto max-w-2xl p-6">
      <h1 className="mb-6 text-2xl font-semibold">Phase D estimator QA</h1>
      <DeliveryEstimator />
    </main>
  );
}
