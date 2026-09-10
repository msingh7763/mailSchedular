import { Worker, Job } from 'bullmq';
import { createRedisConnection } from '../lib/redis';
import { prisma } from '../lib/prisma';
import { sendEmail } from '../lib/mailer';
import { indexEmail } from '../lib/elasticsearch';
import { checkAndIncrementRateLimit, getNextHourStart } from '../services/rateLimiter';
import { notifyRateLimitHit } from '../services/slackNotifier';
import { config } from '../config';
import { EMAIL_QUEUE_NAME, EmailJobData, emailQueue } from './emailQueue';


async function processEmailJob(job: Job<EmailJobData>): Promise<void> {
  const {
    emailId,
    recipientId,
    recipientAddress,
    fromEmail,
    fromName,
    subject,
    body,
    userId,
    hourlyLimit,
  } = job.data;

  console.log(`[Worker] Processing job ${job.id} for recipient ${recipientAddress}`);

  // 1. Check idempotency - skip if already sent
  const recipient = await prisma.emailRecipient.findUnique({
    where: { id: recipientId },
  });

  if (!recipient) {
    console.log(`[Worker] Recipient ${recipientId} not found, skipping`);
    return;
  }

  if (recipient.status === 'SENT') {
    console.log(`[Worker] Recipient ${recipientId} already sent, skipping (idempotent)`);
    return;
  }

  // 2. Check rate limit (atomic via Lua script)
  const rateLimitResult = await checkAndIncrementRateLimit(userId, fromEmail, hourlyLimit);

  if (!rateLimitResult.allowed) {
    console.log(`[Worker] Rate limit hit for ${fromEmail}, rescheduling job ${job.id}`);

    // Mark recipient as rate-limited
    await prisma.emailRecipient.update({
      where: { id: recipientId },
      data: { status: 'RATE_LIMITED' },
    });

    // Notify Slack (fire and forget)
    notifyRateLimitHit(userId, fromEmail, hourlyLimit, rateLimitResult.retryAfterMs).catch(
      (err) => console.error('[Worker] Slack notification error:', err)
    );

    // Move job to next hour window — do NOT fail it
    const nextHourDelay = getNextHourStart() - Date.now();
    await job.moveToDelayed(Date.now() + nextHourDelay, job.token);

    // Reset recipient status back to PENDING for retry
    await prisma.emailRecipient.update({
      where: { id: recipientId },
      data: { status: 'PENDING' },
    });

    return;
  }

  // 3. Send email via Ethereal
  try {
    const result = await sendEmail({
      to: recipientAddress,
      subject,
      html: body,
      fromEmail,
      fromName,
    });

    await prisma.emailRecipient.update({
      where: { id: recipientId },
      data: { status: 'SENT', sentAt: new Date(), error: null },
    });

    console.log(
      `[Worker] Email sent: ${result.messageId} | Preview: ${result.previewUrl}`
    );

    // 4. Check if all recipients for this email are sent
    const allRecipients = await prisma.emailRecipient.findMany({
      where: { emailId },
    });

    const allSent = allRecipients.every((r) => r.status === 'SENT');
    const someFailed = allRecipients.some((r) => r.status === 'FAILED');

    let newEmailStatus: 'SENT' | 'PARTIAL' | 'SENDING' = 'SENDING';
    if (allSent) newEmailStatus = 'SENT';
    else if (someFailed && allRecipients.some((r) => r.status === 'SENT')) newEmailStatus = 'PARTIAL';

    const emailUpdate = await prisma.email.update({
      where: { id: emailId },
      data: {
        status: newEmailStatus,
        sentAt: allSent ? new Date() : undefined,
      },
      include: { recipients: true },
    });

    // 5. Index in Elasticsearch
    await indexEmail({
      id: emailUpdate.id,
      userId: emailUpdate.userId,
      subject: emailUpdate.subject,
      body: emailUpdate.body,
      fromEmail: emailUpdate.fromEmail,
      fromName: emailUpdate.fromName,
      status: emailUpdate.status,
      recipients: emailUpdate.recipients.map((r) => r.address),
      scheduledAt: emailUpdate.scheduledAt,
      sentAt: emailUpdate.sentAt,
      createdAt: emailUpdate.createdAt,
    });
  } catch (err) {
    console.error(`[Worker] Failed to send email to ${recipientAddress}:`, err);

    await prisma.emailRecipient.update({
      where: { id: recipientId },
      data: {
        status: 'FAILED',
        error: err instanceof Error ? err.message : 'Unknown error',
      },
    });

    throw err; // Let BullMQ retry
  }
}

export function startEmailWorker(): Worker<EmailJobData> {
  const worker = new Worker<EmailJobData>(EMAIL_QUEUE_NAME, processEmailJob, {
    connection: createRedisConnection(),
    concurrency: config.worker.concurrency,
    limiter: {
      max: 1,
      duration: config.worker.minDelayBetweenEmailsMs,
    },
  });

  worker.on('completed', (job) => {
    console.log(`[Worker] Job ${job.id} completed`);
  });

  worker.on('failed', (job, err) => {
    console.error(`[Worker] Job ${job?.id} failed:`, err.message);
  });

  worker.on('stalled', (jobId) => {
    console.warn(`[Worker] Job ${jobId} stalled`);
  });

  worker.on('error', (err) => {
    console.error('[Worker] Worker error:', err);
  });

  console.log(
    `[Worker] Email worker started (concurrency: ${config.worker.concurrency}, min delay: ${config.worker.minDelayBetweenEmailsMs}ms)`
  );

  return worker;
}
