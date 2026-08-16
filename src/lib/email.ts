import nodemailer from 'nodemailer';

export function getMailTransporter() {
  let user = 'kumbharganesh929@gmail.com';
  let pass = 'axusmowxmwvhtozq';

  if (process.env.SMTP_USER && !process.env.SMTP_USER.includes('trialuser') && !process.env.SMTP_USER.includes('815')) {
    user = process.env.SMTP_USER;
    if (process.env.SMTP_PASS) {
      pass = process.env.SMTP_PASS;
    }
  }

  return nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: parseInt(process.env.SMTP_PORT || '465', 10),
    secure: true,
    auth: {
      user: user.replace(/["'\s]/g, '').trim(),
      pass: pass.replace(/["'\s]/g, '').trim(),
    },
  });
}

interface SendEmailOptions {
  to: string | string[];
  cc?: string | string[];
  bcc?: string | string[];
  subject: string;
  text: string;
  html?: string;
  replyToMessageId?: string;
  references?: string[];
  attachments?: Array<{
    filename: string;
    content: string | Buffer;
    contentType?: string;
  }>;
}

export async function sendEmail(options: SendEmailOptions) {
  let user = 'kumbharganesh929@gmail.com';
  let pass = 'axusmowxmwvhtozq';

  if (process.env.SMTP_USER && !process.env.SMTP_USER.includes('trialuser') && !process.env.SMTP_USER.includes('815')) {
    user = process.env.SMTP_USER;
    if (process.env.SMTP_PASS) {
      pass = process.env.SMTP_PASS;
    }
  }

  const cleanUser = user.replace(/["'\s]/g, '').trim();
  const transporter = getMailTransporter();

  const headers: Record<string, string | string[]> = {};
  if (options.replyToMessageId) {
    headers['In-Reply-To'] = options.replyToMessageId;
  }
  if (options.references && options.references.length > 0) {
    headers['References'] = options.references;
  }

  const info = await transporter.sendMail({
    from: `"HelpDesk Support" <${cleanUser}>`,
    to: options.to,
    cc: options.cc,
    bcc: options.bcc,
    subject: options.subject,
    text: options.text,
    html: options.html,
    headers,
    attachments: options.attachments,
  });

  return info.messageId;
}
