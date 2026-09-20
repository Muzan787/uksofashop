import nodemailer from 'nodemailer';
import type { DeliveryBreakdown } from '@/constants/delivery';
import { whatsAppLink } from '@/utils/phone';
import { trustpilotInviteBcc, trustpilotInviteLink } from '@/constants/trustpilot';
import { formatPreferredDeliveryDate } from '@/utils/delivery';
import { PHONE_DISPLAY, SUPPORT_EMAIL, ORDERS_EMAIL, OWNER_GMAIL, whatsAppHref } from '@/constants/contact';
import { gbp, recoveryBasketLines, recoveryBasketTotal, recoveryReminderEmail } from '@/utils/recoveryLeadFormat';

/**
 * Escapes a value before it goes into an email's HTML.
 *
 * Every template in this file interpolates directly into markup. Without this,
 * anyone who submits the contact form or a review can put working HTML into an
 * inbox - a live link, a fake 'click here to confirm' button, or an image that
 * reports back when the mail is opened. The reviews and contact messages land
 * in OUR inbox, so this is a hole aimed at us rather than at customers.
 *
 * Applied to every value that originates from a customer. Numbers formatted by
 * this file are left alone.
 */
function esc(value: string | number | null | undefined): string {
  if (value === null || value === undefined) return '';
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}


/**
 * Renders the order total as rows: items, optional offer, free delivery, each
 * chosen extra, then the grand total. Used by both customer and admin emails so
 * the figures in an inbox always match the authoritative order record.
 */
const totalsTable = (
  itemsSubtotal: number,
  breakdown: DeliveryBreakdown | undefined,
  grandTotal: number,
  discountAmount = 0,
  promotionCode: string | null = null,
  accent = '#d4871a',
) => {
  const row = (label: string, value: string, muted = false) => `
    <tr>
      <td style="padding: 5px 0; color: ${muted ? '#a8a29e' : '#57534e'}; font-size: 13px;">${label}</td>
      <td style="padding: 5px 0; color: ${muted ? '#a8a29e' : '#1c1917'}; font-size: 13px; text-align: right; white-space: nowrap;">${value}</td>
    </tr>`;

  const extras = (breakdown?.lines ?? [])
    .map(l => row(`${l.label}${l.detail ? ` <span style="color:#a8a29e;">(${l.detail})</span>` : ''}`, `£${l.amount.toFixed(2)}`))
    .join('');

  const offer = discountAmount > 0
    ? row(`Offer${promotionCode ? ` · ${esc(promotionCode)}` : ''}`, `−£${discountAmount.toFixed(2)}`)
    : '';

  // A WhatsApp order carries one agreed delivery figure rather than the
  // website's free-plus-extras; printing "FREE" above it would contradict it.
  const agreed = (breakdown?.lines ?? []).some(l => l.key === 'agreed');

  return `
    <table role="presentation" style="width: 100%; border-collapse: collapse; margin: 0;">
      ${row('Your order', `£${itemsSubtotal.toFixed(2)}`)}
      ${offer}
      ${agreed ? '' : row('Delivery (UK Mainland, ground floor)', 'FREE')}
      ${extras}
      <tr>
        <td style="padding: 12px 0 0 0; border-top: 1px solid #e7e5e4; color: #1c1917; font-size: 14px; font-weight: bold;">Total due on delivery</td>
        <td style="padding: 12px 0 0 0; border-top: 1px solid #e7e5e4; color: ${accent}; font-size: 18px; font-weight: bold; text-align: right; white-space: nowrap;">£${grandTotal.toFixed(2)}</td>
      </tr>
    </table>`;
};

// 1. Transport
/**
 * Sends through the shop's own mailbox on Hostinger Mail: authenticated as
 * the enquiries@ mailbox, shown to the customer as the orders@ alias.
 *
 * Why not Gmail any more: mail branded uksofashop.co.uk but sent from a
 * @gmail.com account cannot pass SPF or DKIM for our domain, and since 2024
 * Gmail, Yahoo and Outlook file unauthenticated senders as spam. The domain
 * now carries Hostinger's MX, SPF and DKIM records, so mail sent this way is
 * authenticated and DMARC-aligned. Gmail's ~500/day cap also went away.
 *
 * SMTP_PASSWORD is the one variable that switches the site over: it is the
 * password of the SUPPORT_EMAIL mailbox. Host, port and user default to
 * Hostinger and can be overridden (SMTP_HOST, SMTP_PORT, SMTP_USER) to move to
 * Resend, Postmark or any other relay without touching this file. Until the
 * password is set the old Gmail app-password transport is used, so nothing
 * breaks between the deploy and the configuration.
 */
const SMTP_PASSWORD = process.env.SMTP_PASSWORD
const usingDomainSender = Boolean(SMTP_PASSWORD)
const SMTP_HOST = process.env.SMTP_HOST || 'smtp.hostinger.com'
const SMTP_PORT = Number(process.env.SMTP_PORT ?? 465)
/** The mailbox we log in as. Also the envelope sender - see deliver(). */
const SMTP_USER = process.env.SMTP_USER || SUPPORT_EMAIL

const transporter = nodemailer.createTransport(
  usingDomainSender
    ? {
        host: SMTP_HOST,
        port: SMTP_PORT,
        // 465 is implicit TLS, 587 upgrades with STARTTLS.
        secure: SMTP_PORT === 465,
        auth: {
          user: SMTP_USER,
          pass: SMTP_PASSWORD,
        },
      }
    : {
        service: 'gmail',
        auth: {
          user: process.env.EMAIL_USER,
          pass: process.env.EMAIL_APP_PASSWORD,
        },
      },
)

/**
 * The address in the From header. orders@ on the domain sender. On the Gmail
 * fallback it has to be the Gmail account itself: Gmail rewrites any other
 * From to the authenticated address regardless.
 */
export const MAIL_FROM_ADDRESS =
  process.env.MAIL_FROM || (usingDomainSender ? ORDERS_EMAIL : process.env.EMAIL_USER || SUPPORT_EMAIL)

/** Where a customer's reply to an automated email lands. */
export const MAIL_REPLY_TO = process.env.MAIL_REPLY_TO || SUPPORT_EMAIL

/** Where admin notifications land. */
export const MAIL_TO_ADMIN = process.env.ADMIN_EMAIL || SUPPORT_EMAIL

/** Builds `"UK Sofa Shop" <orders@uksofashop.co.uk>`. */
function sender(label = 'UK Sofa Shop'): string {
  return `"${label}" <${MAIL_FROM_ADDRESS}>`
}

type Mail = Omit<nodemailer.SendMailOptions, 'from' | 'to'> & { from?: string; to: string }

/**
 * Every template sends through here rather than calling the transport, so the
 * rules below hold for all of them.
 *
 * - The From header is the orders@ alias, but the SMTP envelope sender is the
 *   mailbox we logged in as. Relays check the envelope against the login and
 *   reject a mismatch ("sender address rejected: not owned by user"); the
 *   header is what the customer sees. Both are on our domain, so SPF and DKIM
 *   stay aligned with the From domain and DMARC passes either way. Bounces go
 *   to the envelope address, which puts them in the inbox someone reads.
 * - Customer-facing mail gets Reply-To enquiries@ unless the template chose
 *   its own (contact-form and swatch notifications reply to the customer).
 * - If the relay refuses the alias outright, the message is sent again from
 *   the mailbox address itself and the fact is logged. A confirmation from
 *   enquiries@ is better than no confirmation.
 * - A custom envelope REPLACES nodemailer's own recipient list, so every
 *   recipient - To, Cc and Bcc - has to be repeated in it. Before this was
 *   written out, a Bcc would have been in the headers and never actually
 *   sent, which is exactly the silent failure a Bcc to Trustpilot's
 *   invitation service would produce.
 */
async function deliver(mail: Mail) {
  const message: nodemailer.SendMailOptions = {
    from: sender(),
    replyTo: MAIL_REPLY_TO,
    ...mail,
    ...(usingDomainSender
      ? { envelope: { from: SMTP_USER, to: envelopeRecipients(mail.to, mail.cc, mail.bcc) } }
      : {}),
  }
  try {
    return await transporter.sendMail(message)
  } catch (err) {
    const from = String(message.from)
    if (!usingDomainSender || !from.includes(MAIL_FROM_ADDRESS) || MAIL_FROM_ADDRESS === SMTP_USER || !isSenderRejected(err)) {
      throw err
    }
    console.warn(`[email] relay rejected From <${MAIL_FROM_ADDRESS}>, re-sending from <${SMTP_USER}>:`, (err as Error).message)
    return transporter.sendMail({ ...message, from: from.replace(MAIL_FROM_ADDRESS, SMTP_USER) })
  }
}

/**
 * Every recipient as a bare address, for the SMTP envelope. Headers may carry
 * display names ("Jane Smith" <jane@example.com>); the envelope wants only
 * what is between the angle brackets.
 */
function envelopeRecipients(...fields: nodemailer.SendMailOptions['to'][]): string[] {
  const out: string[] = []
  for (const field of fields) {
    if (!field) continue
    for (const entry of Array.isArray(field) ? field : [field]) {
      const raw = typeof entry === 'string' ? entry : entry.address
      for (const part of raw.split(',')) {
        const address = part.match(/<([^>]+)>/)?.[1] ?? part
        const trimmed = address.trim()
        if (trimmed) out.push(trimmed)
      }
    }
  }
  return out
}

/**
 * True when the relay turned the message away because of who it was from,
 * as opposed to a bad recipient, a full mailbox or a connection failure. The
 * envelope sender is already the mailbox itself, so the only sender check
 * that can still fail is the one on the From header, which relays report as
 * a permanent 5xx that names the sender.
 */
function isSenderRejected(err: unknown): boolean {
  const e = err as { responseCode?: number; response?: string; message?: string }
  const permanent = typeof e.responseCode === 'number' && e.responseCode >= 500
  return permanent && /sender|from address|not owned|not allowed|not authori[sz]ed/i.test(`${e.response ?? ''} ${e.message ?? ''}`)
}

// 2. Base HTML Wrapper for Brand Consistency
const generateEmailHTML = (content: string) => `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="background-color: #f8f6f2; font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; padding: 20px; margin: 0; color: #1c1917;">
  <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 24px rgba(0,0,0,0.06); border: 1px solid #f0ede8;">
    
    <div style="background-color: #ffffff; padding: 24px; text-align: center; border-bottom: 3px solid #d4871a;">
      <h1 style="margin: 0; font-size: 26px; font-weight: 700; color: #1c1917;">
        UK Sofa <span style="color: #d4871a;">Shop</span>
      </h1>
    </div>
    
    <div style="padding: 36px 28px;">
      ${content}
    </div>
    
    <div style="background-color: #fafaf9; padding: 24px; text-align: center; border-top: 1px solid #e7e5e4;">
      <p style="margin: 0; color: #78716c; font-size: 12px;">Need help? Reply to this email or write to <a href="mailto:${SUPPORT_EMAIL}" style="color: #78716c;">${SUPPORT_EMAIL}</a>.</p>
      <p style="margin: 8px 0 0 0; color: #a8a29e; font-size: 11px;">© ${new Date().getFullYear()} UK Sofa Shop. All rights reserved.</p>
    </div>
  </div>
</body>
</html>
`;

// 3. Customer: Order Confirmation
export async function sendOrderConfirmation(
  email: string,
  name: string,
  shortCode: string,
  fullOrderId: string,
  total: number,
  itemsSubtotal: number = total,
  breakdown?: DeliveryBreakdown,
  discountAmount = 0,
  promotionCode: string | null = null,
  /** The day they asked for at checkout, YYYY-MM-DD, or null for as soon as possible. */
  preferredDeliveryDate: string | null = null,
) {
  // A receipt that carries the confirm link. The shop also sends the same
  // link on WhatsApp (see sendAdminOrderNotification) so the yes is on record
  // in the chat; either tap confirms the order, and the phone call that
  // follows is to arrange delivery.
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';
  const confirmLink = `${siteUrl}/confirm-order/${fullOrderId}`;
  const firstName = (name || '').trim().split(/\s+/)[0] || 'there';
  const trackLink = `${siteUrl}/track-order?ref=${encodeURIComponent(shortCode)}`;

  const content = `
    <div style="text-align: center;">
      <div style="display: inline-block; background-color: #0c0c0b; color: #d4871a; padding: 6px 14px; border-radius: 6px; font-weight: bold; font-size: 11px; margin-bottom: 24px; letter-spacing: 0.1em; text-transform: uppercase;">
        Order received
      </div>
      
      <h2 style="margin: 0 0 16px 0; font-size: 24px; color: #1c1917;">Thank you, ${esc(firstName)}!</h2>
      <p style="color: #57534e; line-height: 1.6; font-size: 15px; margin-bottom: 32px;">
        We have your order. Please confirm it with the button below - we will send the same link on WhatsApp too - and once it is confirmed one of our team will ring you to arrange a delivery day. Nothing is charged now - you pay in cash or by bank transfer once the sofa is in the room.
      </p>
      
      <div style="background-color: #fafaf9; border: 1px solid #e7e5e4; padding: 24px; border-radius: 10px; margin-bottom: 32px;">
        <p style="margin: 0 0 4px 0; color: #78716c; font-size: 11px; text-transform: uppercase; letter-spacing: 0.1em; font-weight: bold;">Order Reference</p>
        <p style="margin: 0 0 24px 0; font-size: 24px; font-weight: bold; font-family: monospace; letter-spacing: 2px; color: #1c1917;">${shortCode}</p>
        ${preferredDeliveryDate ? `
        <p style="margin: 0 0 4px 0; color: #78716c; font-size: 11px; text-transform: uppercase; letter-spacing: 0.1em; font-weight: bold;">Requested delivery day</p>
        <p style="margin: 0 0 4px 0; font-size: 16px; font-weight: bold; color: #1c1917;">${esc(formatPreferredDeliveryDate(preferredDeliveryDate))}</p>
        <p style="margin: 0 0 24px 0; color: #78716c; font-size: 12px;">We will ring to agree the time slot on the day.</p>` : ''}
        
        <div style="text-align: left; padding-top: 4px;">
          ${totalsTable(itemsSubtotal, breakdown, total, discountAmount, promotionCode)}
        </div>
      </div>

      <a href="${confirmLink}" style="background-color: #0c0c0b; color: #ffffff; padding: 16px 32px; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 16px; display: inline-block;">
        Confirm my order
      </a>
      <p style="margin: 20px 0 0 0; color: #78716c; font-size: 12px; line-height: 1.6;">
        <a href="${trackLink}" style="color: #78716c; text-decoration: underline;">Track your order</a> · Need to change anything? Reply to this email or message us on WhatsApp on ${esc(PHONE_DISPLAY)}.
      </p>
    </div>
  `;

  await deliver({
    from: sender(),
    to: email,
    subject: `Please confirm your order (#${shortCode})`,
    html: generateEmailHTML(content),
  });
}

// 4. Admin: New Order Notification (With WhatsApp Integration)
export async function sendAdminOrderNotification(
  customerName: string,
  customerEmail: string,
  customerPhone: string,
  shortCode: string,
  fullOrderId: string,
  totalAmount: number,
  itemsSubtotal: number = totalAmount,
  breakdown?: DeliveryBreakdown,
  discountAmount = 0,
  promotionCode: string | null = null,
  /** The day the customer asked for, YYYY-MM-DD, or null for as soon as possible. */
  preferredDeliveryDate: string | null = null,
) {
  const adminEmail = process.env.ADMIN_EMAIL;
  if (!adminEmail) return;

  // null when the number is not a UK mobile, so the button is hidden rather
  // than rendered as a dead link.
  //
  // The message carries the confirm link. Muaz's process (2026-09-19): the
  // customer confirms the order by tapping the link from WhatsApp, so the
  // yes is on record in the chat; the phone call that follows is to arrange
  // delivery, not to confirm. (It was briefly a hello without the link.)
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';
  const confirmLink = `${siteUrl}/confirm-order/${fullOrderId}`;
  const waFirstName = (customerName || '').trim().split(/\s+/)[0] || 'there';
  const waUrl = whatsAppLink(
    customerPhone,
    `Hi ${waFirstName}, thanks for your order (#${shortCode}) with UK Sofa Shop. Please confirm it by tapping this link: ${confirmLink}

Once it is confirmed we will ring you to arrange delivery.`,
  );

  const content = `
    <div style="text-align: left;">
      <div style="display: inline-block; background-color: #dbeafe; color: #1e40af; padding: 6px 14px; border-radius: 6px; font-weight: bold; font-size: 11px; margin-bottom: 24px; letter-spacing: 0.1em; text-transform: uppercase;">
        New Order Alert
      </div>
      
      <h2 style="margin: 0 0 16px 0; font-size: 22px; color: #1c1917;">Dear Admin, you received another order!</h2>
      <p style="color: #57534e; line-height: 1.6; font-size: 15px;">
        <strong>${esc(customerName)}</strong> (${esc(customerEmail)}) has submitted a new Cash on Delivery order.
      </p>
      
      <div style="background-color: #fafaf9; border-left: 3px solid #3b82f6; padding: 20px; margin: 24px 0;">
        <p style="margin: 0 0 4px 0; color: #78716c; font-size: 11px; text-transform: uppercase; font-weight: bold;">Order Reference</p>
        <p style="margin: 0 0 16px 0; font-size: 20px; font-weight: bold; font-family: monospace;">${shortCode}</p>
        
        <p style="margin: 0 0 4px 0; color: #78716c; font-size: 11px; text-transform: uppercase; font-weight: bold;">Customer Phone</p>
        <p style="margin: 0 0 16px 0; font-size: 16px; font-weight: bold;">${esc(customerPhone)}</p>

        <p style="margin: 0 0 4px 0; color: #78716c; font-size: 11px; text-transform: uppercase; font-weight: bold;">Requested delivery day</p>
        <p style="margin: 0 0 16px 0; font-size: 16px; font-weight: bold;">${preferredDeliveryDate ? esc(formatPreferredDeliveryDate(preferredDeliveryDate)) : 'As soon as possible'}</p>
        
        <p style="margin: 0 0 6px 0; color: #78716c; font-size: 11px; text-transform: uppercase; font-weight: bold;">Amount to Collect</p>
        ${totalsTable(itemsSubtotal, breakdown, totalAmount, discountAmount, promotionCode)}
        ${(breakdown?.lines.some(l => l.key === 'sofaRemoval'))
          ? `<p style="margin: 14px 0 0 0; padding: 10px 12px; background: #fef9f0; border-left: 3px solid #d4871a; color: #57534e; font-size: 12px;">
               <strong>Action:</strong> this customer wants their old sofa removed (${esc(breakdown?.lines.find(l => l.key === 'sofaRemoval')?.detail ?? '')}). Confirm the charge with them before delivery if the item is unusually large.
             </p>` : ''}
      </div>

      ${waUrl ? `<a href="${waUrl}" style="background-color: #25D366; color: #ffffff; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 14px; display: inline-block; margin-top: 16px;">Ask Customer to Confirm Order</a>` : `<p style="margin-top: 16px; color: #a8a29e; font-size: 12px;">No WhatsApp button: that phone number is not a UK mobile.</p>`}
      
      <div style="margin-top: 32px; text-align: center;">
        <a href="${siteUrl}/admin/orders" style="color: #a8a29e; font-size: 12px; text-decoration: underline;">
          Or view this order in the Admin Dashboard
        </a>
      </div>
    </div>
  `;

  await deliver({
    from: sender(),
    to: adminEmail,
    subject: `Action Required: New Order Received (#${shortCode})`,
    html: generateEmailHTML(content),
  });
}

// 5. Admin: Review Moderation Notification
export async function sendAdminReviewNotification(
  reviewerEmail: string,
  rating: number,
  comment: string,
  imageUrl: string | null
) {
  const adminEmail = process.env.ADMIN_EMAIL;
  if (!adminEmail) return;

  const content = `
    <div style="text-align: left;">
      <div style="display: inline-block; background-color: #fef9f0; color: #d4871a; padding: 6px 14px; border-radius: 6px; font-weight: bold; font-size: 11px; margin-bottom: 24px; letter-spacing: 0.1em; text-transform: uppercase;">
        Action Required: Review
      </div>
      
      <h2 style="margin: 0 0 16px 0; font-size: 22px;">New Customer Review Submitted</h2>
      <p style="color: #57534e; line-height: 1.6; font-size: 15px;">A customer has submitted a new review that requires your approval.</p>
      
      <div style="background-color: #fafaf9; padding: 20px; border-radius: 8px; margin: 24px 0; border: 1px solid #e7e5e4;">
        <p style="margin: 0 0 8px 0; color: #78716c;"><strong>Customer:</strong> ${esc(reviewerEmail)}</p>
        <p style="margin: 0 0 8px 0; color: #78716c;"><strong>Rating:</strong> <span style="color: #d4871a; font-weight: bold;">${rating} / 5 Stars</span></p>
        ${imageUrl ? `<p style="margin: 0; color: #78716c;"><strong>Image:</strong> <a href="${imageUrl}" style="color: #2563eb;">View Uploaded Image</a></p>` : ''}
      </div>

      <h3 style="margin: 0 0 12px 0; font-size: 15px; color: #1c1917;">Comment:</h3>
      <div style="background-color: #f5f5f4; padding: 16px; border-radius: 6px; font-style: italic; color: #57534e; line-height: 1.6; margin-bottom: 32px;">
        "${esc(comment)}"
      </div>

      <a href="${process.env.NEXT_PUBLIC_SITE_URL}/admin/reviews" style="background-color: #0c0c0b; color: #ffffff; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 14px; display: inline-block;">
        Moderate Review
      </a>
    </div>
  `;

  await deliver({
    from: sender(),
    to: adminEmail,
    subject: `New Review Requires Approval (${rating} Stars)`,
    html: generateEmailHTML(content),
  });
}

// 6. Admin: Contact Form Notification
export async function sendContactNotification(
  name: string, 
  email: string, 
  orderNumber: string, 
  message: string
) {
  const content = `
    <div style="text-align: left;">
      <h2 style="margin: 0 0 16px 0; font-size: 22px; color: #1c1917;">New Customer Inquiry</h2>
      
      <div style="background-color: #fafaf9; padding: 20px; border-radius: 8px; margin: 24px 0; border: 1px solid #e7e5e4;">
        <p style="margin: 0 0 8px 0; color: #78716c;"><strong>Name:</strong> ${esc(name)}</p>
        <p style="margin: 0 0 8px 0; color: #78716c;"><strong>Email:</strong> <a href="mailto:${esc(email)}" style="color: #2563eb;">${esc(email)}</a></p>
        <p style="margin: 0; color: #78716c;"><strong>Order Ref:</strong> ${esc(orderNumber) || 'N/A'}</p>
      </div>

      <h3 style="margin: 0 0 12px 0; font-size: 15px; color: #1c1917;">Message:</h3>
      <div style="background-color: #f5f5f4; padding: 16px; border-radius: 6px; font-style: italic; color: #57534e; line-height: 1.6;">
        "${esc(message)}"
      </div>
    </div>
  `;

  await deliver({
    from: sender('UK Sofa Shop Contact Form'),
    to: MAIL_TO_ADMIN,
    replyTo: email,
    subject: `Support Request: ${esc(name)}${orderNumber ? ` (#${esc(orderNumber)})` : ''}`,
    html: generateEmailHTML(content),
  });
}

// Add to the bottom of src/utils/email.ts

// 7. Customer: Automated Status Update Notification
//
// Returns whether the message was copied to Trustpilot's invitation service
// (delivered status, TRUSTPILOT_INVITE_BCC set), so the caller can record
// that this customer has now been asked for a review and the site's own
// review-request email does not ask a second time.
export async function sendOrderStatusUpdate(
  email: string,
  name: string,
  orderId: string,
  status: string,
  postcode: string = ''
): Promise<{ trustpilotInvited: boolean }> {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';
  const shortCode = orderId.substring(0, 8).toUpperCase();

  // Trustpilot's Automatic Feedback Service: a transactional email BCC'd to
  // this address becomes a review invitation to its To recipient, sent after
  // whatever delay is set in the Trustpilot dashboard. Only the delivered
  // email - the review should be about the sofa in the room, not the order
  // form - and only while the address is configured.
  const inviteBcc = status === 'delivered' ? trustpilotInviteBcc() : null;
  // Tracking needs both the reference and the delivery postcode. When the
  // postcode couldn't be read off the address the link still opens the page
  // with the reference filled in, and the customer types the postcode.
  const trackLink = postcode
    ? `${siteUrl}/track-order?ref=${encodeURIComponent(shortCode)}&postcode=${encodeURIComponent(postcode)}`
    : `${siteUrl}/track-order?ref=${encodeURIComponent(shortCode)}`;

  const config: Record<string, { color: string, bg: string, title: string, message: string }> = {
    processing: { color: '#2563eb', bg: '#dbeafe', title: 'Order Processing', message: 'Your furniture is currently being processed and prepared for dispatch. We ensure every piece meets our strict quality standards before it leaves.' },
    shipped: { color: '#7e22ce', bg: '#f3e8ff', title: 'Order Shipped!', message: 'Your order has left our warehouse and is on its way! Our delivery team will be in touch shortly to arrange a precise delivery time slot.' },
    delivered: {
      color: '#16a34a',
      bg: '#dcfce7',
      title: 'Order Delivered',
      // Told here so the invitation that follows is expected rather than
      // mistaken for spam.
      message: inviteBcc
        ? 'Your new furniture has been delivered. We hope it looks perfect in your home! In a few days Trustpilot will email you on our behalf to ask how it went - a line or two would help the next person decide.'
        : 'Your new furniture has been delivered. We hope it looks perfect in your home!',
    },
    cancelled: { color: '#dc2626', bg: '#fee2e2', title: 'Order Cancelled', message: 'Your order has been cancelled. If you have any questions, please contact our support team.' }
  };

  const currentConfig = config[status] || { color: '#57534e', bg: '#f5f5f4', title: 'Order Status Updated', message: 'There has been an update to your order.' };

  const content = `
    <div style="text-align: left;">
      <div style="display: inline-block; background-color: ${currentConfig.bg}; color: ${currentConfig.color}; padding: 6px 14px; border-radius: 6px; font-weight: bold; font-size: 11px; margin-bottom: 24px; letter-spacing: 0.1em; text-transform: uppercase;">
        ${esc(currentConfig.title)}
      </div>
      
      <h2 style="margin: 0 0 16px 0; font-size: 22px; color: #1c1917;">Hi ${esc(name)},</h2>
      <p style="color: #57534e; line-height: 1.6; font-size: 15px;">${currentConfig.message}</p>
      
      <div style="background-color: #fafaf9; border-left: 3px solid ${currentConfig.color}; padding: 20px; margin: 24px 0;">
        <p style="margin: 0 0 4px 0; color: #78716c; font-size: 11px; text-transform: uppercase; font-weight: bold;">Order Reference</p>
        <p style="margin: 0; font-size: 20px; font-weight: bold; font-family: monospace;">${shortCode}</p>
      </div>

      <a href="${trackLink}" style="background-color: #0c0c0b; color: #ffffff; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 14px; display: inline-block; margin-top: 16px;">
        Track Your Order Online
      </a>
    </div>
  `;

  await deliver({
    from: sender(),
    // Name and address together on the invited email: Trustpilot takes the
    // customer's name from the To header, and greets them by it.
    to: inviteBcc && name.trim() ? `"${name.trim().replace(/["<>]/g, '')}" <${email}>` : email,
    ...(inviteBcc ? { bcc: inviteBcc } : {}),
    subject: `Update: ${esc(currentConfig.title)} (#${shortCode})`,
    html: generateEmailHTML(content),
  });

  return { trustpilotInvited: Boolean(inviteBcc) };
}

// 8. Admin: Order Status Update Notification (With WhatsApp Integration)
export async function sendAdminOrderStatusNotification(
  customerName: string,
  customerPhone: string,
  shortCode: string,
  status: string
) {
  const adminEmail = process.env.ADMIN_EMAIL;
  if (!adminEmail) return;


  // Generate a dynamic WhatsApp message based on the status
  let waMessageText = '';
  let title = '';

  switch (status) {
    case 'processing':
      title = 'Order Processing';
      waMessageText = `Dear ${esc(customerName)}, your order (#${shortCode}) is now being processed! We are preparing your items for dispatch.`;
      break;
    case 'shipped':
      title = 'Order Shipped';
      waMessageText = `Dear ${esc(customerName)}, great news! Your order (#${shortCode}) has been shipped and is on its way to you.`;
      break;
    case 'delivered':
      title = 'Order Delivered';
      // The review ask rides on the delivered message, because for most
      // customers - the WhatsApp ones with no email on the order - this
      // message is the only invitation they will get.
      waMessageText = `Dear ${esc(customerName)}, your order (#${shortCode}) has been successfully delivered! We hope you love your new furniture. If you have a minute, a quick review would mean a lot to us: ${trustpilotInviteLink()}`;
      break;
    case 'cancelled':
      title = 'Order Cancelled';
      waMessageText = `Dear ${esc(customerName)}, this is an update regarding your order (#${shortCode}). It has been marked as cancelled. Please let us know if you have any questions.`;
      break;
    default:
      title = 'Order Status Updated';
      waMessageText = `Dear ${esc(customerName)}, there has been an update regarding your order (#${shortCode}).`;
  }

  const waUrl = whatsAppLink(customerPhone, waMessageText);

  const content = `
    <div style="text-align: left;">
      <div style="display: inline-block; background-color: #f3e8ff; color: #7e22ce; padding: 6px 14px; border-radius: 6px; font-weight: bold; font-size: 11px; margin-bottom: 24px; letter-spacing: 0.1em; text-transform: uppercase;">
        Action Required: Notify Customer
      </div>
      
      <h2 style="margin: 0 0 16px 0; font-size: 22px; color: #1c1917;">Update Customer via WhatsApp</h2>
      <p style="color: #57534e; line-height: 1.6; font-size: 15px;">
        The status for order <strong>#${shortCode}</strong> has been changed to <strong>${status.toUpperCase()}</strong>. 
        Please use the button below to instantly notify <strong>${esc(customerName)}</strong> via WhatsApp.
      </p>
      
      <div style="background-color: #fafaf9; border-left: 3px solid #7e22ce; padding: 20px; margin: 24px 0;">
        <p style="margin: 0 0 4px 0; color: #78716c; font-size: 11px; text-transform: uppercase; font-weight: bold;">Order Reference</p>
        <p style="margin: 0 0 16px 0; font-size: 20px; font-weight: bold; font-family: monospace;">${shortCode}</p>
        
        <p style="margin: 0 0 4px 0; color: #78716c; font-size: 11px; text-transform: uppercase; font-weight: bold;">Customer Details</p>
        <p style="margin: 0; font-size: 16px; font-weight: bold;">${esc(customerName)} (${esc(customerPhone)})</p>
      </div>

      ${waUrl ? `<a href="${waUrl}" style="background-color: #25D366; color: #ffffff; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 14px; display: inline-block; margin-top: 16px;">Message Customer on WhatsApp</a>` : `<p style="margin-top: 16px; color: #a8a29e; font-size: 12px;">No WhatsApp button: that phone number is not a UK mobile.</p>`}
    </div>
  `;

  await deliver({
    from: sender(),
    to: adminEmail,
    subject: `Notify Customer: Order ${title} (#${shortCode})`,
    html: generateEmailHTML(content),
  });
}
// ─────────────────────────────────────────────────────────────────────────────
// 9. Newsletter: double opt-in confirmation
//
// This is the only email a pending subscriber ever receives. Nothing else is
// sent until they click the link, which is what makes the opt-in genuine.
// ─────────────────────────────────────────────────────────────────────────────
export async function sendNewsletterConfirmation(email: string, confirmToken: string) {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';
  const confirmLink = `${siteUrl}/newsletter/confirm?token=${encodeURIComponent(confirmToken)}`;

  const content = `
    <div style="text-align: center;">
      <div style="display: inline-block; background-color: #fef9f0; color: #d4871a; padding: 6px 14px; border-radius: 6px; font-weight: bold; font-size: 11px; margin-bottom: 24px; letter-spacing: 0.1em; text-transform: uppercase;">
        One Last Step
      </div>

      <h2 style="margin: 0 0 16px 0; font-size: 24px; color: #1c1917;">Confirm your subscription</h2>
      <p style="color: #57534e; line-height: 1.7; font-size: 15px; margin-bottom: 28px;">
        Someone entered this address on uksofashop.co.uk. If that was you, tap the button
        below and we'll add you to the list. If it wasn't, just ignore this email — nothing
        will happen and we won't contact you again.
      </p>

      <a href="${confirmLink}" style="background-color: #d4871a; color: #ffffff; padding: 16px 32px; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 16px; display: inline-block;">
        Yes, subscribe me
      </a>

      <p style="color: #a8a29e; line-height: 1.6; font-size: 12px; margin-top: 28px;">
        Occasional emails about new arrivals and offers. No more than a couple a month,
        and you can unsubscribe from any of them in one click.
      </p>
    </div>
  `;

  await deliver({
    from: sender(),
    to: email,
    subject: 'Please confirm your subscription',
    html: generateEmailHTML(content),
  });
}

/**
 * Footer for any future marketing email. Every message sent to this list must
 * carry it - that is what makes "unsubscribe in one click" true, and it's a
 * legal requirement under PECR, not a courtesy.
 */
export function newsletterUnsubscribeFooter(unsubscribeToken: string) {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';
  const link = `${siteUrl}/newsletter/unsubscribe?token=${encodeURIComponent(unsubscribeToken)}`;
  return `
    <p style="margin: 24px 0 0 0; color: #a8a29e; font-size: 11px; text-align: center; line-height: 1.6;">
      You're receiving this because you confirmed your subscription at uksofashop.co.uk.<br />
      <a href="${link}" style="color: #a8a29e; text-decoration: underline;">Unsubscribe in one click</a>
    </p>
  `;
}

/**
 * Post-delivery review request.
 *
 * Sent a few days after delivery, not the same hour, so the customer has
 * actually sat on the sofa. Each product carries its own signed link, so a
 * guest can leave a review without making an account and the review is tied to
 * the order it came from - which is what makes the "Verified Buyer" badge
 * true rather than decorative.
 */
export async function sendReviewRequest(
  email: string,
  customerName: string,
  shortCode: string,
  items: { productTitle: string; imageUrl: string | null; reviewLink: string }[],
) {
  const firstName = (customerName || '').trim().split(/\s+/)[0] || 'there'

  const productRows = items
    .map(
      item => `
      <tr>
        <td style="padding: 12px 0; border-bottom: 1px solid #f0ede8;">
          <table role="presentation" style="width: 100%; border-collapse: collapse;">
            <tr>
              ${item.imageUrl ? `
              <td style="width: 64px; padding-right: 14px; vertical-align: middle;">
                <img src="${esc(item.imageUrl)}" width="64" height="64" alt="" style="width: 64px; height: 64px; object-fit: cover; border-radius: 8px; display: block;" />
              </td>` : ''}
              <td style="vertical-align: middle;">
                <p style="margin: 0 0 8px 0; font-size: 15px; font-weight: 600; color: #1c1917;">${esc(item.productTitle)}</p>
                <a href="${item.reviewLink}" style="background-color: #d4871a; color: #ffffff; padding: 9px 18px; text-decoration: none; border-radius: 6px; font-weight: bold; font-size: 13px; display: inline-block;">
                  Leave a review
                </a>
              </td>
            </tr>
          </table>
        </td>
      </tr>`,
    )
    .join('')

  const content = `
    <div style="text-align: left;">
      <div style="display: inline-block; background-color: #fef9f0; color: #d4871a; padding: 6px 14px; border-radius: 6px; font-weight: bold; font-size: 11px; margin-bottom: 24px; letter-spacing: 0.1em; text-transform: uppercase;">
        Order ${esc(shortCode)}
      </div>

      <h2 style="margin: 0 0 16px 0; font-size: 24px; color: #1c1917;">How is it settling in, ${esc(firstName)}?</h2>

      <p style="color: #57534e; line-height: 1.7; font-size: 15px; margin-bottom: 8px;">
        Your order was delivered a few days ago, so you have had a chance to sit on it
        properly. If you have a minute, we would really value your honest thoughts.
      </p>
      <p style="color: #57534e; line-height: 1.7; font-size: 15px; margin-bottom: 24px;">
        We are a new shop, so every review genuinely helps the next person decide.
        No account needed — the links below know who you are.
      </p>

      <table role="presentation" style="width: 100%; border-collapse: collapse;">
        ${productRows}
      </table>

      <p style="color: #a8a29e; line-height: 1.6; font-size: 12px; margin-top: 28px;">
        If something is not right with your order, please reply to this email or call
        us on ${PHONE_DISPLAY} instead — we would much rather fix it than read about it.
      </p>
    </div>
  `

  await deliver({
    from: sender(),
    to: email,
    subject: `How is your new sofa, ${firstName}?`,
    html: generateEmailHTML(content),
  })
}

// ─────────────────────────────────────────────────────────────────────────────
//  FREE FABRIC SAMPLES
// ─────────────────────────────────────────────────────────────────────────────

interface SwatchLine {
  code: string
  name: string
  collection: string
}

/** The codes as one line, which is the whole picking list: "CH04, PL17, MB08". */
const swatchCodes = (items: SwatchLine[]) => items.map(i => i.code).join(', ')

const swatchRows = (items: SwatchLine[]) =>
  items
    .map(
      i => `
      <tr>
        <td style="padding: 10px 0; border-bottom: 1px solid #e7e5e4; color: #1c1917; font-weight: 600;">${esc(i.collection)} ${esc(i.name)}</td>
        <td style="padding: 10px 0; border-bottom: 1px solid #e7e5e4; text-align: right; color: #78716c; font-family: monospace;">${esc(i.code)}</td>
      </tr>`,
    )
    .join('')

export async function sendSwatchConfirmation(
  email: string,
  name: string,
  items: SwatchLine[],
) {
  const content = `
    <div style="text-align: left;">
      <h2 style="margin: 0 0 16px 0; font-size: 22px; color: #1c1917;">Your samples are on their way</h2>
      <p style="margin: 0 0 20px 0; color: #57534e; line-height: 1.6;">
        Thanks ${esc(name)} — we're putting these in the post to you. There's nothing to pay
        and nothing to send back.
      </p>

      <table style="width: 100%; border-collapse: collapse; margin: 24px 0;">
        ${swatchRows(items)}
      </table>

      <p style="margin: 0 0 20px 0; color: #57534e; line-height: 1.6;">
        Screens can't be trusted with colour, which is exactly why we send these. Hold them
        against your own walls and floor, in daylight and at night, before you decide.
      </p>

      <div style="background-color: #fefaf3; padding: 16px; border-radius: 8px; border: 1px solid #f3e2c7;">
        <p style="margin: 0; color: #57534e; line-height: 1.6; font-size: 14px;">
          Once you've chosen, we build the sofa to order in that fabric. Give us a ring on
          ${esc(PHONE_DISPLAY)} or just reply to this email and we'll take it from there.
        </p>
      </div>
    </div>
  `

  await deliver({
    from: sender(),
    to: email,
    subject: 'Your free fabric samples',
    html: generateEmailHTML(content),
  })
}

export async function sendAdminSwatchNotification(
  name: string,
  email: string,
  phone: string,
  postcode: string,
  address: string,
  items: SwatchLine[],
) {
  const content = `
    <div style="text-align: left;">
      <h2 style="margin: 0 0 4px 0; font-size: 22px; color: #1c1917;">Swatch request</h2>
      <p style="margin: 0 0 24px 0; color: #78716c; font-size: 14px;">Pull these and post them.</p>

      <div style="background-color: #1c1917; padding: 20px; border-radius: 8px; margin: 0 0 24px 0; text-align: center;">
        <p style="margin: 0 0 6px 0; color: #a8a29e; font-size: 12px; text-transform: uppercase; letter-spacing: 2px;">Picking list</p>
        <p style="margin: 0; color: #ffffff; font-size: 24px; font-family: monospace; letter-spacing: 2px;">${esc(swatchCodes(items))}</p>
      </div>

      <table style="width: 100%; border-collapse: collapse; margin: 0 0 24px 0;">
        ${swatchRows(items)}
      </table>

      <div style="background-color: #fafaf9; padding: 20px; border-radius: 8px; border: 1px solid #e7e5e4;">
        <p style="margin: 0 0 8px 0; color: #78716c;"><strong>Name:</strong> ${esc(name)}</p>
        <p style="margin: 0 0 8px 0; color: #78716c;"><strong>Email:</strong> <a href="mailto:${esc(email)}" style="color: #2563eb;">${esc(email)}</a></p>
        <p style="margin: 0 0 8px 0; color: #78716c;"><strong>Phone:</strong> ${esc(phone) || 'Not given'}</p>
        <p style="margin: 0; color: #78716c;"><strong>Post to:</strong> ${esc(address)}, ${esc(postcode)}</p>
      </div>
    </div>
  `

  await deliver({
    from: sender('UK Sofa Shop Swatches'),
    to: MAIL_TO_ADMIN,
    replyTo: email,
    subject: `Swatches: ${esc(swatchCodes(items))} to ${esc(postcode)}`,
    html: generateEmailHTML(content),
  })
}

// ─────────────────────────────────────────────────────────────────────────────
//  CHECKOUT REMINDER
// ─────────────────────────────────────────────────────────────────────────────

/**
 * The reminder a shopper asked for on the checkout, sent from the admin leads
 * page with one tap. Same words as the WhatsApp version, laid out as an email,
 * with the two ways back: WhatsApp first, because that is where the sale gets
 * made, and the checkout itself, which still holds their basket on the phone
 * they shopped on.
 *
 * The plain-text part is the WhatsApp message with a sign-off, so a client
 * that strips HTML still shows something that reads as written by a person.
 *
 * The shop mailbox and the owner's Gmail are BCC'd, because SMTP delivers
 * and nothing files a copy in Sent - so this is the only record of what went
 * out, and it lands in the inbox exactly as the customer saw it.
 */
export async function sendCheckoutReminder(email: string, basket: unknown) {
  const lines = recoveryBasketLines(basket)
  const total = recoveryBasketTotal(lines)
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'

  const rows = lines
    .map(
      l => `
      <tr>
        <td style="padding: 10px 0; border-bottom: 1px solid #e7e5e4; color: #1c1917;">
          <span style="font-weight: 600;">${l.quantity > 1 ? `${l.quantity} × ` : ''}${esc(l.title)}</span>
          ${l.detail ? `<br><span style="color: #78716c; font-size: 13px;">${esc(l.detail)}</span>` : ''}
        </td>
        <td style="padding: 10px 0; border-bottom: 1px solid #e7e5e4; text-align: right; color: #1c1917; white-space: nowrap; vertical-align: top;">
          ${l.lineTotal !== null ? gbp(l.lineTotal) : ''}
        </td>
      </tr>`,
    )
    .join('')

  // What their WhatsApp opens with - so the reply arrives already saying
  // which sofa it is about.
  const waMessage = `Hi, I was looking at ${lines
    .map(l => `${l.title}${l.detail ? ` (${l.detail})` : ''}`)
    .join(' and ') || 'a sofa'} on your website.`

  const content = `
    <div style="text-align: left;">
      <h2 style="margin: 0 0 16px 0; font-size: 22px; color: #1c1917;">
        Need any help finishing your order?
      </h2>
      <p style="margin: 0 0 20px 0; color: #57534e; line-height: 1.6;">
        You asked us to remind you if you didn't finish your order on uksofashop.co.uk
        ${lines.length > 0 ? '– here is what you had picked out:' : '.'}
      </p>

      ${lines.length > 0 ? `
      <table style="width: 100%; border-collapse: collapse; margin: 0 0 8px 0;">
        ${rows}
        ${total !== null ? `
        <tr>
          <td style="padding: 12px 0 0 0; color: #1c1917; font-weight: bold;">Total</td>
          <td style="padding: 12px 0 0 0; text-align: right; color: #d4871a; font-size: 18px; font-weight: bold; white-space: nowrap;">${gbp(total)}</td>
        </tr>` : ''}
      </table>` : ''}

      <div style="margin: 20px 0; padding: 12px 14px; border-radius: 8px; background: #fef9f0; border: 1px solid #f5dfbd; color: #57534e; font-size: 13px; line-height: 1.5;">
        <strong style="color:#1c1917;">Free UK Mainland ground-floor delivery</strong>
        <span style="color:#d6b47b;"> &nbsp;·&nbsp; </span>
        <strong style="color:#1c1917;">Pay on delivery</strong>
      </div>

      <p style="margin: 20px 0 24px 0; color: #57534e; line-height: 1.6;">
        If you&apos;d like to go ahead, we can confirm availability and delivery, or answer anything you&apos;d like to check first.
      </p>

      <a href="${whatsAppHref(waMessage)}" style="background-color: #25D366; color: #ffffff; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 14px; display: inline-block; margin: 0 8px 8px 0;">
        Chat on WhatsApp
      </a>
      <a href="${siteUrl}/checkout" style="background-color: #1c1917; color: #ffffff; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 14px; display: inline-block; margin: 0 0 8px 0;">
        Return to checkout
      </a>

      <p style="margin: 24px 0 0 0; color: #a8a29e; line-height: 1.6; font-size: 12px;">
        You asked for this reminder on our checkout. If you'd rather not hear from us, just reply and say so.
        Your basket is saved in the browser you used to shop, so the checkout button works best on that device.
        Or call us on ${PHONE_DISPLAY}.
      </p>
    </div>
  `

  await deliver({
    from: sender(),
    to: email,
    bcc: [SUPPORT_EMAIL, OWNER_GMAIL],
    subject: recoveryReminderEmail(basket).subject,
    text: recoveryReminderEmail(basket).body,
    html: generateEmailHTML(content),
  })
}
