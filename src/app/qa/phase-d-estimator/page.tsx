import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { headers } from 'next/headers';
import DeliveryEstimator from '@/components/Product/DeliveryEstimator';
import { PRODUCTION_HOSTS } from '@/utils/trackingEnv';

/**
 * QA-only harness page for the delivery estimator, driven by
 * .github/workflows/phase-d-validation.yml. It ships on master because that
 * workflow builds the real tree; the gate below is what keeps it harmless,
 * and the noindex is a second line in case it is ever reachable.
 */
export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

export const dynamic = 'force-dynamic';

export default async function PhaseDEstimatorQaPage() {
  if (process.env.PHASE_D_QA_ENABLE !== '1') notFound();

  // Backstop: never render on a live hostname, whatever the environment
  // variable says.
  const host = (await headers()).get('host')?.split(':')[0] ?? '';
  if ((PRODUCTION_HOSTS as readonly string[]).includes(host)) notFound();

  return (
    <main className="mx-auto max-w-2xl p-6">
      <h1 className="mb-6 text-2xl font-semibold">Phase D estimator QA</h1>
      <DeliveryEstimator />
    </main>
  );
}
