import nodemailer from 'nodemailer';

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_APP_PASSWORD,
  },
});

// --- BASE HTML WRAPPER FOR BRAND CONSISTENCY ---
const generateEmailHTML = (content: string) => `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="background-color: #f5f5f4; font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; padding: 20px; margin: 0; color: #1c1917;">
  <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.05);">
    
    <div style="background-color: #1c1917; padding: 24px; text-align: center;">
      <h1 style="color: #ffffff; margin: 0; font-size: 28px; letter-spacing: -0.5px; font-weight: 800;">
        UK Sofa<span style="color: #d97706;">Shop</span>
      </h1>
    </div>
    
    <div style="padding: 32px 24px;">
      ${content}
    </div>
    
    <div style="background-color: #fafaf9; padding: 24px; text-align: center; border-top: 1px solid #e7e5e4;">
      <p style="margin: 0; color: #78716c; font-size: 13px;">Need help? Reply to this email or call <strong>0800 123 4567</strong></p>
      <p style="margin: 10px 0 0 0; color: #a8a29e; font-size: 12px;">© ${new Date().getFullYear()} UK Sofa Shop. All rights reserved.</p>
      <p style="margin: 5px 0 0 0; color: #a8a29e; font-size: 12px;">123 Furniture Way, London, SW1A 1AA</p>
    </div>

  </div>
</body>
</html>
`;

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
      <div style="display: inline-block; background-color: #fef3c7; color: #b45309; padding: 8px 16px; border-radius: 20px; font-weight: bold; font-size: 14px; margin-bottom: 24px; letter-spacing: 0.5px; text-transform: uppercase;">
        Action Required
      </div>
      
      <h2 style="margin-top: 0; font-size: 24px;">Almost there, ${name}!</h2>
      <p style="color: #57534e; line-height: 1.6; font-size: 16px;">We have received your Cash on Delivery request. To proceed with your order and secure your inventory, we need you to quickly verify your details.</p>
      
      <div style="background-color: #fafaf9; border: 1px solid #e7e5e4; padding: 24px; border-radius: 12px; margin: 32px 0;">
        <p style="margin: 0; color: #78716c; font-size: 12px; text-transform: uppercase; letter-spacing: 1px;">Order Reference</p>
        <p style="margin: 5px 0 24px 0; font-size: 28px; font-weight: bold; font-family: monospace; letter-spacing: 2px; color: #1c1917;">${shortCode}</p>
        
        <p style="margin: 0; color: #78716c; font-size: 12px; text-transform: uppercase; letter-spacing: 1px;">Total to Pay on Delivery</p>
        <p style="margin: 5px 0 0 0; font-size: 28px; font-weight: bold; color: #d97706;">£${total.toFixed(2)}</p>
      </div>

      <a href="${confirmLink}" style="background-color: #1c1917; color: #ffffff; padding: 16px 36px; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 18px; display: inline-block; transition: background-color 0.2s;">
        Review & Confirm Order
      </a>
      
      <p style="margin-top: 32px; font-size: 13px; color: #a8a29e;">If you did not place this order, no further action is required and you can safely ignore this email.</p>
    </div>
  `;

  const mailOptions = {
    from: `"UK Sofa Shop" <${process.env.EMAIL_USER}>`,
    to: email,
    subject: `Action Required: Confirm Your Order - (#${shortCode})`,
    html: generateEmailHTML(content),
  };

  await transporter.sendMail(mailOptions);
}

export async function sendOrderStatusUpdate(
  email: string, 
  name: string, 
  orderId: string, 
  status: string
) {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';
  const shortCode = orderId.substring(0, 8).toUpperCase();
  const trackLink = `${siteUrl}/track-order?code=${shortCode}`;

  // Configure templates based on the specific status
  const config: Record<string, { color: string, bg: string, title: string, message: string }> = {
    confirmed: {
      color: '#059669', // Emerald
      bg: '#d1fae5',
      title: 'Order Confirmed',
      message: 'Great news! Your order has been successfully confirmed. Our warehouse team is now preparing your items.',
    },
    processing: {
      color: '#2563eb', // Blue
      bg: '#dbeafe',
      title: 'Order Processing',
      message: 'Your furniture is currently being processed and prepared for dispatch. We ensure every piece meets our strict quality standards before it leaves.',
    },
    shipped: {
      color: '#4f46e5', // Indigo
      bg: '#e0e7ff',
      title: 'Order Shipped!',
      message: 'Your order has left our warehouse and is on its way! Our delivery team will be in touch shortly to arrange a precise delivery time slot.',
    },
    delivered: {
      color: '#16a34a', // Green
      bg: '#dcfce7',
      title: 'Order Delivered',
      message: 'Your new furniture has been delivered. We hope it looks perfect in your home! If you have a moment, we would love to hear your feedback on our website.',
    },
    cancelled: {
      color: '#dc2626', // Red
      bg: '#fee2e2',
      title: 'Order Cancelled',
      message: 'Your order has been cancelled. If you have any questions, wish to reinstate this order, or believe this was an error, please contact our support team.',
    }
  };

  // Fallback in case of an unknown status
  const currentConfig = config[status] || {
    color: '#57534e',
    bg: '#f5f5f4',
    title: 'Order Status Updated',
    message: 'There has been an update to your order.',
  };

  const content = `
    <div style="text-align: left;">
      <div style="display: inline-block; background-color: ${currentConfig.bg}; color: ${currentConfig.color}; padding: 8px 16px; border-radius: 20px; font-weight: bold; font-size: 14px; margin-bottom: 24px; letter-spacing: 0.5px; text-transform: uppercase;">
        ${currentConfig.title}
      </div>
      
      <h2 style="margin-top: 0; font-size: 22px;">Hi ${name},</h2>
      <p style="color: #57534e; line-height: 1.6; font-size: 16px;">${currentConfig.message}</p>
      
      <div style="background-color: #fafaf9; border-left: 4px solid ${currentConfig.color}; padding: 16px 20px; margin: 24px 0;">
        <p style="margin: 0; color: #78716c; font-size: 13px; text-transform: uppercase;">Order Reference</p>
        <p style="margin: 4px 0 0 0; font-size: 20px; font-weight: bold; font-family: monospace; letter-spacing: 1px;">${shortCode}</p>
      </div>

      ${status !== 'cancelled' && status !== 'delivered' ? `
        <div style="margin-top: 32px;">
          <a href="${trackLink}" style="background-color: #1c1917; color: #ffffff; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 16px; display: inline-block;">
            Track Your Order
          </a>
        </div>
      ` : ''}
    </div>
  `;

  const mailOptions = {
    from: `"UK Sofa Shop" <${process.env.EMAIL_USER}>`,
    to: email,
    subject: `${currentConfig.title} - (#${shortCode})`,
    html: generateEmailHTML(content),
  };

  await transporter.sendMail(mailOptions);
}

export async function sendContactNotification(
  name: string, 
  email: string, 
  orderNumber: string, 
  message: string
) {
  const content = `
    <div style="text-align: left;">
      <h2 style="color: #d97706; margin-top: 0;">New Customer Inquiry</h2>
      <p style="color: #57534e; font-size: 16px;">You have received a new message from the contact form.</p>
      
      <table style="width: 100%; border-collapse: collapse; margin: 24px 0;">
        <tr>
          <td style="padding: 12px 0; border-bottom: 1px solid #e7e5e4; color: #78716c; width: 120px;"><strong>Name:</strong></td>
          <td style="padding: 12px 0; border-bottom: 1px solid #e7e5e4; font-weight: bold;">${name}</td>
        </tr>
        <tr>
          <td style="padding: 12px 0; border-bottom: 1px solid #e7e5e4; color: #78716c;"><strong>Email:</strong></td>
          <td style="padding: 12px 0; border-bottom: 1px solid #e7e5e4;">
            <a href="mailto:${email}" style="color: #d97706; text-decoration: none; font-weight: bold;">${email}</a>
          </td>
        </tr>
        <tr>
          <td style="padding: 12px 0; border-bottom: 1px solid #e7e5e4; color: #78716c;"><strong>Order Ref:</strong></td>
          <td style="padding: 12px 0; border-bottom: 1px solid #e7e5e4; font-family: monospace; font-size: 16px;">${orderNumber || 'Not provided'}</td>
        </tr>
      </table>

      <h3 style="margin-top: 32px; font-size: 16px;">Message:</h3>
      <div style="background-color: #f5f5f4; padding: 20px; border-radius: 8px; font-style: italic; color: #57534e; white-space: pre-wrap; line-height: 1.6;">
        ${message}
      </div>
    </div>
  `;

  const mailOptions = {
    from: `"UK Sofa Shop Contact" <${process.env.EMAIL_USER}>`,
    to: process.env.EMAIL_USER, 
    replyTo: email,
    subject: `Support Request: ${name} ${orderNumber ? `(#${orderNumber})` : ''}`,
    html: generateEmailHTML(content),
  };

  await transporter.sendMail(mailOptions);
}