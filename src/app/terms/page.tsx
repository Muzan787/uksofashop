// src/app/terms/page.tsx
export default function TermsPage() {
  return (
    <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
      <div className="mb-12">
        <h1 className="text-4xl font-bold text-stone-900 mb-4">Terms and Conditions</h1>
        <p className="text-stone-500">Last updated: {new Date().toLocaleDateString('en-GB')}</p>
      </div>

      <div className="prose prose-stone max-w-none space-y-8 text-stone-700">
        <section>
          <h2 className="text-2xl font-bold text-stone-900 mb-3">1. Introduction</h2>
          <p>
            Welcome to UK Sofa Shop. These Terms and Conditions govern your use of our website and the purchase of goods from us. By accessing our website and placing an order, you agree to be bound by these terms.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-bold text-stone-900 mb-3">2. Placing an Order</h2>
          <p>
            When you place an order on our website, you are making an offer to buy goods. We will send you an order acknowledgement email confirming receipt of your order. This email is not an acceptance of your order. Order acceptance and the completion of the contract between you and us will take place upon the dispatch of the products ordered.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-bold text-stone-900 mb-3">3. Pricing and Payment</h2>
          <p>
            All prices on our website are inclusive of VAT at the current rates. We offer a "Cash on Delivery" service. Payment must be made in full to the delivery driver upon the arrival of your items. Acceptable payment methods at the door include cash and major credit/debit cards via a mobile terminal.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-bold text-stone-900 mb-3">4. Delivery</h2>
          <p>
            We offer free delivery to UK Mainland addresses on orders over £500. Delivery dates are estimates and are not guaranteed. We will make every effort to deliver goods within the estimated timeframes; however, delays are occasionally inevitable due to unforeseen factors.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-bold text-stone-900 mb-3">5. Returns and Cancellations</h2>
          <p>
            You have the right to cancel your order within 30 days without giving any reason. The cancellation period will expire after 30 days from the day on which you acquire physical possession of the goods. Goods must be returned in their original condition. Please note that collection charges may apply for returned items.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-bold text-stone-900 mb-3">6. Guarantees</h2>
          <p>
            All our sofas come with a standard 10-year structural guarantee, covering the frame and springs. This guarantee does not cover wear and tear, accidental damage, or misuse of the product.
          </p>
        </section>
      </div>
    </main>
  );
}