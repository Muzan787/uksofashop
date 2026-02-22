// src/app/faq/page.tsx
import { HelpCircle } from 'lucide-react';

const faqs = [
  {
    question: "Do you offer Cash on Delivery?",
    answer: "Yes! We understand buying furniture is a big investment. You can choose to pay our delivery drivers securely via cash or a mobile card terminal upon arrival."
  },
  {
    question: "Do you deliver outside of the UK?",
    answer: "Currently, we only operate within the United Kingdom. We offer free delivery to all UK Mainland addresses on orders over £500."
  },
  {
    question: "What does the 10-Year Guarantee cover?",
    answer: "Our 10-year guarantee covers all structural faults, including the wooden frame and springs. It does not cover general wear and tear, fabric fading, or accidental damage."
  },
  {
    question: "Can I cancel my order?",
    answer: "You can cancel your order free of charge at any time before it is dispatched. If the item has already left our warehouse, a return collection fee may apply."
  },
  {
    question: "How do I know if the sofa will fit through my door?",
    answer: "Please check the dimensions listed on the product page carefully. If you are unsure, contact our customer service team with your door frame measurements, and we can advise you."
  }
];

export default function FAQPage() {
  return (
    <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16 min-h-screen">
      <div className="text-center mb-12">
        <div className="w-16 h-16 bg-stone-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <HelpCircle className="w-8 h-8 text-stone-400" />
        </div>
        <h1 className="text-4xl font-bold text-stone-900 mb-4">Frequently Asked Questions</h1>
        <p className="text-stone-600">Find answers to our most common queries below.</p>
      </div>

      <div className="space-y-4">
        {faqs.map((faq, index) => (
          <details 
            key={index} 
            className="group bg-white border border-stone-200 rounded-xl shadow-sm [&_summary::-webkit-details-marker]:hidden"
          >
            <summary className="flex cursor-pointer items-center justify-between gap-1.5 p-6 text-stone-900 font-medium">
              <h2 className="text-lg">{faq.question}</h2>
              <span className="relative size-5 shrink-0">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="absolute inset-0 size-5 opacity-100 group-open:opacity-0 transition-opacity"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                </svg>
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="absolute inset-0 size-5 opacity-0 group-open:opacity-100 transition-opacity"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M20 12H4" />
                </svg>
              </span>
            </summary>

            <div className="px-6 pb-6 text-stone-600 leading-relaxed border-t border-stone-100 pt-4">
              {faq.answer}
            </div>
          </details>
        ))}
      </div>
    </main>
  );
}