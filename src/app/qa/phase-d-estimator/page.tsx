import { notFound } from 'next/navigation';
import DeliveryEstimator from '@/components/Product/DeliveryEstimator';

export default function PhaseDEstimatorQaPage() {
  if (process.env.PHASE_D_QA_ENABLE !== '1') notFound();

  return (
    <main className="mx-auto max-w-2xl p-6">
      <h1 className="mb-6 text-2xl font-semibold">Phase D estimator QA</h1>
      <DeliveryEstimator />
    </main>
  );
}
