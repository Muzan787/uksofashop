// src/app/privacy/page.tsx
export default function PrivacyPage() {
  return (
    <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
      <div className="mb-12">
        <h1 className="text-4xl font-bold text-stone-900 mb-4">Privacy Policy</h1>
        <p className="text-stone-500">Last updated: {new Date().toLocaleDateString('en-GB')}</p>
      </div>

      <div className="prose prose-stone max-w-none space-y-8 text-stone-700">
        <p>
          At UK Sofa Shop (operated by Vantage Group LTD), we are committed to protecting and respecting your privacy. This policy explains when and why we collect personal information about people who visit our website, how we use it, and how we keep it secure.
        </p>

        <section>
          <h2 className="text-2xl font-bold text-stone-900 mb-3">1. Information We Collect</h2>
          <p>
            We collect information from you when you place an order, make an inquiry, or browse our website. The personal information we collect might include your name, address, email address, IP address, and information regarding what pages are accessed and when.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-bold text-stone-900 mb-3">2. How We Use Your Information</h2>
          <p>We may use your information to:</p>
          <ul className="list-disc pl-5 space-y-2 mt-2">
            <li>Process orders that you have submitted.</li>
            <li>Carry out our obligations arising from any contracts entered into by you and us.</li>
            <li>Notify you of changes to our services or your order status.</li>
            <li>Send you communications which you have requested and that may be of interest to you.</li>
          </ul>
        </section>

        <section>
          <h2 className="text-2xl font-bold text-stone-900 mb-3">3. Data Sharing</h2>
          <p>
            We will not sell or rent your information to third parties. We will not share your information with third parties for marketing purposes. We only share necessary delivery information (Name, Address, Phone) with our trusted logistics partners to ensure your sofa reaches you safely.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-bold text-stone-900 mb-3">4. Cookies</h2>
          <p>
            Like many other websites, the UK Sofa Shop website uses cookies. 'Cookies' are small pieces of information sent by an organisation to your computer and stored on your hard drive to allow that website to recognise you when you visit. They help us improve our website and deliver a better, more personalised service.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-bold text-stone-900 mb-3">5. Your Rights</h2>
          <p>
            Under UK GDPR, you have the right to access the personal information we hold about you, request corrections, or ask for your data to be deleted. To exercise any of these rights, please contact us at support@uksofashop.co.uk.
          </p>
        </section>
      </div>
    </main>
  );
}