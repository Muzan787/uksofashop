import nodemailer from 'nodemailer';

// 1. Initialize the Gmail Transporter
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_APP_PASSWORD,
  },
});

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
        Vantage<span style="color: #d4871a;"> Group LTD</span>
      </h1>
    </div>
    
    <div style="padding: 36px 28px;">
      ${content}
    </div>
    
    <div style="background-color: #fafaf9; padding: 24px; text-align: center; border-top: 1px solid #e7e5e4;">
      <p style="margin: 0; color: #78716c; font-size: 12px;">Need help? Reply to this email directly.</p>
      <p style="margin: 8px 0 0 0; color: #a8a29e; font-size: 11px;">© ${new Date().getFullYear()} UK SofaShop. All rights reserved.</p>
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
  total: number
) {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';
  const confirmLink = `${siteUrl}/confirm-order/${fullOrderId}`;

  const content = `
    <div style="text-align: center;">
      <div style="display: inline-block; background-color: #0c0c0b; color: #d4871a; padding: 6px 14px; border-radius: 6px; font-weight: bold; font-size: 11px; margin-bottom: 24px; letter-spacing: 0.1em; text-transform: uppercase;">
        Action Required
      </div>
      
      <h2 style="margin: 0 0 16px 0; font-size: 24px; color: #1c1917;">Almost there, ${name}!</h2>
      <p style="color: #57534e; line-height: 1.6; font-size: 15px; margin-bottom: 32px;">
        We have received your Cash on Delivery request. To proceed with your order and secure your inventory, please verify your details below.
      </p>
      
      <div style="background-color: #fafaf9; border: 1px solid #e7e5e4; padding: 24px; border-radius: 10px; margin-bottom: 32px;">
        <p style="margin: 0 0 4px 0; color: #78716c; font-size: 11px; text-transform: uppercase; letter-spacing: 0.1em; font-weight: bold;">Order Reference</p>
        <p style="margin: 0 0 24px 0; font-size: 24px; font-weight: bold; font-family: monospace; letter-spacing: 2px; color: #1c1917;">${shortCode}</p>
        
        <p style="margin: 0 0 4px 0; color: #78716c; font-size: 11px; text-transform: uppercase; letter-spacing: 0.1em; font-weight: bold;">Total to Pay on Delivery</p>
        <p style="margin: 0; font-size: 24px; font-weight: bold; color: #d4871a;">£${total.toFixed(2)}</p>
      </div>

      <a href="${confirmLink}" style="background-color: #0c0c0b; color: #ffffff; padding: 16px 32px; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 16px; display: inline-block;">
        Review & Confirm Order
      </a>
    </div>
  `;

  await transporter.sendMail({
    from: `"UK SofaShop" <${process.env.EMAIL_USER}>`,
    to: email,
    subject: `Action Required: Confirm Your Order - (#${shortCode})`,
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
  totalAmount: number
) {
  const adminEmail = process.env.ADMIN_EMAIL;
  if (!adminEmail) return;

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';
  const confirmLink = `${siteUrl}/confirm-order/${fullOrderId}`;
  
  // Clean phone number (removes spaces/dashes) so WhatsApp API can read it
  let cleaned = customerPhone.replace(/[^0-9+]/g, '');
  if (cleaned.startsWith('0')) {
    cleaned = '44' + cleaned.substring(1) // Replace leading 0 with UK code
  } else if (!cleaned.startsWith('44')) {
    cleaned = '44' + cleaned // Prepend UK code if missing
  }
  const waMessage = encodeURIComponent(`Please confirm your order: ${confirmLink}`);
  const waUrl = `https://wa.me/${cleaned}?text=${waMessage}`;

  const content = `
    <div style="text-align: left;">
      <div style="display: inline-block; background-color: #dbeafe; color: #1e40af; padding: 6px 14px; border-radius: 6px; font-weight: bold; font-size: 11px; margin-bottom: 24px; letter-spacing: 0.1em; text-transform: uppercase;">
        New Order Alert
      </div>
      
      <h2 style="margin: 0 0 16px 0; font-size: 22px; color: #1c1917;">Dear Admin, you received another order!</h2>
      <p style="color: #57534e; line-height: 1.6; font-size: 15px;">
        <strong>${customerName}</strong> (${customerEmail}) has submitted a new Cash on Delivery order.
      </p>
      
      <div style="background-color: #fafaf9; border-left: 3px solid #3b82f6; padding: 20px; margin: 24px 0;">
        <p style="margin: 0 0 4px 0; color: #78716c; font-size: 11px; text-transform: uppercase; font-weight: bold;">Order Reference</p>
        <p style="margin: 0 0 16px 0; font-size: 20px; font-weight: bold; font-family: monospace;">${shortCode}</p>
        
        <p style="margin: 0 0 4px 0; color: #78716c; font-size: 11px; text-transform: uppercase; font-weight: bold;">Customer Phone</p>
        <p style="margin: 0 0 16px 0; font-size: 16px; font-weight: bold;">${customerPhone}</p>
        
        <p style="margin: 0 0 4px 0; color: #78716c; font-size: 11px; text-transform: uppercase; font-weight: bold;">Total Value</p>
        <p style="margin: 0; font-size: 20px; font-weight: bold; color: #d4871a;">£${totalAmount.toFixed(2)}</p>
      </div>

      <a href="${waUrl}" style="background-color: #25D366; color: #ffffff; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 14px; display: inline-block; margin-top: 16px;">
        Ask Customer to Confirm Order
      </a>
      
      <div style="margin-top: 32px; text-align: center;">
        <a href="${siteUrl}/admin/orders" style="color: #a8a29e; font-size: 12px; text-decoration: underline;">
          Or view this order in the Admin Dashboard
        </a>
      </div>
    </div>
  `;

  await transporter.sendMail({
    from: `"UK SofaShop" <${process.env.EMAIL_USER}>`,
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
        <p style="margin: 0 0 8px 0; color: #78716c;"><strong>Customer:</strong> ${reviewerEmail}</p>
        <p style="margin: 0 0 8px 0; color: #78716c;"><strong>Rating:</strong> <span style="color: #d4871a; font-weight: bold;">${rating} / 5 Stars</span></p>
        ${imageUrl ? `<p style="margin: 0; color: #78716c;"><strong>Image:</strong> <a href="${imageUrl}" style="color: #2563eb;">View Uploaded Image</a></p>` : ''}
      </div>

      <h3 style="margin: 0 0 12px 0; font-size: 15px; color: #1c1917;">Comment:</h3>
      <div style="background-color: #f5f5f4; padding: 16px; border-radius: 6px; font-style: italic; color: #57534e; line-height: 1.6; margin-bottom: 32px;">
        "${comment}"
      </div>

      <a href="${process.env.NEXT_PUBLIC_SITE_URL}/admin/reviews" style="background-color: #0c0c0b; color: #ffffff; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 14px; display: inline-block;">
        Moderate Review
      </a>
    </div>
  `;

  await transporter.sendMail({
    from: `"UK SofaShop" <${process.env.EMAIL_USER}>`,
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
        <p style="margin: 0 0 8px 0; color: #78716c;"><strong>Name:</strong> ${name}</p>
        <p style="margin: 0 0 8px 0; color: #78716c;"><strong>Email:</strong> <a href="mailto:${email}" style="color: #2563eb;">${email}</a></p>
        <p style="margin: 0; color: #78716c;"><strong>Order Ref:</strong> ${orderNumber || 'N/A'}</p>
      </div>

      <h3 style="margin: 0 0 12px 0; font-size: 15px; color: #1c1917;">Message:</h3>
      <div style="background-color: #f5f5f4; padding: 16px; border-radius: 6px; font-style: italic; color: #57534e; line-height: 1.6;">
        "${message}"
      </div>
    </div>
  `;

  await transporter.sendMail({
    from: `"Contact Form" <${process.env.EMAIL_USER}>`,
    to: process.env.EMAIL_USER,
    replyTo: email,
    subject: `Support Request: ${name}${orderNumber ? ` (#${orderNumber})` : ''}`,
    html: generateEmailHTML(content),
  });
}

// Add to the bottom of src/utils/email.ts

// 7. Customer: Automated Status Update Notification
export async function sendOrderStatusUpdate(
  email: string, 
  name: string, 
  orderId: string, 
  status: string
) {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';
  const shortCode = orderId.substring(0, 8).toUpperCase();
  const trackLink = `${siteUrl}/track-order?code=${shortCode}`;

  const config: Record<string, { color: string, bg: string, title: string, message: string }> = {
    processing: { color: '#2563eb', bg: '#dbeafe', title: 'Order Processing', message: 'Your furniture is currently being processed and prepared for dispatch. We ensure every piece meets our strict quality standards before it leaves.' },
    shipped: { color: '#7e22ce', bg: '#f3e8ff', title: 'Order Shipped!', message: 'Your order has left our warehouse and is on its way! Our delivery team will be in touch shortly to arrange a precise delivery time slot.' },
    delivered: { color: '#16a34a', bg: '#dcfce7', title: 'Order Delivered', message: 'Your new furniture has been delivered. We hope it looks perfect in your home!' },
    cancelled: { color: '#dc2626', bg: '#fee2e2', title: 'Order Cancelled', message: 'Your order has been cancelled. If you have any questions, please contact our support team.' }
  };

  const currentConfig = config[status] || { color: '#57534e', bg: '#f5f5f4', title: 'Order Status Updated', message: 'There has been an update to your order.' };

  const content = `
    <div style="text-align: left;">
      <div style="display: inline-block; background-color: ${currentConfig.bg}; color: ${currentConfig.color}; padding: 6px 14px; border-radius: 6px; font-weight: bold; font-size: 11px; margin-bottom: 24px; letter-spacing: 0.1em; text-transform: uppercase;">
        ${currentConfig.title}
      </div>
      
      <h2 style="margin: 0 0 16px 0; font-size: 22px; color: #1c1917;">Hi ${name},</h2>
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

  await transporter.sendMail({
    from: `"UK SofaShop" <${process.env.EMAIL_USER}>`,
    to: email,
    subject: `Update: ${currentConfig.title} (#${shortCode})`,
    html: generateEmailHTML(content),
  });
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

  let cleaned = customerPhone.replace(/[^0-9+]/g, '');
  if (cleaned.startsWith('0')) {
    cleaned = '44' + cleaned.substring(1) // Replace leading 0 with UK code
  } else if (!cleaned.startsWith('44')) {
    cleaned = '44' + cleaned // Prepend UK code if missing
  }

  // Generate a dynamic WhatsApp message based on the status
  let waMessageText = '';
  let title = '';

  switch (status) {
    case 'processing':
      title = 'Order Processing';
      waMessageText = `Dear ${customerName}, your order (#${shortCode}) is now being processed! We are preparing your items for dispatch.`;
      break;
    case 'shipped':
      title = 'Order Shipped';
      waMessageText = `Dear ${customerName}, great news! Your order (#${shortCode}) has been shipped and is on its way to you.`;
      break;
    case 'delivered':
      title = 'Order Delivered';
      waMessageText = `Dear ${customerName}, your order (#${shortCode}) has been successfully delivered! We hope you love your new furniture.`;
      break;
    case 'cancelled':
      title = 'Order Cancelled';
      waMessageText = `Dear ${customerName}, this is an update regarding your order (#${shortCode}). It has been marked as cancelled. Please let us know if you have any questions.`;
      break;
    default:
      title = 'Order Status Updated';
      waMessageText = `Dear ${customerName}, there has been an update regarding your order (#${shortCode}).`;
  }

  const waMessage = encodeURIComponent(waMessageText);
  const waUrl = `https://wa.me/${cleaned}?text=${waMessage}`;

  const content = `
    <div style="text-align: left;">
      <div style="display: inline-block; background-color: #f3e8ff; color: #7e22ce; padding: 6px 14px; border-radius: 6px; font-weight: bold; font-size: 11px; margin-bottom: 24px; letter-spacing: 0.1em; text-transform: uppercase;">
        Action Required: Notify Customer
      </div>
      
      <h2 style="margin: 0 0 16px 0; font-size: 22px; color: #1c1917;">Update Customer via WhatsApp</h2>
      <p style="color: #57534e; line-height: 1.6; font-size: 15px;">
        The status for order <strong>#${shortCode}</strong> has been changed to <strong>${status.toUpperCase()}</strong>. 
        Please use the button below to instantly notify <strong>${customerName}</strong> via WhatsApp.
      </p>
      
      <div style="background-color: #fafaf9; border-left: 3px solid #7e22ce; padding: 20px; margin: 24px 0;">
        <p style="margin: 0 0 4px 0; color: #78716c; font-size: 11px; text-transform: uppercase; font-weight: bold;">Order Reference</p>
        <p style="margin: 0 0 16px 0; font-size: 20px; font-weight: bold; font-family: monospace;">${shortCode}</p>
        
        <p style="margin: 0 0 4px 0; color: #78716c; font-size: 11px; text-transform: uppercase; font-weight: bold;">Customer Details</p>
        <p style="margin: 0; font-size: 16px; font-weight: bold;">${customerName} (${customerPhone})</p>
      </div>

      <a href="${waUrl}" style="background-color: #25D366; color: #ffffff; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 14px; display: inline-block; margin-top: 16px;">
        Message Customer on WhatsApp
      </a>
    </div>
  `;

  await transporter.sendMail({
    from: `"UK SofaShop" <${process.env.EMAIL_USER}>`,
    to: adminEmail,
    subject: `Notify Customer: Order ${title} (#${shortCode})`,
    html: generateEmailHTML(content),
  });
}