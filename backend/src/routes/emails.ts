import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma';
import { emailQueue } from '../queues/emailQueue';
import { esClient, EMAIL_INDEX } from '../lib/elasticsearch';
import { requireAuth } from '../middleware/auth';
import crypto from 'crypto';

const router = Router();

const ScheduleEmailSchema = z.object({
  subject: z.string().min(1, 'Subject is required').max(500),
  body: z.string().min(1, 'Body is required'),
  recipients: z.array(z.string().email()).min(1, 'At least one recipient is required'),
  startTime: z.string().datetime(),
  delayBetweenEmails: z.number().int().min(1).max(3600).default(2),
  hourlyLimit: z.number().int().min(1).max(10000).default(200),
  fromEmail: z.string().email().optional(),
  fromName: z.string().optional(),
});

// POST /api/emails/schedule
router.post('/schedule', requireAuth, async (req: Request, res: Response) => {
  const parseResult = ScheduleEmailSchema.safeParse(req.body);
  if (!parseResult.success) {
    res.status(400).json({ error: 'Validation failed', details: parseResult.error.errors });
    return;
  }

  const data = parseResult.data;
  const userId = req.user!.userId;
  const userEmail = req.user!.email;
  const userName = req.user!.name;

  const fromEmail = data.fromEmail || userEmail;
  const fromName = data.fromName || userName;
  const scheduledAt = new Date(data.startTime);

  // Generate idempotency key based on content + user + time
  const idempotencyKey = crypto
    .createHash('sha256')
    .update(`${userId}:${data.subject}:${data.startTime}:${data.recipients.join(',')}`)
    .digest('hex');

  // Check if already scheduled (idempotency)
  const existing = await prisma.email.findUnique({ where: { idempotencyKey } });
  if (existing) {
    res.status(200).json({
      message: 'Email already scheduled (idempotent)',
      emailId: existing.id,
      jobCount: 0,
    });
    return;
  }

  try {
    // Create email + recipients in DB
    const email = await prisma.email.create({
      data: {
        userId,
        subject: data.subject,
        body: data.body,
        fromEmail,
        fromName,
        status: 'SCHEDULED',
        scheduledAt,
        hourlyLimit: data.hourlyLimit,
        delayBetweenEmails: data.delayBetweenEmails,
        idempotencyKey,
        recipients: {
          create: data.recipients.map((address) => ({ address })),
        },
      },
      include: { recipients: true },
    });

    // Enqueue one BullMQ delayed job per recipient
    const now = Date.now();
    const startDelay = Math.max(0, scheduledAt.getTime() - now);

    const jobs = await Promise.all(
      email.recipients.map((recipient, index) => {
        // Each recipient gets an additional stagger based on delayBetweenEmails
        const recipientDelay = startDelay + index * data.delayBetweenEmails * 1000;
        const jobId = `email_${email.id}_${recipient.id}`; // Idempotent job ID

        return emailQueue.add(
          'send-email',
          {
            emailId: email.id,
            recipientId: recipient.id,
            recipientAddress: recipient.address,
            fromEmail,
            fromName,
            subject: data.subject,
            body: data.body,
            userId,
            hourlyLimit: data.hourlyLimit,
            delayBetweenEmails: data.delayBetweenEmails,
          },
          {
            jobId,
            delay: recipientDelay,
          }
        );
      })
    );

    // Update recipient job IDs
    await Promise.all(
      email.recipients.map((recipient, index) =>
        prisma.emailRecipient.update({
          where: { id: recipient.id },
          data: { jobId: `email_${email.id}_${recipient.id}` },
        })
      )
    );

    // Index in Elasticsearch immediately
    const { indexEmail } = await import('../lib/elasticsearch');
    await indexEmail({
      id: email.id,
      userId,
      subject: email.subject,
      body: email.body,
      fromEmail: email.fromEmail,
      fromName: email.fromName,
      status: email.status,
      recipients: email.recipients.map((r) => r.address),
      scheduledAt: email.scheduledAt,
      sentAt: email.sentAt,
      createdAt: email.createdAt,
    });

    res.status(201).json({
      message: 'Email campaign scheduled successfully',
      emailId: email.id,
      jobCount: jobs.length,
      scheduledAt: email.scheduledAt,
    });
  } catch (err) {
    console.error('[Emails] Schedule error:', err);
    res.status(500).json({ error: 'Failed to schedule email' });
  }
});

// GET /api/emails - List emails with status filter
router.get('/', requireAuth, async (req: Request, res: Response) => {
  const userId = req.user!.userId;
  const status = req.query.status as string;
  const page = parseInt(req.query.page as string || '1', 10);
  const limit = parseInt(req.query.limit as string || '20', 10);
  const skip = (page - 1) * limit;

  const where: any = { userId };
  if (status === 'scheduled') {
    where.status = { in: ['SCHEDULED', 'SENDING'] };
  } else if (status === 'sent') {
    where.status = { in: ['SENT', 'PARTIAL', 'FAILED'] };
  }

  try {
    const [emails, total] = await Promise.all([
      prisma.email.findMany({
        where,
        include: {
          recipients: {
            select: { id: true, address: true, status: true, sentAt: true },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.email.count({ where }),
    ]);

    const formattedEmails = emails.map((email) => ({
      id: email.id,
      subject: email.subject,
      body: email.body,
      fromEmail: email.fromEmail,
      fromName: email.fromName,
      status: email.status.toLowerCase(),
      recipients: email.recipients.map((r) => r.address),
      recipientDetails: email.recipients,
      scheduledAt: email.scheduledAt,
      sentAt: email.sentAt,
      hourlyLimit: email.hourlyLimit,
      delayBetweenEmails: email.delayBetweenEmails,
      createdAt: email.createdAt,
    }));

    res.json({
      emails: formattedEmails,
      pagination: { page, limit, total, pages: Math.ceil(total / limit) },
    });
  } catch (err) {
    console.error('[Emails] List error:', err);
    res.status(500).json({ error: 'Failed to fetch emails' });
  }
});

// GET /api/emails/search - Elasticsearch full-text search
router.get('/search', requireAuth, async (req: Request, res: Response) => {
  const userId = req.user!.userId;
  const q = req.query.q as string;

  if (!q || q.trim().length === 0) {
    res.status(400).json({ error: 'Search query is required' });
    return;
  }

  try {
    const result = await esClient.search({
      index: EMAIL_INDEX,
      query: {
        bool: {
          must: [
            { term: { userId } },
            {
              multi_match: {
                query: q,
                fields: ['subject^2', 'body', 'fromEmail', 'recipients'],
                fuzziness: 'AUTO',
              },
            },
          ],
        },
      },
      highlight: {
        fields: {
          subject: {},
          body: { fragment_size: 150, number_of_fragments: 1 },
        },
      },
      size: 20,
    });

    const hits = result.hits.hits.map((hit: any) => ({
      ...hit._source,
      highlight: hit.highlight,
      score: hit._score,
    }));

    res.json({ results: hits, total: result.hits.total });
  } catch (err) {
    console.error('[Emails] Search error:', err);
    // Fallback to DB search if Elasticsearch is down
    try {
      const emails = await prisma.email.findMany({
        where: {
          userId,
          OR: [
            { subject: { contains: q, mode: 'insensitive' } },
            { body: { contains: q, mode: 'insensitive' } },
          ],
        },
        include: { recipients: { select: { address: true } } },
        take: 20,
      });
      res.json({ results: emails, total: emails.length, source: 'db-fallback' });
    } catch (dbErr) {
      res.status(500).json({ error: 'Search failed' });
    }
  }
});

// GET /api/emails/:id - Single email detail
router.get('/:id', requireAuth, async (req: Request, res: Response) => {
  const userId = req.user!.userId;
  const { id } = req.params;

  try {
    const email = await prisma.email.findFirst({
      where: { id, userId },
      include: { recipients: true },
    });

    if (!email) {
      res.status(404).json({ error: 'Email not found' });
      return;
    }

    res.json(email);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch email' });
  }
});

export default router;
