'use client'
// src/app/admin/orders/DirectPrintButton.tsx
import { Printer } from 'lucide-react'
import type { AdminOrderDisplay } from '@/types/adminOrders'
import { buildReceipt, formatMoney, rowAmountText, rowLabelText } from '@/utils/orderReceipt'
import { ADDRESS_LINE, PHONE_DISPLAY, traderIdentityLine } from '@/constants/contact'

/** The note is built by string interpolation, so anything a customer typed is escaped. */
const esc = (v: unknown) =>
  String(v ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c] as string))

export default function DirectPrintButton({ order }: { order: AdminOrderDisplay }) {
  
  const handlePrint = () => {
    const receipt = buildReceipt(order)
    const trader = traderIdentityLine()

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
          <title>Receipt #${esc(receipt.ref)}</title>
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
            .paid-box {
              margin-top: 16px;
              padding: 14px 16px;
              border-radius: 10px;
              background: #f0fdf4;
              border: 1px solid #bbf7d0;
              color: #166534;
            }
            .paid-row {
              display: flex;
              justify-content: space-between;
              font-size: 15px;
              font-weight: 700;
              margin-bottom: 4px;
            }
            .paid-note { font-size: 12px; margin-top: 6px; line-height: 1.5; }
            .due-note { font-size: 12px; color: #78716c; margin-top: 12px; line-height: 1.5; }
            .guarantee-box {
              display: inline-block;
              max-width: 520px;
              margin-top: 8px;
              margin-bottom: 20px;
              padding: 14px 20px;
              border: 1px solid #d4871a;
              border-radius: 12px;
              font-size: 13px;
              color: #1c1917;
              line-height: 1.5;
            }
            .guarantee-title {
              font-size: 10px;
              font-weight: 700;
              color: #d4871a;
              text-transform: uppercase;
              letter-spacing: 0.1em;
              margin-bottom: 4px;
            }
            .guarantee-fine { font-size: 11px; color: #78716c; margin-top: 6px; }
          </style>
        </head>
        <body>
          <div class="receipt-container">
            <div class="top-accent"></div>

            <div class="header">
              <div>
                <div class="brand">UK Sofa<span style="color: #d4871a;">Shop</span></div>
                <div class="brand-subtitle">Order Receipt</div>
              </div>
              <div class="invoice-details">
                <div class="invoice-label">Receipt No.</div>
                <div class="invoice-number">#${esc(receipt.ref)}</div>
                <div class="invoice-date">${receipt.orderedOn ? `Ordered ${esc(receipt.orderedOn)}` : 'Date unavailable'}</div>
                ${receipt.deliveredOn ? `<div class="invoice-date">Delivered ${esc(receipt.deliveredOn)}</div>` : ''}
              </div>
            </div>

            <div class="grid">
              <div class="col">
                <div class="section-title">Billed To</div>
                <div class="customer-name">${esc(receipt.customerName)}</div>
                <div class="customer-info">
                  ${receipt.customerEmail ? `${esc(receipt.customerEmail)}<br/>` : ''}
                  ${esc(receipt.customerPhone)}
                </div>
              </div>
              <div class="col">
                <div class="section-title">Delivery Address</div>
                <div class="customer-info" style="white-space: pre-wrap;">${esc(receipt.address)}</div>
              </div>
            </div>

            <table>
              <thead>
                <tr>
                  <th>Item Description</th>
                  <th class="center" style="width: 9%;">Qty</th>
                  <th class="right" style="width: 17%;">Each</th>
                  <th class="right" style="width: 18%;">Total</th>
                </tr>
              </thead>
              <tbody>
                ${receipt.lines.map(line => `
                  <tr>
                    <td>
                      <div class="item-title">${esc(line.title)}</div>
                      ${line.summary.length ? `<div class="item-meta">${line.summary.map(s => `<span>${esc(s)}</span>`).join('<span>&bull;</span>')}</div>` : ''}
                      ${line.details.map(d => `<div class="item-meta"><span>${esc(d.label)}: <strong>${esc(d.value)}</strong></span></div>`).join('')}
                    </td>
                    <td class="center" style="font-weight: 600; color: #1c1917; vertical-align: middle;">${line.quantity}</td>
                    <td class="right" style="color: #57534e; vertical-align: middle;">${formatMoney(line.unit)}</td>
                    <td class="right" style="font-weight: 700; color: #1c1917; vertical-align: middle;">${formatMoney(line.total)}</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>

            <div class="summary-container">
              <div class="summary-box">
                <div class="summary-row">
                  <span>Items</span>
                  <span style="font-weight: 600; color: #1c1917;">${formatMoney(receipt.itemsSubtotal)}</span>
                </div>
                ${receipt.rows.map(row => `
                <div class="summary-row">
                  <span>${esc(rowLabelText(row))}</span>
                  <span style="font-weight: 600; color: ${row.kind === 'discount' ? '#166534' : '#1c1917'};">${esc(rowAmountText(row))}</span>
                </div>`).join('')}
                <div class="summary-total">
                  <span class="summary-total-label">${receipt.payment.kind === 'due' ? 'Total Due' : 'Total'}</span>
                  <span class="summary-total-value">${formatMoney(receipt.total)}</span>
                </div>
                ${receipt.payment.kind === 'paid' ? `
                <div class="paid-box">
                  <div class="paid-row"><span>${esc(receipt.payment.heading)}</span><span>${formatMoney(receipt.payment.amount)}</span></div>
                  <div class="paid-row" style="font-weight: 500;"><span>Balance</span><span>${formatMoney(0)}</span></div>
                  <div class="paid-note">${esc(receipt.payment.note)}</div>
                </div>` : `
                <div class="due-note">${esc(receipt.payment.note)}</div>`}
              </div>
            </div>

            <div class="footer">
               <div class="thank-you">Thank you for your business.</div>
               <div class="guarantee-box">
                 <div class="guarantee-title">${esc(receipt.guarantee.summary)}</div>
                 <div>${esc(receipt.guarantee.text)}</div>
                 <div class="guarantee-fine">${esc(receipt.guarantee.exclusions)}</div>
               </div>
               <div class="company-details">
                 UK Sofa Shop &nbsp;&bull;&nbsp; ${esc(ADDRESS_LINE)} &nbsp;&bull;&nbsp; ${esc(PHONE_DISPLAY)}
               </div>
               ${trader ? `<div class="company-details" style="margin-top: 6px; text-transform: none; letter-spacing: 0;">${esc(trader)}</div>` : ''}
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
      className="flex items-center justify-center gap-2 bg-stone-100 text-stone-700 px-4 py-2.5 rounded-sm text-sm font-bold hover:bg-stone-200 active:scale-95 transition"
      title="Print the receipt"
    >
      <Printer className="w-5 h-5" />
    </button>
  )
}