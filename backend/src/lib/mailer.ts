import nodemailer from 'nodemailer';
import type Mail from 'nodemailer/lib/mailer';
import { config } from '../config';

let testTransport: nodemailer.Transporter | null = null;
let testAccount: { user: string; pass: string; previewUrl?: string } | null = null;

export async function getEtherealTransport(): Promise<nodemailer.Transporter> {
  if (!testTransport) {
    // Create a test Ethereal account
    testAccount = await nodemailer.createTestAccount();
    console.log('[Mailer] Ethereal test account created:');
    console.log(`  Email: ${testAccount.user}`);
    console.log(`  Password: ${testAccount.pass}`);
    console.log(`  Preview URL: https://ethereal.email/messages`);

    testTransport = nodemailer.createTransport({
      host: 'smtp.ethereal.email',
      port: 587,
      secure: false,
      auth: {
        user: testAccount.user,
        pass: testAccount.pass,
      },
    });
  }
  return testTransport;
}

export function getTransport(): Promise<nodemailer.Transporter> {
  if (config.smtp.host && config.smtp.user && config.smtp.password) {
    return Promise.resolve(
      nodemailer.createTransport({
        host: config.smtp.host,
        port: config.smtp.port,
        secure: config.smtp.secure,
        auth: {
          user: config.smtp.user,
          pass: config.smtp.password,
        },
      })
    );
  }

  return getEtherealTransport();
}

export interface SendEmailOptions {
  to: string;
  subject: string;
  html: string;
  fromEmail: string;
  fromName: string;
}

export async function sendEmail(options: SendEmailOptions): Promise<{ messageId: string; previewUrl: string | false }> {
  const transport = await getTransport();

  const mailOptions: Mail.Options = {
    from: `"${options.fromName}" <${options.fromEmail}>`,
    to: options.to,
    subject: options.subject,
    html: options.html,
  };

  const info = await transport.sendMail(mailOptions);
  const previewUrl = nodemailer.getTestMessageUrl(info);

  console.log(`[Mailer] Email sent to ${options.to}`);
  console.log(`[Mailer] Preview URL: ${previewUrl}`);

  return {
    messageId: info.messageId,
    previewUrl,
  };
}
