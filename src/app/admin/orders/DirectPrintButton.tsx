'use client'
// src/app/admin/orders/DirectPrintButton.tsx
import { Printer } from 'lucide-react'

/*
// ==========================================
// DUMMY CUSTOM ORDER TEMPLATE
// Uncomment this block and change the details 
// when you need to print a custom receipt.
// ==========================================
const DUMMY_CUSTOM_ORDER = {
  id: "CUSTOM-001",
  created_at: new Date().toISOString(),
  customer_name: "Jane Doe",
  customer_email: "jane.doe@example.com",
  customer_phone: "07700 900077",
  shipping_address: "10 Downing Street\nLondon\nSW1A 2AA",
  total_amount: 1199.98,
  order_items: [
    {
      quantity: 1,
      price_at_time_of_purchase: 899.99,
      product_variants: {
        color: "Emerald Green",
        sku: "SOFA-EMR-3SEAT",
        products: {
          title: "Premium Velvet Chesterfield Sofa"
        }
      }
    },
    {
      quantity: 1,
      price_at_time_of_purchase: 299.99,
      product_variants: {
        color: "Emerald Green",
        sku: "CHAIR-EMR-1SEAT",
        products: {
          title: "Matching Accent Chair"
        }
      }
    }
  ]
};
*/

export default function DirectPrintButton({ order }: { order: any }) {
  
  const handlePrint = () => {
    // TOGGLE THIS: Change `order` to `DUMMY_CUSTOM_ORDER` when you want to use the custom data
    const activeOrder = order;

    const iframe = document.createElement('iframe')
    iframe.style.position = 'fixed'
    iframe.style.right = '0'
    iframe.style.bottom = '0'
    iframe.style.width = '0'
    iframe.style.height = '0'
    iframe.style.border = '0'
    document.body.appendChild(iframe)

    const doc = iframe.contentWindow?.document
    if (!doc) return

    const htmlContent = `
      <html>
        <head>
          <title>Invoice #${activeOrder.id.split('-')[0].toUpperCase()}</title>
          <link rel="preconnect" href="https://fonts.googleapis.com">
          <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
          <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Playfair+Display:ital,wght@0,600;0,700;0,800;1,600&display=swap" rel="stylesheet">
          <style>
            @page { size: A4; margin: 0; }
            body { 
              font-family: 'Inter', sans-serif; 
              margin: 0; 
              padding: 0;
              color: #292524; 
              -webkit-print-color-adjust: exact; 
              print-color-adjust: exact;
              background-color: #fff;
            }
            .receipt-container {
              padding: 50px 60px;
              max-width: 800px;
              margin: 0 auto;
              position: relative;
            }
            /* Premium Top Accent Bar */
            .top-accent {
              position: absolute;
              top: 0;
              left: 0;
              right: 0;
              height: 12px;
              background: linear-gradient(90deg, #d4871a 0%, #f97316 100%);
            }
            .header { 
              display: flex; 
              justify-content: space-between; 
              align-items: flex-start;
              margin-top: 20px;
              margin-bottom: 50px; 
            }
            .brand { 
              font-family: 'Playfair Display', serif;
              font-size: 42px; 
              font-weight: 800; 
              color: #1c1917;
              letter-spacing: -0.02em;
              margin-bottom: 4px; 
            }
            .brand-subtitle {
              font-size: 11px;
              text-transform: uppercase;
              letter-spacing: 0.2em;
              color: #a8a29e;
              font-weight: 600;
            }
            .invoice-details {
              text-align: right;
              background: #fafaf9;
              padding: 16px 24px;
              border-radius: 12px;
              border: 1px solid #f5f5f4;
            }
            .invoice-label { 
              font-size: 10px; 
              font-weight: 700; 
              text-transform: uppercase; 
              color: #d4871a; 
              letter-spacing: 0.1em;
              margin-bottom: 4px; 
            }
            .invoice-number {
              font-family: 'Inter', monospace;
              font-size: 20px;
              font-weight: 700;
              color: #1c1917;
            }
            .invoice-date {
              font-size: 13px;
              color: #78716c;
              margin-top: 4px;
              font-weight: 500;
            }
            .grid { 
              display: flex; 
              gap: 40px;
              margin-bottom: 50px; 
            }
            .col { 
              flex: 1; 
            }
            .section-title { 
              font-size: 11px; 
              font-weight: 700; 
              text-transform: uppercase; 
              color: #a8a29e; 
              margin-bottom: 12px; 
              letter-spacing: 0.1em;
              border-bottom: 1px solid #e7e5e4;
              padding-bottom: 8px;
            }
            .customer-name {
              font-size: 18px;
              font-weight: 700;
              color: #1c1917;
              margin-bottom: 4px;
            }
            .customer-info {
              font-size: 13px;
              color: #57534e;
              line-height: 1.6;
            }
            table { 
              width: 100%; 
              border-collapse: separate; 
              border-spacing: 0;
              margin-bottom: 40px;
            }
            th { 
              text-align: left; 
              padding: 12px 16px; 
              background: #1c1917;
              color: #fff;
              font-size: 11px; 
              text-transform: uppercase; 
              letter-spacing: 0.1em;
              font-weight: 600;
            }
            th:first-child { border-top-left-radius: 8px; border-bottom-left-radius: 8px; }
            th:last-child { border-top-right-radius: 8px; border-bottom-right-radius: 8px; }
            td { 
              padding: 20px 16px; 
              border-bottom: 1px solid #f5f5f4; 
              font-size: 14px; 
              vertical-align: top;
            }
            .item-title {
              font-weight: 600;
              color: #1c1917;
              font-size: 15px;
            }
            .item-meta {
              font-size: 12px;
              color: #78716c;
              margin-top: 6px;
              display: flex;
              gap: 12px;
            }
            .right { text-align: right; }
            .center { text-align: center; }
            
            .summary-container {
              display: flex;
              justify-content: flex-end;
              margin-top: 20px;
            }
            .summary-box {
              width: 320px;
              background: #fafaf9;
              border-radius: 12px;
              padding: 24px;
            }
            .summary-row {
              display: flex;
              justify-content: space-between;
              margin-bottom: 12px;
              font-size: 14px;
              color: #57534e;
            }
            .summary-total {
              display: flex;
              justify-content: space-between;
              align-items: center;
              margin-top: 16px;
              padding-top: 16px;
              border-top: 2px solid #e7e5e4;
            }
            .summary-total-label {
              font-family: 'Playfair Display', serif;
              font-size: 20px;
              font-weight: 700;
              color: #1c1917;
            }
            .summary-total-value {
              font-size: 24px;
              font-weight: 800;
              color: #d4871a;
            }
            
            .footer {
              margin-top: 80px;
              text-align: center;
              padding-top: 40px;
              border-top: 1px solid #f5f5f4;
            }
            .thank-you {
              font-family: 'Playfair Display', serif;
              font-size: 24px;
              font-style: italic;
              color: #1c1917;
              margin-bottom: 12px;
            }
            .company-details {
              font-size: 11px;
              color: #a8a29e;
              line-height: 1.8;
              text-transform: uppercase;
              letter-spacing: 0.1em;
            }
            .guarantee-badge {
              display: inline-block;
              margin-top: 16px;
              padding: 6px 12px;
              border: 1px solid #d4871a;
              border-radius: 20px;
              font-size: 10px;
              font-weight: 700;
              color: #d4871a;
              text-transform: uppercase;
              letter-spacing: 0.1em;
            }
          </style>
        </head>
        <body>
          <div class="receipt-container">
            <div class="top-accent"></div>
            
            <div class="header">
              <div>
                <div class="brand">UK Sofa<span style="color: #d4871a;">Shop</span></div>
                <div class="brand-subtitle">Official Order Invoice</div>
              </div>
              <div class="invoice-details">
                <div class="invoice-label">Invoice No.</div>
                <div class="invoice-number">#${activeOrder.id.split('-')[0].toUpperCase()}</div>
                <div class="invoice-date">${new Date(activeOrder.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}</div>
              </div>
            </div>

            <div class="grid">
              <div class="col">
                <div class="section-title">Billed To</div>
                <div class="customer-name">${activeOrder.customer_name}</div>
                <div class="customer-info">
                  ${activeOrder.customer_email}<br/>
                  ${activeOrder.customer_phone}
                </div>
              </div>
              <div class="col">
                <div class="section-title">Shipping Address</div>
                <div class="customer-info" style="white-space: pre-wrap;">${activeOrder.shipping_address}</div>
              </div>
            </div>

            <table>
              <thead>
                <tr>
                  <th>Item Description</th>
                  <th class="center" style="width: 15%;">Qty</th>
                  <th class="right" style="width: 25%;">Total</th>
                </tr>
              </thead>
              <tbody>
                ${activeOrder.order_items.map((item: any) => `
                  <tr>
                    <td>
                      <div class="item-title">${item.product_variants?.products?.title}</div>
                      <div class="item-meta">
                        <span>Color: <strong>${item.product_variants?.color}</strong></span>
                        <span>&bull;</span>
                        <span>SKU: ${item.product_variants?.sku}</span>
                      </div>
                    </td>
                    <td class="center" style="font-weight: 600; color: #1c1917; vertical-align: middle;">${item.quantity}</td>
                    <td class="right" style="font-weight: 700; color: #1c1917; vertical-align: middle;">£${(item.price_at_time_of_purchase * item.quantity).toFixed(2)}</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>

            <div class="summary-container">
              <div class="summary-box">
                <div class="summary-row">
                  <span>Subtotal</span>
                  <span style="font-weight: 600; color: #1c1917;">£${activeOrder.total_amount.toFixed(2)}</span>
                </div>
                <div class="summary-row">
                  <span>Delivery</span>
                  <span style="font-weight: 600; color: #1c1917;">£0.00</span>
                </div>
                <div class="summary-total">
                  <span class="summary-total-label">Total Due</span>
                  <span class="summary-total-value">£${activeOrder.total_amount.toFixed(2)}</span>
                </div>
              </div>
            </div>
            
            <div class="footer">
               <div class="thank-you">Thank you for your business.</div>
               <div class="company-details">
                 Vantage Group LTD &nbsp;&bull;&nbsp; 123 Furniture Way, London &nbsp;&bull;&nbsp; 0747 661 6022
               </div>
               <div class="guarantee-badge">10-Year Frame Guarantee</div>
            </div>
          </div>
        </body>
      </html>
    `

    doc.open()
    doc.write(htmlContent)
    doc.close()

    setTimeout(() => {
      iframe.contentWindow?.focus()
      iframe.contentWindow?.print()
      setTimeout(() => document.body.removeChild(iframe), 1000)
    }, 400)
  }

  return (
    <button 
      onClick={handlePrint}
      type="button"
      className="flex items-center justify-center gap-2 bg-stone-100 text-stone-700 px-4 py-2.5 rounded-xl text-sm font-bold hover:bg-stone-200 active:scale-95 transition"
      title="Print Elegant PDF Receipt"
    >
      <Printer className="w-5 h-5" />
    </button>
  )
}