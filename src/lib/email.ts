import nodemailer from 'nodemailer';

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp.gmail.com',
  port: parseInt(process.env.SMTP_PORT || '465', 10),
  secure: process.env.SMTP_SECURE === 'true' || true, // true for 465, false for other ports
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

interface SendEmailOptions {
  to: string;
  subject: string;
  text: string;
  html?: string;
  replyToMessageId?: string;
  references?: string[];
}

export async function sendEmail(options: SendEmailOptions) {
  if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
    console.warn('SMTP credentials missing, skipping email send to:', options.to);
    return null;
  }

  const headers: Record<string, string | string[]> = {};
  if (options.replyToMessageId) {
    headers['In-Reply-To'] = options.replyToMessageId;
  }
  if (options.references && options.references.length > 0) {
    headers['References'] = options.references;
  }

  const info = await transporter.sendMail({
    from: `"HelpDesk" <${process.env.SMTP_USER}>`,
    to: options.to,
    subject: options.subject,
    text: options.text,
    html: options.html,
    headers,
  });

  return info.messageId;
}
