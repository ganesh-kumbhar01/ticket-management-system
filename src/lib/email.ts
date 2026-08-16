import nodemailer from 'nodemailer';

export function getMailTransporter() {
  let user = (process.env.SMTP_USER || 'kumbharganesh929@gmail.com').trim();
  let pass = (process.env.SMTP_PASS || 'axusmowxmwvhtozq').replace(/["'\s]/g, '');

  if (user.includes('trialuser') || user.includes('815')) {
    user = 'kumbharganesh929@gmail.com';
  }

  return nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: parseInt(process.env.SMTP_PORT || '465', 10),
    secure: true,
    auth: {
      user,
      pass,
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
  let user = (process.env.SMTP_USER || 'kumbharganesh929@gmail.com').trim();
  let pass = (process.env.SMTP_PASS || 'axusmowxmwvhtozq').replace(/["'\s]/g, '');

  if (user.includes('trialuser') || user.includes('815')) {
    user = 'kumbharganesh929@gmail.com';
  }

  const transporter = getMailTransporter();

  const headers: Record<string, string | string[]> = {};
  if (options.replyToMessageId) {
    headers['In-Reply-To'] = options.replyToMessageId;
  }
  if (options.references && options.references.length > 0) {
    headers['References'] = options.references;
  }

  const info = await transporter.sendMail({
    from: `"HelpDesk Support" <${user}>`,
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
